# Changelog

## 0.1.8

- Match GitLens-style commit message bodies with scoped subjects and detailed, capitalized, past-tense bullet points for non-trivial diffs.

## 0.1.7

- Strengthen commit message prompt rules so non-trivial diffs produce a descriptive multi-line message with reviewer-focused body bullets.

## 0.1.5

- Move Codex-only, sign-in, and Source Control button guidance near the top of the Marketplace page.
- Replace the extension-logo README image with the actual dark-theme and light-theme toolbar button icons.
- Add a Marketplace listing link to the GitHub README.

## 0.1.4

- Restore the README button image and document that repository assets must be public for Marketplace rendering.

## 0.1.3

- Simplify the Marketplace description wording.

## 0.1.2

- Add a prominent `For Codex` note near the top of the Marketplace page.
- Remove the screenshot section and identify the Source Control button by its commit-spark icon.

## 0.1.1

- Ignore and migrate stale unsupported model settings such as `gpt-5`.
- Keep model selection constrained to the documented Codex models supported by this extension.
- Shorten noisy Codex CLI failure output in VS Code notifications.

## 0.1.0

- Add Source Control action to generate commit messages with the local Codex CLI.
- Prefer staged Git changes and fall back to unstaged changes.
- Write generated messages into the Git commit input for review.
- Add progress notifications, Codex sign-in commands, and safer Codex CLI invocation.
- Add original extension artwork and clear unofficial status.
