# Codex Commit Message Generator

A focused VS Code extension that generates one commit message from the current Git changes using the local Codex CLI, then writes the result into the VS Code Source Control commit input.

It never commits automatically.

## What It Does

- Adds `Codex Commit: Generate Commit Message` to the Command Palette.
- Adds a Source Control title action using stable public VS Code menu APIs.
- Detects the active Git repository from the active editor or workspace.
- Prefers staged changes from:

  ```sh
  git diff --cached --no-ext-diff
  ```

- Falls back to unstaged changes from:

  ```sh
  git diff --no-ext-diff
  ```

- Shows a warning and does nothing when no changes exist.
- Includes the current Source Control input text as optional context for Codex.
- Truncates large diffs before sending them to Codex and tells Codex that truncation happened.
- Places the generated message in the Source Control commit input for you to review and edit.

## Requirements

- VS Code 1.90 or newer.
- Git available on `PATH`.
- Codex CLI available on `PATH`.
- Browser-based Codex CLI sign-in completed with the account you want to use.

This extension uses Codex through the supported local Codex CLI. It does not call raw OpenAI APIs and does not request, store, read, copy, display, or exfiltrate OpenAI API keys or Codex auth tokens.

## Install And Use

From this repo:

```sh
npm install
npm run compile
```

Then open the project in VS Code and press `F5` to launch an Extension Host.

In the Extension Host:

1. Open a folder that contains a Git repository.
2. Stage files if you want the message generated from staged changes.
3. Leave everything unstaged if you want the unstaged fallback.
4. Run `Codex Commit: Generate Commit Message`.
5. Review the generated message in the Source Control commit input.
6. Commit manually when you are satisfied.

## Codex Sign-In

Run `Codex Commit: Sign In to Codex` from the Command Palette. The extension opens a VS Code terminal and runs:

```sh
codex login
```

The Codex CLI handles browser-based sign-in and stores its own shared local credentials. The Codex CLI login state is treated as the source of truth because the CLI and Codex IDE integrations share cached local login state.

If the official Codex VS Code extension appears to be installed, this extension treats that only as a helpful signal. It never reads tokens from that extension.

## Sign Out And Reauthenticate

`Codex Commit: Sign Out of Codex` warns before running:

```sh
codex logout
```

`codex logout` removes shared local Codex credentials used by the Codex CLI and related Codex IDE integrations.

`Codex Commit: Reauthenticate Codex` warns first, then runs logout followed by login in a terminal.

## Settings

`codexCommit.customInstructions`

Optional extra instructions appended to the default commit message prompt. Defaults to empty.

`codexCommit.maxDiffChars`

Maximum number of diff characters sent to Codex before truncation. Defaults to `60000`.

`codexCommit.codexCommand`

Codex CLI executable. Defaults to `codex`. Set this if Codex is installed somewhere that is not on VS Code's `PATH`.

## Prompt Defaults

The default prompt asks Codex to:

- Return only the commit message.
- Avoid markdown and explanation.
- Prefer concise Conventional Commit style when possible.
- Keep the subject at or below 72 characters.
- Add a body only when useful.
- Describe the intent of the change, not only file names.
- Avoid claiming that it committed anything.

## Known VS Code UI Limits

GitLens can place actions in UI locations that are not available to third-party extensions through stable public VS Code APIs.

This extension uses the closest stable public integration:

- Command Palette command.
- Source Control view title action through `contributes.menus["scm/title"]`.
- Commit input update through `vscode.scm.inputBox.value`.

It does not use private GitLens internals or private VS Code APIs. If VS Code exposes a stable input-box button API in the future, the extension can move the action closer to the input box.

## Development

```sh
npm install
npm run compile
npm test
npm run verify
```

Useful files:

- `src/extension.ts`: VS Code command and Source Control wiring.
- `src/git.ts`: repository detection and staged/unstaged diff selection.
- `src/codex.ts`: Codex CLI availability, auth check, and generation call.
- `src/prompt.ts`: commit prompt construction and output cleanup.
- `src/diff.ts`: safe diff truncation.
- `test/*.test.ts`: unit tests for behavior that can be verified outside Extension Host.

## Manual Extension Host Checklist

Run this after `npm install` and `npm run compile`.

1. Press `F5` in VS Code to open an Extension Host.
2. In the Extension Host, open a Git repository.
3. Confirm the Command Palette lists:
   - `Codex Commit: Generate Commit Message`
   - `Codex Commit: Sign In to Codex`
   - `Codex Commit: Sign Out of Codex`
   - `Codex Commit: Reauthenticate Codex`
4. Confirm the Source Control view title shows the Codex generate action.
5. Run `Codex Commit: Sign In to Codex` and complete browser login if needed.
6. Create an unstaged change and run generate. Confirm the Source Control input is filled.
7. Stage a different change and run generate. Confirm staged changes are preferred.
8. Remove all changes and run generate. Confirm a warning appears and the input is not changed.
9. Type draft text in the Source Control input, run generate, and confirm Codex can use it as context.
10. Create a very large diff, lower `codexCommit.maxDiffChars`, run generate, and confirm the extension reports truncation.
11. Confirm no commit is created unless you manually commit.

## Troubleshooting

`Codex CLI was not found`

Install Codex CLI or set `codexCommit.codexCommand` to the executable available from VS Code.

`Codex is not authenticated` or `Not logged in`

Run `Codex Commit: Sign In to Codex`, complete browser login, then retry generation.

`No Git repository found`

Open a folder inside a Git repository, or focus an editor file that belongs to one.

`No staged or unstaged Git changes found`

Make a change or stage files first. The extension does nothing when there is no diff.

`Codex commit message generation failed`

Check the notification detail. Common causes are expired Codex login, network issues, Codex CLI errors, or a custom `codexCommit.codexCommand` that points to the wrong executable.

Generated message looks too broad

The diff may have been truncated. Review the message before committing, increase `codexCommit.maxDiffChars`, or stage a narrower set of changes.
