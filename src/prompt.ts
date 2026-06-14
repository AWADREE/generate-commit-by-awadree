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

export const COMMIT_MESSAGE_RULES = [
  'Return only the commit message. No markdown. No explanation.',
  'Use Conventional Commit format when a type can be inferred: <type>[optional scope]: <description>.',
  'Prefer these types: feat, fix, docs, refactor, test, chore, build, ci, perf, style, revert.',
  'Write the description in imperative present tense, as if completing "This commit will ...".',
  'Keep the description concise, lower-case after the type unless a proper noun requires capitalization, and do not end it with a period.',
  'Target 50 characters or less for the first line; never exceed 72 characters.',
  'Add a body only when useful to explain why, user impact, migration notes, risks, or non-obvious side effects.',
  'Separate the subject from the body with one blank line.',
  'Wrap body lines at 72 characters.',
  'Use the body to explain what and why; avoid repeating obvious implementation details from the diff.',
  'If there is a breaking change, include a footer starting with "BREAKING CHANGE:".',
  'Include issue references or trailers only if they are clearly present in the diff or existing input.',
  'Describe the intent of the change, not only file names.',
  'Never say that you committed the changes.'
];

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
    ...COMMIT_MESSAGE_RULES.map(rule => `- ${rule}`),
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
