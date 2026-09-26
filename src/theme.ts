import { colors } from './workbench.js';
import { semanticTokenColors, tokenColors } from './syntax.js';
import type { ColorTheme } from './types.js';

export const theme = {
  $schema: 'vscode://schemas/color-theme',
  name: 'Darkroom: Event Horizon',
  type: 'dark',
  semanticHighlighting: true,
  colors,
  tokenColors,
  semanticTokenColors,
} satisfies ColorTheme;
