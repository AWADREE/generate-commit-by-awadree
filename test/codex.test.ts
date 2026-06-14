import { describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import { checkCodexAuthenticated, checkCodexAvailable, generateCommitMessage } from '../src/codex';
import type { ProcessResult, RunProcess } from '../src/process';

function result(stdout: string, code = 0, stderr = ''): ProcessResult {
  return { code, stdout, stderr };
}

describe('Codex CLI checks', () => {
  it('accepts an available Codex CLI', async () => {
    const run: RunProcess = async () => result('codex 1.0.0\n');

    await expect(checkCodexAvailable(run, 'codex')).resolves.toBeUndefined();
  });

  it('reports a useful missing CLI error', async () => {
    const run: RunProcess = async () => {
      throw new Error('spawn codex ENOENT');
    };

    await expect(checkCodexAvailable(run, 'codex')).rejects.toThrow('Codex CLI was not found');
  });

  it('accepts authenticated Codex login status', async () => {
    const run: RunProcess = async (_command, args) => {
      expect(args).toEqual(['login', 'status']);
      return result('Logged in\n');
    };

    await expect(checkCodexAuthenticated(run, 'codex')).resolves.toBeUndefined();
  });

  it('reports unauthenticated status with sign-in guidance', async () => {
    const run: RunProcess = async () => result('', 1, 'Not logged in');

    await expect(checkCodexAuthenticated(run, 'codex')).rejects.toThrow('Not logged in');
  });

  it('runs codex exec with safe arguments and reads the final response file', async () => {
    const run: RunProcess = async (_command, args, options) => {
      expect(args.slice(0, 3)).toEqual(['--ask-for-approval', 'never', 'exec']);
      expect(args).toContain('--ephemeral');
      expect(args).toContain('--sandbox');
      expect(args).toContain('read-only');
      expect(options?.cwd).toBe('/repo');
      expect(options?.input).toBe('prompt');

      const outputIndex = args.indexOf('--output-last-message');
      const outputFile = args[outputIndex + 1];
      await fs.writeFile(outputFile, '```text\nfeat: add generated message\n```');
      return result('');
    };

    await expect(
      generateCommitMessage(run, {
        codexCommand: 'codex',
        repoRoot: '/repo',
        prompt: 'prompt'
      })
    ).resolves.toBe('feat: add generated message');
  });

  it('passes model and config overrides only to the codex exec invocation', async () => {
    const run: RunProcess = async (_command, args) => {
      expect(args.slice(0, 3)).toEqual(['--ask-for-approval', 'never', 'exec']);
      expect(args).toContain('--model');
      expect(args[args.indexOf('--model') + 1]).toBe('gpt-5.5');
      expect(args).toContain('--config');
      expect(args).toContain('model_reasoning_effort="high"');
      expect(args).toContain('web_search="disabled"');

      const outputIndex = args.indexOf('--output-last-message');
      await fs.writeFile(args[outputIndex + 1], 'fix: use configured codex options');
      return result('');
    };

    await expect(
      generateCommitMessage(run, {
        codexCommand: 'codex',
        repoRoot: '/repo',
        prompt: 'prompt',
        model: 'gpt-5.5',
        reasoningEffort: 'high'
      })
    ).resolves.toBe('fix: use configured codex options');
  });

  it('rejects empty Codex output', async () => {
    const run: RunProcess = async (_command, args) => {
      const outputIndex = args.indexOf('--output-last-message');
      await fs.writeFile(args[outputIndex + 1], '   ');
      return result('');
    };

    await expect(
      generateCommitMessage(run, {
        codexCommand: 'codex',
        repoRoot: '/repo',
        prompt: 'prompt'
      })
    ).rejects.toThrow('empty commit message');
  });
});
