import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMMANDS } from '../src/constants';

describe('package contributions', () => {
  const extensionSource = readFileSync(join(__dirname, '..', 'src', 'extension.ts'), 'utf8');
  const packageJson = JSON.parse(
    readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
  ) as {
    icon?: string;
    activationEvents: string[];
    contributes: {
      commands: Array<{ command: string; title: string; icon?: unknown }>;
      menus: Record<string, Array<{ command: string }>>;
      submenus?: Array<{ id: string; label: string }>;
      configuration: { properties: Record<string, unknown> };
    };
  };

  it('registers all required commands', () => {
    const commands = packageJson.contributes.commands.map(command => command.command);

    expect(commands).toContain(COMMANDS.generate);
    expect(commands).toContain(COMMANDS.selectModel);
    expect(commands).toContain(COMMANDS.selectReasoningEffort);
    expect(commands).toContain(COMMANDS.signIn);
    expect(commands).toContain(COMMANDS.signOut);
    expect(commands).toContain(COMMANDS.reauthenticate);
  });

  it('uses the requested extension display name and Marketplace package name', () => {
    expect((packageJson as { name: string; displayName: string; publisher: string; version: string }).name).toBe(
      'generate-commit-by-awadree'
    );
    expect((packageJson as { name: string; displayName: string; publisher: string; version: string }).version).toBe('0.1.4');
    expect((packageJson as { name: string; displayName: string; publisher: string; version: string }).publisher).toBe('Awadree');
    expect((packageJson as { name: string; displayName: string; publisher: string; version: string }).displayName).toBe(
      'Generate Commit by Awadree (Unofficial)'
    );
    expect(packageJson.icon).toBe('assets/extension-icon.png');
    expect(existsSync(join(__dirname, '..', packageJson.icon))).toBe(true);
  });

  it('labels the generate action and gives it extension-owned icons', () => {
    const generateCommand = packageJson.contributes.commands.find(command => command.command === COMMANDS.generate);

    expect(generateCommand?.title).toBe('Generate Commit Message by Awadree');
    expect(generateCommand?.icon).toEqual({
      light: 'assets/commit-spark-light.svg',
      dark: 'assets/commit-spark-dark.svg'
    });
    expect(existsSync(join(__dirname, '..', 'assets', 'commit-spark-light.svg'))).toBe(true);
    expect(existsSync(join(__dirname, '..', 'assets', 'commit-spark-dark.svg'))).toBe(true);
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
    expect(packageJson.contributes.menus.commandPalette).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ command: COMMANDS.selectModel }),
        expect.objectContaining({ command: COMMANDS.selectReasoningEffort }),
      ])
    );
    expect(packageJson.contributes.menus).not.toHaveProperty('scm/repository');
    expect(packageJson.contributes.menus).not.toHaveProperty('scm/sourceControl');
    expect(packageJson.contributes.menus).not.toHaveProperty('codexCommit/scm/title');
    expect(packageJson.contributes.submenus).toBeUndefined();
    expect(packageJson.contributes.menus).not.toHaveProperty('gitlens/scm/title');
    expect(packageJson.contributes.menus).not.toHaveProperty('gitlens/scm/title/ai');
    expect(packageJson.contributes.configuration.properties).toHaveProperty('codexCommit.customInstructions');
    expect(packageJson.contributes.configuration.properties).toHaveProperty('codexCommit.model');
    expect(packageJson.contributes.configuration.properties).toHaveProperty('codexCommit.reasoningEffort');
    expect(packageJson.contributes.configuration.properties).not.toHaveProperty('codexCommit.webSearch');
    expect((packageJson.contributes.configuration.properties['codexCommit.model'] as { default: string }).default).toBe(
      'gpt-5.4-mini'
    );
    expect(
      (packageJson.contributes.configuration.properties['codexCommit.reasoningEffort'] as { default: string }).default
    ).toBe('low');
  });

  it('uses the Git repository input box and does not run git commit', () => {
    expect(extensionSource).toContain("getExtension<GitExtension>('vscode.git')");
    expect(extensionSource).toContain('gitRepository.inputBox.value = message');
    expect(extensionSource).toContain('vscode.scm.inputBox.value');
    expect(extensionSource).toContain('migrateConfiguration');
    expect(extensionSource).toContain('normalizeModel');
    expect(extensionSource).not.toContain('git commit');
  });
});
