const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const vscode = require('vscode');

const extensionId = 'Awadree.generate-commit-by-awadree';
const commandIds = [
  'codexCommit.generateCommitMessage',
  'codexCommit.installCodexCli',
  'codexCommit.selectModel',
  'codexCommit.selectReasoningEffort',
  'codexCommit.signIn',
  'codexCommit.signOut',
  'codexCommit.reauthenticate'
];

async function run() {
  log('start');
  const packageJson = require(path.resolve(__dirname, '..', '..', 'package.json'));
  const extension = vscode.extensions.getExtension(extensionId);
  assert.ok(extension, `Expected extension ${extensionId} to be available in Extension Host`);

  log('activate extension');
  await extension.activate();
  assert.equal(extension.isActive, true, 'Extension should activate successfully');
  assert.equal(packageJson.displayName, 'Generate Commit by Awadree (Unofficial)');
  assert.equal(
    packageJson.contributes.commands.find(command => command.command === 'codexCommit.generateCommitMessage').title,
    'Generate Commit Message by Awadree'
  );

  const registeredCommands = await vscode.commands.getCommands(true);
  for (const commandId of commandIds) {
    assert.ok(registeredCommands.includes(commandId), `Expected command to be registered: ${commandId}`);
  }

  const scmTitleMenu = packageJson.contributes.menus['scm/title'];
  assert.ok(
    scmTitleMenu.some(item => item.command === 'codexCommit.generateCommitMessage'),
    'Expected generate command to be contributed to the Source Control title menu'
  );
  assert.equal(packageJson.contributes.menus['scm/repository'], undefined);
  assert.equal(packageJson.contributes.menus['scm/sourceControl'], undefined);
  assert.equal(packageJson.contributes.menus['codexCommit/scm/title'], undefined);
  assert.equal(packageJson.contributes.submenus, undefined);
  assert.equal(packageJson.contributes.menus['gitlens/scm/title'], undefined);
  assert.equal(packageJson.contributes.menus['gitlens/scm/title/ai'], undefined);

  const mockCodexPath = process.env.CODEX_COMMIT_TEST_MOCK_CODEX;
  assert.ok(mockCodexPath, 'Expected mock Codex path to be provided');
  log('set mock codex config');
  await vscode.workspace
    .getConfiguration('codexCommit')
    .update('codexCommand', mockCodexPath, vscode.ConfigurationTarget.Workspace);
  await vscode.workspace
    .getConfiguration('codexCommit')
    .update('model', 'gpt-5', vscode.ConfigurationTarget.Workspace);
  await vscode.workspace
    .getConfiguration('codexCommit')
    .update('reasoningEffort', 'low', vscode.ConfigurationTarget.Workspace);

  const gitExtension = vscode.extensions.getExtension('vscode.git');
  assert.ok(gitExtension, 'Expected built-in Git extension to be available');
  log('activate git extension');
  const gitApi = (gitExtension.isActive ? gitExtension.exports : await gitExtension.activate()).getAPI(1);
  log('wait for repo');
  const repository = await waitForRepository(gitApi, process.env.CODEX_COMMIT_TEST_WORKSPACE);
  log('repo ready');
  repository.inputBox.value = 'draft context';

  log('execute generate command');
  await vscode.commands.executeCommand('codexCommit.generateCommitMessage');
  log('generate command complete');

  assert.equal(repository.inputBox.value, 'feat: update staged smoke fixture\n\nUse staged changes to verify SCM input wiring.');
  const args = JSON.parse(fs.readFileSync(process.env.CODEX_COMMIT_TEST_ARGS_CAPTURE, 'utf8'));
  const modelIndex = args.indexOf('--model');
  assert.notEqual(modelIndex, -1, 'Expected Codex command to include an explicit model');
  assert.equal(args[modelIndex + 1], 'gpt-5.4-mini');
  assert.ok(args.includes('model_reasoning_effort="low"'));
  assert.ok(args.includes('web_search="disabled"'));
  assert.equal(args.includes('gpt-5'), false);
  const prompt = fs.readFileSync(process.env.CODEX_COMMIT_TEST_PROMPT_CAPTURE, 'utf8');
  assert.match(prompt, /staged changes from git diff --cached --no-ext-diff/u);
  assert.match(prompt, /draft context/u);

  log('reset to unstaged change');
  execFileSync('git', ['reset', '--mixed', 'HEAD'], { cwd: process.env.CODEX_COMMIT_TEST_WORKSPACE });
  repository.inputBox.value = 'unstaged draft context';

  log('execute generate command for unstaged fallback');
  await vscode.commands.executeCommand('codexCommit.generateCommitMessage');
  log('unstaged generate command complete');

  assert.equal(repository.inputBox.value, 'fix: update unstaged smoke fixture\n\nUse unstaged changes to verify fallback wiring.');
  const unstagedPrompt = fs.readFileSync(process.env.CODEX_COMMIT_TEST_PROMPT_CAPTURE, 'utf8');
  assert.match(unstagedPrompt, /unstaged changes from git diff --no-ext-diff/u);
  assert.match(unstagedPrompt, /unstaged draft context/u);
}

module.exports = { run };

function log(message) {
  const logPath = process.env.CODEX_COMMIT_TEST_LOG;
  if (logPath) {
    fs.appendFileSync(logPath, `${new Date().toISOString()} ${message}\n`);
  }
}

async function waitForRepository(gitApi, workspacePath) {
  const normalizedWorkspace = normalizePath(workspacePath);
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const repository = gitApi.repositories.find(repo => normalizePath(repo.rootUri.fsPath) === normalizedWorkspace);
    if (repository) {
      return repository;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for Git repository: ${workspacePath}`);
}

function normalizePath(value) {
  return value.replace(/\\/g, '/').replace(/\/+$/u, '').toLowerCase();
}
