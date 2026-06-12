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
    expect(prompt).toContain('Conventional Commit');
    expect(prompt).toContain('at or below 72 characters');
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
