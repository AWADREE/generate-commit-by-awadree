# Generate Commit by Awadree (Unofficial)

## For Codex

This extension currently works only with the local Codex CLI. Install and sign in to Codex before using it to generate commit messages.

A focused, unofficial VS Code extension that generates one commit message from the current Git changes using the local Codex CLI, then writes the result into the VS Code Source Control commit input.

It never commits automatically. This project is not created by, affiliated with, sponsored by, or endorsed by OpenAI, Microsoft, GitHub, or the VS Code team.

Marketplace listing: [Generate Commit by Awadree](https://marketplace.visualstudio.com/items?itemName=Awadree.generate-commit-by-awadree)

## Sign In First

Run `Generate Commit by Awadree: Sign In` from the Command Palette. The extension opens a VS Code terminal and runs:

```sh
codex login
```

Complete the Codex browser sign-in, then return to VS Code.

## Find The Button

Open the Source Control view and look in the top-right title toolbar for the commit-spark button. Hover the icon to confirm the tooltip says `Generate Commit Message by Awadree`, then press it to generate the commit message.

Dark theme button icon:

![Generate Commit Message by Awadree dark theme button icon](assets/commit-spark-dark.png)

Light theme button icon:

![Generate Commit Message by Awadree light theme button icon](assets/commit-spark-light.png)

The toolbar button uses original extension artwork and does not use the OpenAI or Codex logo.

## What It Does

- Adds `Generate Commit Message by Awadree` to the Command Palette.
- Adds one Source Control title button using stable public VS Code menu APIs.
- Shows VS Code progress while Codex generates the message.
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
- Uses the Git repository Source Control input when available, with the deprecated global SCM input only as a fallback.
- Uses original extension artwork for the Marketplace icon and Source Control action icon.
- Provides Command Palette controls for the Codex model and reasoning effort scoped only to this extension.

## Requirements

- VS Code 1.90 or newer.
- Git available on `PATH`.
- Codex CLI available on `PATH`.
- Browser-based Codex CLI sign-in completed with the account you want to use.

This extension uses Codex through the supported local Codex CLI. It does not call raw OpenAI APIs and does not request, store, read, copy, display, or exfiltrate OpenAI API keys or Codex auth tokens.

## Privacy And Data Flow

When you run `Generate Commit Message by Awadree`, the extension reads the selected Git diff and sends that prompt to the local Codex CLI process. Depending on your Codex CLI configuration, the CLI may send that prompt to OpenAI or another configured provider to generate the commit message.

The prompt can include staged or unstaged code changes and any text already typed into the Source Control commit input. Review your organization's policies before using this extension on private, regulated, or customer-sensitive code.

The extension does not create commits automatically, does not upload repository files outside the generated prompt, and does not read or manage Codex authentication tokens directly.

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
code --install-extension out/generate-commit-by-awadree-0.1.5.vsix --force
```

Or run the combined helper:

```sh
npm run install:vsix
```

Restart VS Code or run `Developer: Reload Window` after installing.

### Install From The VS Code Marketplace

If this extension is published to the VS Code Marketplace, install it from VS Code by searching for:

```text
Generate Commit by Awadree (Unofficial)
```

You can also install by extension ID after publication:

```sh
code --install-extension Awadree.generate-commit-by-awadree
```

If you publish under a different Marketplace publisher, use that publisher ID instead of `Awadree`.

### Use The Extension

In VS Code:

1. Open a folder that contains a Git repository.
2. Stage files if you want the message generated from staged changes.
3. Leave everything unstaged if you want the unstaged fallback.
4. Run `Generate Commit Message by Awadree`.
5. Review the generated message in the Source Control commit input.
6. Commit manually when you are satisfied.

## Unofficial Status And Trademark Notice

This extension is unofficial. It is built by an independent publisher and uses the local Codex CLI as a user-installed dependency.

OpenAI, Codex, Microsoft, Visual Studio Code, GitHub, and Git are names or marks of their respective owners. This extension uses those names only to describe compatibility and required tools. It does not use official OpenAI, Codex, Microsoft, Visual Studio Code, GitHub, or Git logos, and it should not be presented as endorsed, certified, sponsored, or maintained by those organizations.

Before publishing publicly, review the current Visual Studio Marketplace policies, OpenAI brand guidance, and any third-party terms that apply to your publisher account and distribution location.

## Codex Sign-In Details

The Codex CLI handles browser-based sign-in and stores its own shared local credentials. The Codex CLI login state is treated as the source of truth because the CLI and Codex IDE integrations share cached local login state.

If the official Codex VS Code extension appears to be installed, this extension treats that only as a helpful signal. It never reads tokens from that extension.

## Sign Out And Reauthenticate

`Generate Commit by Awadree: Sign Out` warns before running:

```sh
codex logout
```

`codex logout` removes shared local Codex credentials used by the Codex CLI and related Codex IDE integrations.

`Generate Commit by Awadree: Reauthenticate` warns first, then runs logout followed by login in a terminal.

## Settings

`codexCommit.customInstructions`

Optional extra instructions appended to the default commit message prompt. Defaults to empty.

`codexCommit.maxDiffChars`

Maximum number of diff characters sent to Codex before truncation. Defaults to `60000`.

`codexCommit.codexCommand`

Codex CLI executable. Defaults to `codex`. Set this if Codex is installed somewhere that is not on VS Code's `PATH`.

`codexCommit.model`

Codex model used only when this extension generates commit messages. Defaults to `gpt-5.4-mini`, the fast lower-cost recommended model for lighter Codex tasks. Current documented Codex model choices are `gpt-5.5`, `gpt-5.4`, `gpt-5.4-mini`, and `gpt-5.3-codex-spark`. `gpt-5.3-codex-spark` is a research preview model for ChatGPT Pro users, so it is available in the picker but is not the default.

`codexCommit.reasoningEffort`

Reasoning effort used only when this extension generates commit messages. Defaults to `low`, which is usually enough and fastest for concise commit messages. Supported choices are `low`, `medium`, and `high`.

Web search is not exposed as an extension setting. Commit messages should be based on the local diff, so the extension always passes `web_search="disabled"` for generated commit messages.

These settings do not edit `~/.codex/config.toml` or project `.codex/config.toml` files. The extension passes them as per-invocation `codex exec` flags or `--config` overrides for generated commit messages only.

## Command Palette Controls

Run these from `Ctrl+Shift+P`:

- `Generate Commit Message by Awadree`
- `Generate Commit by Awadree: Select Model`
- `Generate Commit by Awadree: Select Reasoning Effort`
- `Generate Commit by Awadree: Sign In`
- `Generate Commit by Awadree: Sign Out`
- `Generate Commit by Awadree: Reauthenticate`

## Prompt Defaults

The default prompt asks Codex to:

- Return only the commit message.
- Avoid markdown and explanation.
- Use Conventional Commit format when a type can be inferred: `<type>[optional scope]: <description>`.
- Prefer `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, `style`, or `revert`.
- Write the description in imperative present tense, as if completing "This commit will ...".
- Keep the description concise, lower-case after the type unless a proper noun requires capitalization, and without a final period.
- Target 50 characters or less for the first line; never exceed 72 characters.
- Add a body only when useful to explain why, user impact, migration notes, risks, or non-obvious side effects.
- Separate the subject from the body with one blank line.
- Wrap body lines at 72 characters.
- Use the body to explain what and why; avoid repeating obvious implementation details from the diff.
- Add a `BREAKING CHANGE:` footer when the diff clearly introduces a breaking change.
- Include issue references or trailers only if they are clearly present in the diff or existing input.
- Describe the intent of the change, not only file names.
- Avoid claiming that it committed anything.

## Known VS Code UI Limits

GitLens can place actions in UI locations that are not available to third-party extensions through stable public VS Code APIs.

This extension uses the closest stable public integration:

- Command Palette command.
- Source Control view title action through `contributes.menus["scm/title"]`.
- Commit input update through the active Git repository `SourceControl.inputBox`, falling back to `vscode.scm.inputBox.value` only when the Git API is unavailable.

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
out/generate-commit-by-awadree-0.1.5.vsix
```

Run the same package build as a dry run before publishing:

```sh
npm run publish:dry-run
```

Marketplace publishing checklist:

1. Create or confirm your Visual Studio Marketplace publisher ID. This package is currently set to `Awadree`.
2. Make sure `publisher` in `package.json` matches that publisher ID.
3. Create the public GitHub repository configured in `package.json`: `https://github.com/Awadree/generate-commit-by-awadree`.
4. Push this repository before publishing so Marketplace links and README assets render.
5. Confirm the top-level `icon` in `package.json` points to a PNG at least 128x128 pixels.
6. Keep the README's unofficial status and trademark notice visible on the Marketplace page.
7. Run `npm run verify`.
8. Run `npm run package:vsix`.
9. Install the VSIX locally with `code --install-extension out/generate-commit-by-awadree-0.1.5.vsix --force`.
10. Confirm the command palette and Source Control action work in an Extension Host or normal VS Code window.
11. Configure Marketplace publishing credentials:

    ```sh
    $env:VSCE_PAT = "<your-marketplace-personal-access-token>"
    ```

12. Upload the same VSIX:

    ```sh
    npm run publish:marketplace
    ```

To create the Marketplace account and token:

1. Sign in to the Visual Studio Marketplace publisher management page.
2. Create a publisher. The publisher ID must match `publisher` in `package.json`; for this extension it is `Awadree`.
3. Create an Azure DevOps Personal Access Token with Marketplace manage permissions.
4. Set the token only in the current terminal session as `VSCE_PAT`.
5. Run `npm run publish:marketplace`.

Do not commit, paste into chat, or store the PAT in this repository. Treat it like a password. If you want me to publish from this machine, set `$env:VSCE_PAT` locally in the terminal/session I can use, and I can run the publish command for publisher `Awadree`.

The package uses only stable public VS Code APIs and includes the required `README.md`, `LICENSE`, `package.json`, compiled `dist` entrypoint, and Marketplace metadata needed for a normal VSIX install.

The Marketplace upload requires a publisher account and a Personal Access Token authorized for that publisher. Without that credential, `vsce publish` can package and validate the extension but cannot upload it.

## Manual Extension Host Checklist

Run this after `npm install` and `npm run compile`.

1. Press `F5` in VS Code to open an Extension Host.
2. In the Extension Host, open a Git repository.
3. Confirm the Command Palette lists:
   - `Generate Commit Message by Awadree`
   - `Generate Commit by Awadree: Select Model`
   - `Generate Commit by Awadree: Select Reasoning Effort`
   - `Generate Commit by Awadree: Sign In`
   - `Generate Commit by Awadree: Sign Out`
   - `Generate Commit by Awadree: Reauthenticate`
4. Confirm the Source Control view title shows the Awadree generate action.
5. Run `Generate Commit by Awadree: Sign In` and complete browser login if needed.
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

Run `Generate Commit by Awadree: Sign In`, complete browser login, then retry generation.

`No Git repository found`

Open a folder inside a Git repository, or focus an editor file that belongs to one.

`No staged or unstaged Git changes found`

Make a change or stage files first. The extension does nothing when there is no diff.

`Codex commit message generation failed`

Check the notification detail. Common causes are expired Codex login, network issues, Codex CLI errors, or a custom `codexCommit.codexCommand` that points to the wrong executable.

Generated message looks too broad

The diff may have been truncated. Review the message before committing, increase `codexCommit.maxDiffChars`, or stage a narrower set of changes.

