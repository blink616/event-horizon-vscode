/** A bass onset must clear the running average by this ratio plus a fixed floor. */
const RATIO = 1.3;
const FLOOR = 0.05;
/** Time constant of the running bass average. */
const AVERAGE_MS = 600;
/** Minimum spacing between beats; faster than ~330 BPM is treated as one hit. */
const REFRACTORY_MS = 180;
/** Kick envelope decay; about 5% remains after 300 ms. */
const DECAY_MS = 100;

/** Detects kicks in the smoothed bass band, which arrives at about 20 Hz. */
export class BeatDetector {
  /** Strength of the most recent beat, 0–1. */
  strength = 0;
  private average = 0;
  private previous = 0;
  private lastSample: number | undefined;
  private lastBeat = -Infinity;

  /** Records one bass reading and reports whether it starts a beat. */
  sample(bass: number, now: number): boolean {
    if (this.lastSample === undefined) this.average = bass;
    const dt = Math.max(0, now - (this.lastSample ?? now));
    this.lastSample = now;
    const beat =
      bass > this.average * RATIO + FLOOR &&
      bass > this.previous &&
      now - this.lastBeat >= REFRACTORY_MS;
    if (beat) {
      this.lastBeat = now;
      this.strength = Math.min(1, 0.35 + (bass - this.average) / 0.6);
    }
    this.average += (bass - this.average) * (1 - Math.exp(-dt / AVERAGE_MS));
    this.previous = bass;
    return beat;
  }

  /** Envelope of the most recent beat: its strength at the hit, decaying to zero. */
  kick(now: number): number {
    const age = now - this.lastBeat;
    return age < 0 || !Number.isFinite(age) ? 0 : this.strength * Math.exp(-age / DECAY_MS);
  }

  reset(): void {
    this.strength = 0;
    this.previous = 0;
    this.lastSample = undefined;
    this.lastBeat = -Infinity;
  }
}
