const { mkdirSync, mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { runTests } = require('@vscode/test-electron');

async function main() {
  const extensionDevelopmentPath = path.resolve(__dirname, '..');
  const extensionTestsPath = path.resolve(__dirname, 'smoke', 'extensionHost.js');
  const workspacePath = mkdtempSync(path.join(tmpdir(), 'generate-commit-by-codex-smoke-'));
  const mockCodexPath = path.join(workspacePath, 'mock-codex.cmd');
  const mockCodexJsPath = path.join(workspacePath, 'mock-codex.js');
  const promptCapturePath = path.join(workspacePath, 'captured-prompt.txt');
  const argsCapturePath = path.join(workspacePath, 'captured-args.json');
  const smokeLogPath = path.join(workspacePath, 'smoke-log.txt');

  execFileSync('git', ['init'], { cwd: workspacePath });
  execFileSync('git', ['config', 'user.email', 'smoke@example.test'], { cwd: workspacePath });
  execFileSync('git', ['config', 'user.name', 'Smoke Test'], { cwd: workspacePath });
  writeFileSync(path.join(workspacePath, 'file.txt'), 'base\n');
  execFileSync('git', ['add', 'file.txt'], { cwd: workspacePath });
  execFileSync('git', ['commit', '-m', 'init'], { cwd: workspacePath });
  writeFileSync(path.join(workspacePath, 'file.txt'), 'base\nchanged\n');
  execFileSync('git', ['add', 'file.txt'], { cwd: workspacePath });

  mkdirSync(path.join(workspacePath, '.vscode'), { recursive: true });
  writeFileSync(
    mockCodexJsPath,
    [
      "const fs = require('node:fs');",
      "const args = process.argv.slice(2);",
      "if (args[0] === '--version') { console.log('codex 0.0.0-smoke'); process.exit(0); }",
      "if (args[0] === 'login' && args[1] === 'status') { console.log('Logged in using ChatGPT'); process.exit(0); }",
      "const execIndex = args.indexOf('exec');",
      "if (execIndex !== -1) {",
      "  const outputIndex = args.indexOf('--output-last-message');",
      "  const outputFile = args[outputIndex + 1];",
      "  const stdin = fs.readFileSync(0, 'utf8');",
      `  fs.writeFileSync(${JSON.stringify(promptCapturePath)}, stdin);`,
      `  fs.writeFileSync(${JSON.stringify(argsCapturePath)}, JSON.stringify(args));`,
      "  const message = stdin.includes('unstaged changes from git diff --no-ext-diff')",
      "    ? 'fix: update unstaged smoke fixture\\n\\nUse unstaged changes to verify fallback wiring.'",
      "    : 'feat: update staged smoke fixture\\n\\nUse staged changes to verify SCM input wiring.';",
      "  fs.writeFileSync(outputFile, message);",
      "  process.exit(0);",
      "  return;",
      "}",
      "console.error(`Unexpected mock codex args: ${args.join(' ')}`);",
      "process.exit(1);"
    ].join('\n')
  );
  writeFileSync(mockCodexPath, `@"${process.execPath}" "${mockCodexJsPath}" %*\r\n`);

  try {
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [workspacePath, '--disable-workspace-trust'],
      extensionTestsEnv: {
        CODEX_COMMIT_TEST_WORKSPACE: workspacePath,
        CODEX_COMMIT_TEST_MOCK_CODEX: mockCodexPath,
        CODEX_COMMIT_TEST_PROMPT_CAPTURE: promptCapturePath,
        CODEX_COMMIT_TEST_ARGS_CAPTURE: argsCapturePath,
        CODEX_COMMIT_TEST_LOG: smokeLogPath
      }
    });
  } finally {
    rmSync(workspacePath, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
