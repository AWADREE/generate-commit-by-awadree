# Generate Commit by Codex

A focused VS Code extension that generates one commit message from the current Git changes using the local Codex CLI, then writes the result into the VS Code Source Control commit input.

It never commits automatically.

## What It Does

- Adds `Generate Commit by Codex` to the Command Palette.
- Adds its own Source Control title button/submenu using stable public VS Code menu APIs.
- Adds Source Control repository/source-control menu entries for discoverability.
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

### Install From This Repo For Development

From a clean clone:

```sh
npm install
npm run compile
```

Then open the project in VS Code and press `F5` to launch an Extension Host.

Run the automated checks, including an Extension Host smoke test:

```sh
npm run verify
```

### Install Locally In VS Code

Build a VSIX package and install it into your normal VS Code profile:

```sh
npm install
npm run package:vsix
code --install-extension out/generate-commit-by-codex-0.1.0.vsix --force
```

Or run the combined helper:

```sh
npm run install:vsix
```

Restart VS Code or run `Developer: Reload Window` after installing.

### Install From The VS Code Marketplace

If this extension is published to the VS Code Marketplace, install it from VS Code by searching for:

```text
Generate Commit by Codex
```

You can also install by extension ID after publication:

```sh
code --install-extension zoldy.generate-commit-by-codex
```

If you publish under a different Marketplace publisher, use that publisher ID instead of `zoldy`.

### Use The Extension

In VS Code:

1. Open a folder that contains a Git repository.
2. Stage files if you want the message generated from staged changes.
3. Leave everything unstaged if you want the unstaged fallback.
4. Run `Generate Commit by Codex`.
5. Review the generated message in the Source Control commit input.
6. Commit manually when you are satisfied.

## Codex Sign-In

Run `Generate Commit by Codex: Sign In to Codex` from the Command Palette. The extension opens a VS Code terminal and runs:

```sh
codex login
```

The Codex CLI handles browser-based sign-in and stores its own shared local credentials. The Codex CLI login state is treated as the source of truth because the CLI and Codex IDE integrations share cached local login state.

If the official Codex VS Code extension appears to be installed, this extension treats that only as a helpful signal. It never reads tokens from that extension.

## Sign Out And Reauthenticate

`Generate Commit by Codex: Sign Out of Codex` warns before running:

```sh
codex logout
```

`codex logout` removes shared local Codex credentials used by the Codex CLI and related Codex IDE integrations.

`Generate Commit by Codex: Reauthenticate Codex` warns first, then runs logout followed by login in a terminal.

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
- Its own Source Control title submenu through `contributes.submenus`.
- Source Control repository and source-control menu entries through `scm/repository` and `scm/sourceControl`.
- Commit input update through `vscode.scm.inputBox.value`.

It does not use private GitLens internals, GitLens menu IDs, or private VS Code APIs. If VS Code exposes a stable input-box button API in the future, the extension can move the action closer to the input box.

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

## Packaging And Marketplace Readiness

Package a local VSIX:

```sh
npm run package:vsix
```

The generated file is:

```text
out/generate-commit-by-codex-0.1.0.vsix
```

Run the same package build as a dry run before publishing:

```sh
npm run publish:dry-run
```

Marketplace publishing checklist:

1. Make sure `publisher` in `package.json` is your registered VS Code Marketplace publisher ID.
2. Add a real `repository` URL in `package.json` when the project has a public remote.
3. Run `npm run verify`.
4. Run `npm run package:vsix`.
5. Install the VSIX locally with `code --install-extension out/generate-commit-by-codex-0.1.0.vsix --force`.
6. Confirm the command palette and Source Control action work in an Extension Host or normal VS Code window.
7. Configure Marketplace publishing credentials:

   ```sh
   $env:VSCE_PAT = "<your-marketplace-personal-access-token>"
   ```

8. Upload the same VSIX:

   ```sh
   npm run publish:marketplace
   ```

The package uses only stable public VS Code APIs and includes the required `README.md`, `LICENSE`, `package.json`, compiled `dist` entrypoint, and Marketplace metadata needed for a normal VSIX install.

The Marketplace upload requires a publisher account and a Personal Access Token authorized for that publisher. Without that credential, `vsce publish` can package and validate the extension but cannot upload it.

## Manual Extension Host Checklist

Run this after `npm install` and `npm run compile`.

1. Press `F5` in VS Code to open an Extension Host.
2. In the Extension Host, open a Git repository.
3. Confirm the Command Palette lists:
   - `Generate Commit by Codex`
   - `Generate Commit by Codex: Sign In to Codex`
   - `Generate Commit by Codex: Sign Out of Codex`
   - `Generate Commit by Codex: Reauthenticate Codex`
4. Confirm the Source Control view title shows the Codex generate action.
5. Run `Generate Commit by Codex: Sign In to Codex` and complete browser login if needed.
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

Run `Generate Commit by Codex: Sign In to Codex`, complete browser login, then retry generation.

`No Git repository found`

Open a folder inside a Git repository, or focus an editor file that belongs to one.

`No staged or unstaged Git changes found`

Make a change or stage files first. The extension does nothing when there is no diff.

`Codex commit message generation failed`

Check the notification detail. Common causes are expired Codex login, network issues, Codex CLI errors, or a custom `codexCommit.codexCommand` that points to the wrong executable.

Generated message looks too broad

The diff may have been truncated. Review the message before committing, increase `codexCommit.maxDiffChars`, or stage a narrower set of changes.

