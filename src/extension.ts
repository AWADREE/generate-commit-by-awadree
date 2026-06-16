import * as vscode from 'vscode';
import { checkCodexAuthenticated, checkCodexAvailable, generateCommitMessage } from './codex';
import {
  COMMANDS,
  CONFIG_SECTION,
  DEFAULT_CODEX_MODEL,
  DEFAULT_REASONING_EFFORT,
  SUPPORTED_CODEX_MODELS,
  SUPPORTED_REASONING_EFFORTS
} from './constants';
import { prepareDiffForPrompt } from './diff';
import { getPreferredDiff, resolveGitWorkspace } from './git';
import { runProcess } from './process';
import { buildCommitPrompt } from './prompt';

interface ExtensionConfig {
  codexCommand: string;
  customInstructions: string;
  maxDiffChars: number;
  model: string;
  reasoningEffort: string;
}

interface GitRepository {
  rootUri: vscode.Uri;
  inputBox: {
    value: string;
  };
}

interface GitApi {
  repositories: GitRepository[];
}

interface GitExtension {
  getAPI(version: 1): GitApi;
}

function getConfig(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  return {
    codexCommand: config.get<string>('codexCommand', 'codex'),
    customInstructions: config.get<string>('customInstructions', ''),
    maxDiffChars: config.get<number>('maxDiffChars', 60000),
    model: normalizeModel(config.get<string>('model', DEFAULT_CODEX_MODEL)),
    reasoningEffort: normalizeReasoningEffort(config.get<string>('reasoningEffort', DEFAULT_REASONING_EFFORT))
  };
}

function normalizeModel(value: string | undefined): string {
  const model = value?.trim();
  return model && (SUPPORTED_CODEX_MODELS as readonly string[]).includes(model) ? model : DEFAULT_CODEX_MODEL;
}

function normalizeReasoningEffort(value: string | undefined): string {
  const effort = value?.trim();
  return effort && (SUPPORTED_REASONING_EFFORTS as readonly string[]).includes(effort) ? effort : DEFAULT_REASONING_EFFORT;
}

async function migrateConfiguration(): Promise<void> {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const configuredModel = config.get<string>('model', DEFAULT_CODEX_MODEL);
  const configuredReasoningEffort = config.get<string>('reasoningEffort', DEFAULT_REASONING_EFFORT);
  const normalizedModel = normalizeModel(configuredModel);
  const normalizedReasoningEffort = normalizeReasoningEffort(configuredReasoningEffort);

  if (configuredModel !== normalizedModel) {
    await config.update('model', normalizedModel, vscode.ConfigurationTarget.Global);
  }

  if (configuredReasoningEffort !== normalizedReasoningEffort) {
    await config.update('reasoningEffort', normalizedReasoningEffort, vscode.ConfigurationTarget.Global);
  }
}

function getCandidateDirectories(): string[] {
  const activeFile = vscode.window.activeTextEditor?.document.uri;
  const activeWorkspace = activeFile ? vscode.workspace.getWorkspaceFolder(activeFile) : undefined;
  const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
  return [
    activeWorkspace?.uri.fsPath,
    ...workspaceFolders.map(folder => folder.uri.fsPath)
  ].filter((value): value is string => Boolean(value));
}

async function getGitApi(): Promise<GitApi | undefined> {
  const extension = vscode.extensions.getExtension<GitExtension>('vscode.git');
  if (!extension) {
    return undefined;
  }

  const gitExtension = extension.isActive ? extension.exports : await extension.activate();
  return gitExtension.getAPI(1);
}

function normalizePath(value: string): string {
  return value.replace(/\\/gu, '/').replace(/\/+$/u, '').toLowerCase();
}

async function getGitRepositoryForRoot(repoRoot: string): Promise<GitRepository | undefined> {
  const api = await getGitApi();
  const normalizedRoot = normalizePath(repoRoot);
  return api?.repositories.find(repository => normalizePath(repository.rootUri.fsPath) === normalizedRoot);
}

function hasOfficialCodexExtensionSignal(): boolean {
  return vscode.extensions.all.some(extension => {
    const id = extension.id.toLowerCase();
    const displayName = String(extension.packageJSON?.displayName ?? '').toLowerCase();
    const name = String(extension.packageJSON?.name ?? '').toLowerCase();
    return id === 'openai.chatgpt' || id === 'openai.codex' || (
      id.startsWith('openai.') && (displayName.includes('codex') || name.includes('codex'))
    );
  });
}

function showCodexTerminal(commands: string | readonly string[], name = 'Codex Commit Auth'): void {
  const terminal = vscode.window.createTerminal(name);
  terminal.show(true);
  for (const command of Array.isArray(commands) ? commands : [commands]) {
    terminal.sendText(command, true);
  }
}

