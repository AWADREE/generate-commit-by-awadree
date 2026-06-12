import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMMANDS } from '../src/constants';

describe('package contributions', () => {
  const extensionSource = readFileSync(join(__dirname, '..', 'src', 'extension.ts'), 'utf8');
  const packageJson = JSON.parse(
    readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
  ) as {
    activationEvents: string[];
    contributes: {
      commands: Array<{ command: string; title: string }>;
      menus: Record<string, Array<{ command: string }>>;
      configuration: { properties: Record<string, unknown> };
    };
  };

  it('registers all required commands', () => {
    const commands = packageJson.contributes.commands.map(command => command.command);

    expect(commands).toContain(COMMANDS.generate);
    expect(commands).toContain(COMMANDS.signIn);
    expect(commands).toContain(COMMANDS.signOut);
    expect(commands).toContain(COMMANDS.reauthenticate);
  });

  it('activates on all required commands', () => {
    for (const command of Object.values(COMMANDS)) {
      expect(packageJson.activationEvents).toContain(`onCommand:${command}`);
    }
  });

  it('adds the closest stable Source Control action and custom instructions setting', () => {
    expect(packageJson.contributes.menus['scm/title']).toEqual(
      expect.arrayContaining([expect.objectContaining({ command: COMMANDS.generate })])
    );
    expect(packageJson.contributes.configuration.properties).toHaveProperty('codexCommit.customInstructions');
  });

  it('uses the public SCM input box and does not run git commit', () => {
    expect(extensionSource).toContain('vscode.scm.inputBox.value');
    expect(extensionSource).not.toContain('git commit');
  });
});
