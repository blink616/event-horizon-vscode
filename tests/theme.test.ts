import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { alpha, type HexColor } from '../src/palette.js';
import { theme } from '../src/theme.js';
import type { ColorTheme } from '../src/types.js';

function luminance(hex: HexColor): number {
  assert.match(hex, /^#[\da-f]{6}$/i);
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

function assertContrast(foreground: HexColor, background: HexColor, label: string): void {
  const a = luminance(foreground);
  const b = luminance(background);
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  assert.ok(ratio >= 4.5, `${label}: ${ratio.toFixed(2)}:1 is below 4.5:1`);
}

test('every base syntax foreground meets 4.5:1 on the editor surface', () => {
  for (const rule of theme.tokenColors) {
    assertContrast(rule.settings.foreground, theme.colors['editor.background'], rule.name);
  }
  const typedTheme: ColorTheme = theme;
  for (const [selector, style] of Object.entries(typedTheme.semanticTokenColors)) {
    const foreground = typeof style === 'string' ? style : style.foreground;
    if (foreground) assertContrast(foreground, theme.colors['editor.background'], selector);
  }
});

test('primary workbench text remains readable on its own surface', () => {
  const pairs = [
    ['editor.foreground', 'editor.background'],
    ['sideBar.foreground', 'sideBar.background'],
    ['statusBar.foreground', 'statusBar.background'],
    ['terminal.foreground', 'terminal.background'],
    ['button.foreground', 'button.background'],
    ['input.foreground', 'input.background'],
    ['list.activeSelectionForeground', 'list.activeSelectionBackground'],
  ] as const;
  for (const [foreground, background] of pairs) {
    assertContrast(theme.colors[foreground], theme.colors[background], foreground);
  }
});

test('theme values use valid VS Code hex formats', () => {
  for (const [key, value] of Object.entries(theme.colors)) {
    assert.match(value, /^#[\da-f]{6}([\da-f]{2})?$/i, key);
  }
});

test('translucent overlays retain an alpha channel', () => {
  for (const key of [
    'editor.selectionBackground',
    'editor.wordHighlightBackground',
    'diffEditor.insertedTextBackground',
    'diffEditor.removedTextBackground',
  ] as const) {
    assert.equal(theme.colors[key].length, 9, key);
    assert.notEqual(theme.colors[key].slice(-2), 'ff', key);
  }
  assert.equal(alpha('#10121c', 0), '#10121c00');
  assert.equal(alpha('#10121c', 1), '#10121cff');
  assert.throws(() => alpha('#10121c', Number.NaN));
  assert.throws(() => alpha('#10121c', 2));
});

test('manifest points to the generated theme and ships no extension runtime', async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(manifest.contributes.themes.length, 1);
  const contribution = manifest.contributes.themes[0];
  assert.equal(contribution.label, theme.name);
  assert.equal(contribution.uiTheme, 'vs-dark');
  const generated = JSON.parse(
    await readFile(new URL(`../${contribution.path}`, import.meta.url), 'utf8'),
  );
  assert.deepEqual(generated, theme);
  assert.equal(manifest.main, undefined);
  assert.equal(manifest.activationEvents, undefined);
  assert.equal(manifest.dependencies, undefined);
});