function getCodexCliInstallCommands(): string[] {
  if (process.platform === 'win32') {
    return [
      'powershell -ExecutionPolicy ByPass -c "irm https://chatgpt.com/codex/install.ps1 | iex"',
      'codex login'
    ];
  }

  if (process.platform === 'darwin' || process.platform === 'linux') {
    return [
      'curl -fsSL https://chatgpt.com/codex/install.sh | sh',
      'codex login'
    ];
  }

  return [
    'npm install -g @openai/codex',
    'codex login'
  ];
}

async function installCodexCli(): Promise<void> {
  const confirmed = await vscode.window.showWarningMessage(
    'This will run the official Codex CLI installer in a VS Code terminal, then start Codex sign-in. Continue?',
    { modal: true },
    'Install Codex CLI'
  );

  if (confirmed !== 'Install Codex CLI') {
    return;
  }

  showCodexTerminal(getCodexCliInstallCommands(), 'Install Codex CLI');
}

async function signIn(): Promise<void> {
  const { codexCommand } = getConfig();
  const signal = hasOfficialCodexExtensionSignal()
    ? ' The official Codex VS Code extension appears to be installed; this extension still uses Codex CLI login as the source of truth.'
    : '';
  vscode.window.showInformationMessage(`Starting browser-based Codex CLI sign-in.${signal}`);
  showCodexTerminal(`${codexCommand} login`);
}

async function openCodexCommandSetting(): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.openSettings', `${CONFIG_SECTION}.codexCommand`);
}

function isMissingCodexCliError(detail: string): boolean {
  return /Codex CLI was not found/iu.test(detail);
}

function isCodexAuthError(detail: string): boolean {
  return /\b(not logged in|unauthenticated|not authenticated|login required|sign in)\b/iu.test(detail);
}

async function handleCodexReadinessError(error: unknown): Promise<void> {
  const detail = error instanceof Error ? error.message : String(error);

  if (isMissingCodexCliError(detail)) {
    const action = await vscode.window.showErrorMessage(
      `${detail} This extension requires the local Codex CLI.`,
      'Install Codex CLI',
      'Open Setting'
    );
    if (action === 'Install Codex CLI') {
      await installCodexCli();
    } else if (action === 'Open Setting') {
      await openCodexCommandSetting();
    }
    return;
  }

  const action = await vscode.window.showErrorMessage(
    detail,
    'Sign In',
    'Reauthenticate'
  );
  if (action === 'Sign In') {
    await signIn();
  } else if (action === 'Reauthenticate') {
    await reauthenticate();
  }
}

async function handleCodexGenerationError(error: unknown): Promise<void> {
  const detail = error instanceof Error ? error.message : String(error);
  if (!isCodexAuthError(detail)) {
    vscode.window.showErrorMessage(`Codex commit message generation failed: ${detail}`);
    return;
  }

  const action = await vscode.window.showErrorMessage(
    `Codex commit message generation failed: ${detail}`,
    'Sign In',
    'Reauthenticate'
  );
  if (action === 'Sign In') {
    await signIn();
  } else if (action === 'Reauthenticate') {
    await reauthenticate();
  }
}

async function signOut(): Promise<void> {
  const { codexCommand } = getConfig();
  const confirmed = await vscode.window.showWarningMessage(
    'Codex logout removes shared local Codex credentials used by the Codex CLI and related Codex IDE integrations. Continue?',
    { modal: true },
    'Sign Out'
  );
  if (confirmed === 'Sign Out') {
    showCodexTerminal(`${codexCommand} logout`);
  }
}

async function reauthenticate(): Promise<void> {
  const { codexCommand } = getConfig();
  const confirmed = await vscode.window.showWarningMessage(
    'Reauthenticating signs out of shared local Codex credentials, then starts browser-based Codex login.',
    { modal: true },
    'Reauthenticate'
  );
  if (confirmed === 'Reauthenticate') {
    showCodexTerminal([`${codexCommand} logout`, `${codexCommand} login`], 'Codex Commit Reauth');
  }
}

async function selectModel(): Promise<void> {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const current = normalizeModel(config.get<string>('model', DEFAULT_CODEX_MODEL));
  const selection = await vscode.window.showQuickPick(
    [
      {
        label: DEFAULT_CODEX_MODEL,
        description: 'Default. Fast, lower-cost model for lightweight commit messages',
        value: DEFAULT_CODEX_MODEL
      },
      {
        label: 'gpt-5.5',
        description: 'Newest frontier model for complex coding workflows',
        value: 'gpt-5.5'
      },
      {
        label: 'gpt-5.4',
        description: 'Flagship model for professional coding work',
        value: 'gpt-5.4'
      },
      {
        label: 'gpt-5.3-codex-spark',
        description: 'Research preview, near-instant coding model for ChatGPT Pro users',
        value: 'gpt-5.3-codex-spark'
      },
      {
        label: 'Use extension default',
        description: `Currently ${current}`,
        value: ''
      }
    ],
    { placeHolder: `Codex model for this extension${current ? ` (current: ${current})` : ''}` }
  );

  if (!selection) {
    return;
  }

  const value = selection.value || DEFAULT_CODEX_MODEL;
  await config.update('model', value, vscode.ConfigurationTarget.Global);
  vscode.window.showInformationMessage(`Awadree commit model set to ${value}.`);
}

