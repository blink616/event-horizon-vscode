import type { HexColor } from './palette.js';

export type TokenStyle = '' | 'italic' | 'bold' | 'underline' | 'strikethrough';

export interface TokenRule {
  name: string;
  scope: string[];
  settings: { foreground: HexColor; fontStyle?: TokenStyle };
}

export interface SemanticStyle {
  foreground?: HexColor;
  italic?: boolean;
  bold?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

export interface ColorTheme {
  $schema: string;
  name: string;
  type: 'dark';
  semanticHighlighting: boolean;
  colors: Record<string, HexColor>;
  tokenColors: TokenRule[];
  semanticTokenColors: Record<string, HexColor | SemanticStyle>;
}
