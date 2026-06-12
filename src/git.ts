import type { RunProcess } from './process';

export type DiffKind = 'staged' | 'unstaged';

export interface GitDiff {
  kind: DiffKind;
  diff: string;
}

export interface GitWorkspace {
  repoRoot: string;
  sourceDirectory: string;
}

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

async function runGit(run: RunProcess, cwd: string, args: readonly string[]): Promise<string> {
  const result = await run('git', args, { cwd, timeoutMs: 30000 });
  if (result.code !== 0) {
    const detail = (result.stderr || result.stdout).trim();
    throw new Error(detail || `git ${args.join(' ')} failed`);
  }
  return result.stdout;
}

export async function resolveGitWorkspace(
  run: RunProcess,
  candidateDirectories: readonly string[]
): Promise<GitWorkspace | undefined> {
  const seen = new Set<string>();
  for (const directory of candidateDirectories) {
    if (!directory || seen.has(directory)) {
      continue;
    }
    seen.add(directory);
    try {
      const root = (await runGit(run, directory, ['rev-parse', '--show-toplevel'])).trim();
      if (root) {
        return { repoRoot: root, sourceDirectory: directory };
      }
    } catch {
      // Try the next workspace candidate.
    }
  }
  return undefined;
}

export async function getPreferredDiff(run: RunProcess, repoRoot: string): Promise<GitDiff | undefined> {
  const staged = await runGit(run, repoRoot, ['diff', '--cached', '--no-ext-diff']);
  if (nonEmpty(staged)) {
    return { kind: 'staged', diff: staged };
  }

  const unstaged = await runGit(run, repoRoot, ['diff', '--no-ext-diff']);
  if (nonEmpty(unstaged)) {
    return { kind: 'unstaged', diff: unstaged };
  }

  return undefined;
}
