export interface Levels {
  bass: number;
  mid: number;
  treble: number;
  level: number;
}

export type CaptureStatus = 'stopped' | 'starting' | 'listening' | 'error';
export type HostMessage =
  | { type: 'levels'; levels: Levels }
  | { type: 'status'; status: CaptureStatus; message: string; supported: boolean };
export type HelperMessage =
  { type: 'ready' } | { type: 'levels'; levels: Levels } | { type: 'error'; message: string };

/** Only numeric summaries cross the native/extension boundary. */
export function parseHelperMessage(line: string): HelperMessage | undefined {
  try {
    const value: unknown = JSON.parse(line);
    if (!value || typeof value !== 'object' || !('type' in value)) return;
    if (value.type === 'ready') return { type: 'ready' };
    if (value.type === 'error' && 'message' in value && typeof value.message === 'string') {
      return { type: 'error', message: value.message.slice(0, 500) };
    }
    if (value.type !== 'levels' || !('levels' in value)) return;
    const levels = value.levels;
    if (!levels || typeof levels !== 'object') return;
    for (const key of ['bass', 'mid', 'treble', 'level'] as const) {
      if (!(key in levels)) return;
      const number = (levels as Record<string, unknown>)[key];
      if (typeof number !== 'number' || !Number.isFinite(number) || number < 0 || number > 1)
        return;
    }
    const checked = levels as Levels;
    return {
      type: 'levels',
      levels: {
        bass: checked.bass,
        mid: checked.mid,
        treble: checked.treble,
        level: checked.level,
      },
    };
  } catch {
    return;
  }
}
