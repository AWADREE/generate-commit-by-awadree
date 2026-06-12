import { describe, expect, it } from 'vitest';
import { prepareDiffForPrompt } from '../src/diff';

describe('prepareDiffForPrompt', () => {
  it('leaves small diffs unchanged', () => {
    const diff = 'diff --git a/a.txt b/a.txt\n+hello\n';
    const result = prepareDiffForPrompt(diff, 4000);

    expect(result.text).toBe(diff);
    expect(result.wasTruncated).toBe(false);
    expect(result.omittedLength).toBe(0);
  });

  it('truncates large diffs with an explicit marker and keeps both ends', () => {
    const diff = [
      'diff --git a/a.txt b/a.txt',
      ...Array.from({ length: 500 }, (_, index) => `+line ${index}`)
    ].join('\n');
    const result = prepareDiffForPrompt(diff, 1200);

    expect(result.wasTruncated).toBe(true);
    expect(result.text).toContain('[Diff truncated: middle omitted');
    expect(result.text).toContain('diff --git a/a.txt b/a.txt');
    expect(result.text).toContain('+line 499');
    expect(result.text.length).toBeLessThanOrEqual(1200);
    expect(result.omittedLength).toBeGreaterThan(0);
  });
});
