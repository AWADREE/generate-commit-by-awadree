export const COMMANDS = {
  generate: 'codexCommit.generateCommitMessage',
  selectModel: 'codexCommit.selectModel',
  selectReasoningEffort: 'codexCommit.selectReasoningEffort',
  signIn: 'codexCommit.signIn',
  signOut: 'codexCommit.signOut',
  reauthenticate: 'codexCommit.reauthenticate'
} as const;

export const CONFIG_SECTION = 'codexCommit';

export const SUPPORTED_CODEX_MODELS = [
  'gpt-5.4-mini',
  'gpt-5.5',
  'gpt-5.4',
  'gpt-5.3-codex-spark'
] as const;

export const DEFAULT_CODEX_MODEL = 'gpt-5.4-mini';
export const SUPPORTED_REASONING_EFFORTS = ['low', 'medium', 'high'] as const;
export const DEFAULT_REASONING_EFFORT = 'low';
