export type HexColor = `#${string}`;

/** Near-black space, cool starlight, and a warm accretion ring. */
export const palette = {
  void: '#07080d',
  bgDeep: '#0b0d14',
  bg: '#10121c',
  bgRaised: '#181b29',
  bgHigh: '#252a3e',
  border: '#2c3248',
  fg: '#dce1ef',
  fgMuted: '#a2acc5',
  fgFaint: '#78839d',
  comment: '#7f8aa5',
  violet: '#b9a0f7',
  gold: '#edc182',
  string: '#b8caa0',
  ice: '#9dbfe9',
  rose: '#e4a3b5',
  cyan: '#95d2d5',
  nebula: '#d6b3d1',
  error: '#f08090',
  warning: '#edc182',
  info: '#9dbfe9',
  added: '#9bc5a5',
  brightGreen: '#bce0c2',
  brightGold: '#f5d9ac',
  brightIce: '#c0d7f5',
  brightViolet: '#d4bffc',
} as const satisfies Record<string, HexColor>;

/** VS Code uses #RRGGBBAA for translucent workbench colors. */
export function alpha(hex: HexColor, opacity: number): HexColor {
  if (!/^#[\da-f]{6}$/i.test(hex) || !Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    throw new Error(`Invalid alpha color: ${hex}, ${opacity}`);
  }
  return `${hex}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, '0')}`;
}