async function selectReasoningEffort(): Promise<void> {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const current = normalizeReasoningEffort(config.get<string>('reasoningEffort', DEFAULT_REASONING_EFFORT));
  const selection = await vscode.window.showQuickPick(
    [
      { label: DEFAULT_REASONING_EFFORT, description: 'Default. Fastest and usually enough for concise commit messages', value: DEFAULT_REASONING_EFFORT },
      { label: 'medium', description: 'Balanced reasoning for more complex diffs', value: 'medium' },
      { label: 'high', description: 'More reasoning for broad or subtle changes', value: 'high' },
      { label: 'Use extension default', description: `Currently ${current}`, value: '' }
    ],
    { placeHolder: `Codex reasoning effort for this extension${current ? ` (current: ${current})` : ''}` }
  );

  if (!selection) {
    return;
  }

  const value = selection.value || DEFAULT_REASONING_EFFORT;
  await config.update('reasoningEffort', value, vscode.ConfigurationTarget.Global);
  vscode.window.showInformationMessage(`Awadree commit reasoning effort set to ${value}.`);
}

async function generate(): Promise<void> {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Generate Commit Message by Awadree',
      cancellable: false
    },
    async progress => {
      const config = getConfig();
      progress.report({ message: 'Finding Git repository...' });
      const workspace = await resolveGitWorkspace(runProcess, getCandidateDirectories());
      if (!workspace) {
        vscode.window.showErrorMessage('No Git repository found for the active editor or workspace.');
        return;
      }

      progress.report({ message: 'Reading staged changes...' });
      let diffResult;
      try {
        diffResult = await getPreferredDiff(runProcess, workspace.repoRoot);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Unable to read Git changes: ${detail}`);
        return;
      }

      if (!diffResult) {
        vscode.window.showWarningMessage('No staged or unstaged Git changes found. Nothing was generated.');
        return;
      }

      progress.report({ message: 'Checking Codex CLI and sign-in...' });
      try {
        await checkCodexAvailable(runProcess, config.codexCommand);
        await checkCodexAuthenticated(runProcess, config.codexCommand, workspace.repoRoot);
      } catch (error) {
        await handleCodexReadinessError(error);
        return;
      }

      const gitRepository = await getGitRepositoryForRoot(workspace.repoRoot);
      const existingInput = gitRepository?.inputBox.value ?? vscode.scm.inputBox.value;
      const preparedDiff = prepareDiffForPrompt(diffResult.diff, config.maxDiffChars);
      const prompt = buildCommitPrompt({
        diff: preparedDiff.text,
        diffKind: diffResult.kind,
        existingInput,
        customInstructions: config.customInstructions,
        wasTruncated: preparedDiff.wasTruncated,
        originalLength: preparedDiff.originalLength,
        sentLength: preparedDiff.sentLength
      });

      progress.report({ message: `Generating from ${diffResult.kind} changes...` });
      try {
        const message = await generateCommitMessage(runProcess, {
          codexCommand: config.codexCommand,
          repoRoot: workspace.repoRoot,
          prompt,
          model: config.model,
          reasoningEffort: config.reasoningEffort
        });
        if (gitRepository) {
          gitRepository.inputBox.value = message;
        } else {
          vscode.scm.inputBox.value = message;
        }
        if (preparedDiff.wasTruncated) {
          vscode.window.showInformationMessage('Codex generated a commit message. The diff was truncated before generation.');
        } else {
          vscode.window.showInformationMessage('Codex generated a commit message.');
        }
      } catch (error) {
        await handleCodexGenerationError(error);
      }
    }
  );
}

export function activate(context: vscode.ExtensionContext): void {
  void migrateConfiguration();

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.generate, generate),
    vscode.commands.registerCommand(COMMANDS.installCodexCli, installCodexCli),
    vscode.commands.registerCommand(COMMANDS.selectModel, selectModel),
    vscode.commands.registerCommand(COMMANDS.selectReasoningEffort, selectReasoningEffort),
    vscode.commands.registerCommand(COMMANDS.signIn, signIn),
    vscode.commands.registerCommand(COMMANDS.signOut, signOut),
    vscode.commands.registerCommand(COMMANDS.reauthenticate, reauthenticate)
  );
}

export function deactivate(): void {
  // Nothing to clean up.
}
