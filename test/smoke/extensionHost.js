const assert = require('node:assert');
const path = require('node:path');
const vscode = require('vscode');

const extensionId = 'zoldy.generate-commit-by-codex';
const commandIds = [
  'codexCommit.generateCommitMessage',
  'codexCommit.signIn',
  'codexCommit.signOut',
  'codexCommit.reauthenticate'
];

async function run() {
  const packageJson = require(path.resolve(__dirname, '..', '..', 'package.json'));
  const extension = vscode.extensions.getExtension(extensionId);
  assert.ok(extension, `Expected extension ${extensionId} to be available in Extension Host`);

  await extension.activate();
  assert.equal(extension.isActive, true, 'Extension should activate successfully');
  assert.equal(packageJson.displayName, 'Generate Commit by Codex');

  const registeredCommands = await vscode.commands.getCommands(true);
  for (const commandId of commandIds) {
    assert.ok(registeredCommands.includes(commandId), `Expected command to be registered: ${commandId}`);
  }

  const scmTitleMenu = packageJson.contributes.menus['scm/title'];
  assert.ok(
    scmTitleMenu.some(item => item.command === 'codexCommit.generateCommitMessage'),
    'Expected generate command to be contributed to the Source Control title menu'
  );
  assert.ok(
    packageJson.contributes.menus['gitlens/scm/title'].some(item => item.command === 'codexCommit.generateCommitMessage'),
    'Expected generate command to be contributed to the GitLens Source Control title menu'
  );
  assert.ok(
    packageJson.contributes.menus['gitlens/scm/title/ai'].some(item => item.command === 'codexCommit.generateCommitMessage'),
    'Expected generate command to be contributed to the GitLens AI Source Control title menu'
  );

  await vscode.commands.executeCommand('codexCommit.generateCommitMessage');
}

module.exports = { run };
