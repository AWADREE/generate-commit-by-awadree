import { describe, expect, it } from 'vitest';
import { buildCommitPrompt, sanitizeCommitMessage } from '../src/prompt';

describe('commit prompt', () => {
  it('contains required generation rules and contextual inputs', () => {
    const prompt = buildCommitPrompt({
      diff: '+changed',
      diffKind: 'staged',
      existingInput: 'feat: draft',
      customInstructions: 'Use imperative mood.',
      wasTruncated: true,
      originalLength: 10000,
      sentLength: 5000
    });

    expect(prompt).toContain('Return only the commit message');
    expect(prompt).toContain('<type>[optional scope]: <description>');
    expect(prompt).toContain('feat, fix, docs, refactor, test, chore, build, ci, perf, style, revert');
    expect(prompt).toContain('imperative present tense');
    expect(prompt).toContain('Target 50 characters or less');
    expect(prompt).toContain('never exceed 72 characters');
    expect(prompt).toContain('Use a one-line commit message only for tiny, single-purpose diffs');
    expect(prompt).toContain('For multi-file, multi-area, behavior-changing, refactor-heavy, truncated, or otherwise non-trivial diffs, include a body');
    expect(prompt).toContain('Separate the subject from the body with one blank line');
    expect(prompt).toContain('Wrap body lines at 72 characters');
    expect(prompt).toContain('write 2-6 concise bullet points');
    expect(prompt).toContain('group the important changes by intent, area, or user impact');
    expect(prompt).toContain('Do not list every changed file');
    expect(prompt).toContain('clear, descriptive, meaningful message');
    expect(prompt).toContain('BREAKING CHANGE:');
    expect(prompt).toContain('staged changes from git diff --cached --no-ext-diff');
    expect(prompt).toContain('The diff was truncated before sending');
    expect(prompt).toContain('feat: draft');
    expect(prompt).toContain('Use imperative mood.');
    expect(prompt).toContain('+changed');
  });

  it('strips accidental markdown fences from Codex output', () => {
    expect(sanitizeCommitMessage('```text\nfeat: add thing\n```')).toBe('feat: add thing');
  });
});
