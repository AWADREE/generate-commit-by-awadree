import * as vscode from 'vscode';
import { checkCodexAuthenticated, checkCodexAvailable, generateCommitMessage } from './codex';
import { COMMANDS, CONFIG_SECTION } from './constants';
import { prepareDiffForPrompt } from './diff';
import { getPreferredDiff, resolveGitWorkspace } from './git';
import { runProcess } from './process';
import { buildCommitPrompt } from './prompt';

interface ExtensionConfig {
  codexCommand: string;
  customInstructions: string;
  maxDiffChars: number;
}

function getConfig(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  return {
    codexCommand: config.get<string>('codexCommand', 'codex'),
    customInstructions: config.get<string>('customInstructions', ''),
    maxDiffChars: config.get<number>('maxDiffChars', 60000)
  };
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

async function signIn(): Promise<void> {
  const { codexCommand } = getConfig();
  const signal = hasOfficialCodexExtensionSignal()
    ? ' The official Codex VS Code extension appears to be installed; this extension still uses Codex CLI login as the source of truth.'
    : '';
  vscode.window.showInformationMessage(`Starting browser-based Codex CLI sign-in.${signal}`);
  showCodexTerminal(`${codexCommand} login`);
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

async function generate(): Promise<void> {
  const config = getConfig();
  const workspace = await resolveGitWorkspace(runProcess, getCandidateDirectories());
  if (!workspace) {
    vscode.window.showErrorMessage('No Git repository found for the active editor or workspace.');
    return;
  }

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

  try {
    await checkCodexAvailable(runProcess, config.codexCommand);
    await checkCodexAuthenticated(runProcess, config.codexCommand);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const action = await vscode.window.showErrorMessage(detail, 'Sign In to Codex');
    if (action === 'Sign In to Codex') {
      await signIn();
    }
    return;
  }

  const preparedDiff = prepareDiffForPrompt(diffResult.diff, config.maxDiffChars);
  const prompt = buildCommitPrompt({
    diff: preparedDiff.text,
    diffKind: diffResult.kind,
    existingInput: vscode.scm.inputBox.value,
    customInstructions: config.customInstructions,
    wasTruncated: preparedDiff.wasTruncated,
    originalLength: preparedDiff.originalLength,
    sentLength: preparedDiff.sentLength
  });

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Codex is generating a commit message from ${diffResult.kind} changes`,
      cancellable: false
    },
    async () => {
      try {
        const message = await generateCommitMessage(runProcess, {
          codexCommand: config.codexCommand,
          repoRoot: workspace.repoRoot,
          prompt
        });
        vscode.scm.inputBox.value = message;
        if (preparedDiff.wasTruncated) {
          vscode.window.showInformationMessage('Codex generated a commit message. The diff was truncated before generation.');
        } else {
          vscode.window.showInformationMessage('Codex generated a commit message.');
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Codex commit message generation failed: ${detail}`);
      }
    }
  );
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.generate, generate),
    vscode.commands.registerCommand(COMMANDS.signIn, signIn),
    vscode.commands.registerCommand(COMMANDS.signOut, signOut),
    vscode.commands.registerCommand(COMMANDS.reauthenticate, reauthenticate)
  );
}

export function deactivate(): void {
  // Nothing to clean up.
}
