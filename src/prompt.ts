import type { DiffKind } from './git';

export interface CommitPromptOptions {
  diff: string;
  diffKind: DiffKind;
  existingInput?: string;
  customInstructions?: string;
  wasTruncated: boolean;
  originalLength: number;
  sentLength: number;
}

export function buildCommitPrompt(options: CommitPromptOptions): string {
  const existingInput = options.existingInput?.trim();
  const customInstructions = options.customInstructions?.trim();
  const truncationNote = options.wasTruncated
    ? `The diff was truncated before sending. Original length: ${options.originalLength} characters. Sent length: ${options.sentLength} characters. Account for possible omitted middle context and avoid overclaiming.`
    : 'The diff was not truncated.';

  return [
    'Generate one Git commit message for the provided changes.',
    '',
    'Rules:',
    '- Return only the commit message. No markdown. No explanation.',
    '- Prefer concise Conventional Commit style when possible.',
    '- Keep the subject line at or below 72 characters.',
    '- Add a body only when it is useful.',
    '- Describe the intent of the change, not only file names.',
    '- Never say that you committed the changes.',
    '',
    `Diff source: ${options.diffKind === 'staged' ? 'staged changes from git diff --cached --no-ext-diff' : 'unstaged changes from git diff --no-ext-diff'}.`,
    truncationNote,
    existingInput ? `Existing Source Control input, for optional context:\n${existingInput}` : 'Existing Source Control input: empty.',
    customInstructions ? `Additional user instructions:\n${customInstructions}` : 'Additional user instructions: none.',
    '',
    'Diff:',
    '```diff',
    options.diff,
    '```'
  ].join('\n');
}

export function sanitizeCommitMessage(value: string): string {
  return value
    .replace(/^```(?:\w+)?\s*/u, '')
    .replace(/\s*```$/u, '')
    .trim();
}
