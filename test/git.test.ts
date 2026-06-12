import { describe, expect, it } from 'vitest';
import { getPreferredDiff, resolveGitWorkspace } from '../src/git';
import type { ProcessResult, RunProcess } from '../src/process';

function result(stdout: string, code = 0, stderr = ''): ProcessResult {
  return { code, stdout, stderr };
}

describe('git helpers', () => {
  it('resolves the first candidate inside a Git repository', async () => {
    const calls: string[] = [];
    const run: RunProcess = async (_command, _args, options) => {
      calls.push(options?.cwd ?? '');
      if (options?.cwd === '/not-repo') {
        return result('', 128, 'not a git repository');
      }
      return result('/repo\n');
    };

    await expect(resolveGitWorkspace(run, ['/not-repo', '/repo/subdir'])).resolves.toEqual({
      repoRoot: '/repo',
      sourceDirectory: '/repo/subdir'
    });
    expect(calls).toEqual(['/not-repo', '/repo/subdir']);
  });

  it('prefers staged changes over unstaged changes', async () => {
    const run: RunProcess = async (_command, args) => {
      if (args.includes('--cached')) {
        return result('staged diff');
      }
      return result('unstaged diff');
    };

    await expect(getPreferredDiff(run, '/repo')).resolves.toEqual({
      kind: 'staged',
      diff: 'staged diff'
    });
  });

  it('falls back to unstaged changes when nothing is staged', async () => {
    const run: RunProcess = async (_command, args) => {
      if (args.includes('--cached')) {
        return result('');
      }
      return result('unstaged diff');
    };

    await expect(getPreferredDiff(run, '/repo')).resolves.toEqual({
      kind: 'unstaged',
      diff: 'unstaged diff'
    });
  });

  it('returns undefined when no Git changes exist', async () => {
    const run: RunProcess = async () => result('');

    await expect(getPreferredDiff(run, '/repo')).resolves.toBeUndefined();
  });
});
