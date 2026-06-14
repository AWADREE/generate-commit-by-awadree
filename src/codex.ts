import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RunProcess } from './process';
import { sanitizeCommitMessage } from './prompt';

export interface CodexGenerationOptions {
  codexCommand: string;
  repoRoot: string;
  prompt: string;
  model?: string;
  reasoningEffort?: string;
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
    throw new Error(detail || 'Codex is not authenticated. Run "Generate Commit by Awadree: Sign In".');
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
    '--ask-for-approval',
    'never',
    'exec',
    ...buildCodexExecOptionArgs(options),
    '--config',
    'web_search="disabled"',
    '--cd',
    options.repoRoot,
    '--skip-git-repo-check',
    '--ephemeral',
    '--sandbox',
    'read-only',
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
      const detail = summarizeCodexFailure(result.stderr || result.stdout);
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

function summarizeCodexFailure(output: string): string {
  const detail = output.trim();
  if (!detail) {
    return '';
  }

  const lines = detail.split(/\r?\n/u).map(line => line.trim()).filter(Boolean);
  const errorLine = lines.find(line => /\bERROR\b|^error:/iu.test(line));
  if (errorLine) {
    return errorLine.length > 500 ? `${errorLine.slice(0, 497)}...` : errorLine;
  }

  const beforeTranscript = detail.split(/\n-{4,}\n/u)[0]?.trim() || detail;
  return beforeTranscript.length > 500 ? `${beforeTranscript.slice(0, 497)}...` : beforeTranscript;
}

function quoteTomlString(value: string): string {
  return JSON.stringify(value);
}

function buildCodexExecOptionArgs(options: CodexGenerationOptions): string[] {
  const args: string[] = [];
  const model = options.model?.trim();
  const reasoningEffort = options.reasoningEffort?.trim();

  if (model) {
    args.push('--model', model);
  }

  if (reasoningEffort) {
    args.push('--config', `model_reasoning_effort=${quoteTomlString(reasoningEffort)}`);
  }

  return args;
}
