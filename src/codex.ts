import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RunProcess } from './process';
import { sanitizeCommitMessage } from './prompt';

export interface CodexGenerationOptions {
  codexCommand: string;
  repoRoot: string;
  prompt: string;
}

function missingCommandMessage(command: string): string {
  return `Codex CLI was not found: "${command}". Install Codex CLI or set codexCommit.codexCommand to the executable on PATH.`;
}

export async function checkCodexAvailable(run: RunProcess, codexCommand: string): Promise<void> {
  try {
    const result = await run(codexCommand, ['--version'], { timeoutMs: 10000 });
    if (result.code !== 0) {
      throw new Error((result.stderr || result.stdout).trim());
    }
  } catch (error) {
    if (error instanceof Error && /ENOENT/i.test(error.message)) {
      throw new Error(missingCommandMessage(codexCommand));
    }
    throw new Error(missingCommandMessage(codexCommand));
  }
}

export async function checkCodexAuthenticated(run: RunProcess, codexCommand: string): Promise<void> {
  const result = await run(codexCommand, ['login', 'status'], { timeoutMs: 15000 });
  if (result.code !== 0) {
    const detail = (result.stderr || result.stdout).trim();
    throw new Error(detail || 'Codex is not authenticated. Run "Generate Commit by Codex: Sign In to Codex".');
  }
}

export async function generateCommitMessage(
  run: RunProcess,
  options: CodexGenerationOptions
): Promise<string> {
  const outputFile = join(
    tmpdir(),
    `codex-commit-message-${Date.now()}-${Math.random().toString(16).slice(2)}.txt`
  );

  const args = [
    'exec',
    '--cd',
    options.repoRoot,
    '--skip-git-repo-check',
    '--ephemeral',
    '--sandbox',
    'read-only',
    '--ask-for-approval',
    'never',
    '--color',
    'never',
    '--output-last-message',
    outputFile,
    '-'
  ];

  try {
    const result = await run(options.codexCommand, args, {
      cwd: options.repoRoot,
      input: options.prompt,
      timeoutMs: 120000
    });

    if (result.code !== 0) {
      const detail = (result.stderr || result.stdout).trim();
      throw new Error(detail || 'Codex generation failed.');
    }

    const output = sanitizeCommitMessage(await fs.readFile(outputFile, 'utf8'));
    if (!output) {
      throw new Error('Codex returned an empty commit message.');
    }
    return output;
  } finally {
    await fs.rm(outputFile, { force: true }).catch(() => undefined);
  }
}
