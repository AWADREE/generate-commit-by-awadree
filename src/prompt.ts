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
  'Include a concise scope when the diff clearly centers on one area, feature, app, package, or service, for example feat(crm): add lead management.',
  'Write the description in imperative present tense, as if completing "This commit will ...".',
  'Keep the subject description concise, lower-case after the type unless a proper noun, acronym, brand, language, or domain term requires capitalization, and do not end it with a period.',
  'Keep the first line at 72 characters or less.',
  'Use a one-line commit message only for tiny, single-purpose diffs.',
  'For multi-file, multi-area, behavior-changing, refactor-heavy, truncated, or otherwise non-trivial diffs, include a body.',
  'Separate the subject from the body with one blank line.',
  'Wrap body lines at 72 characters.',
  'When a body is included, write detailed bullet points after the blank line.',
  'For medium diffs, write 4-7 body bullets. For broad diffs with many changed files or many distinct changes, write 7-10 body bullets.',
  'Format every body bullet as "- Capitalized past-tense sentence."',
  'Start body bullets with strong past-tense verbs such as Added, Implemented, Created, Updated, Refactored, Introduced, Defined, Established, or Improved.',
  'Capitalize the start of every sentence and preserve correct capitalization for proper nouns, acronyms, languages, frameworks, products, and domain terms such as API, CRM, KPI, Arabic, English, React, and Codex.',
  'End every body bullet with a period.',
  'Use body bullets to group the important changes by intent, area, component, data flow, or user impact.',
  'Use body bullets to explain why the change matters, risks, migrations, configuration changes, and non-obvious side effects.',
  'Do not list every changed file; summarize the meaningful change groups a reviewer needs to understand.',
  'Prefer the descriptive style of GitLens-generated commit messages: subject line followed by specific, reviewer-friendly bullets for each meaningful change group.',
  'If there is a breaking change, include a footer starting with "BREAKING CHANGE:".',
  'Include issue references or trailers only if they are clearly present in the diff or existing input.',
  'Analyze the staged diff and any existing Source Control input to produce a clear, descriptive, meaningful message.',
  'Describe the intent and reviewer-relevant context of the change, not only file names.',
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
