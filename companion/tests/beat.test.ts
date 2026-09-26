import assert from 'node:assert/strict';
import test from 'node:test';
import { BeatDetector } from '../src/webview/beat.js';

/** Feeds a 20 Hz stream, matching the helper's update rate. Returns beat timestamps. */
function feed(detector: BeatDetector, values: number[], start = 0): number[] {
  const beats: number[] = [];
  values.forEach((bass, i) => {
    const now = start + i * 50;
    if (detector.sample(bass, now)) beats.push(now);
  });
  return beats;
}

test('steady bass settles without triggering beats', () => {
  const detector = new BeatDetector();
  feed(detector, Array(20).fill(0.4));
  assert.deepEqual(feed(detector, Array(60).fill(0.4), 1000), []);
});

test('silence and faint noise never count as beats', () => {
  const detector = new BeatDetector();
  const noise = Array.from({ length: 80 }, (_, i) => (i % 2 ? 0.01 : 0.03));
  assert.deepEqual(feed(detector, noise), []);
});

test('a clear bass jump is a beat with strength scaled by its size', () => {
  const soft = new BeatDetector();
  feed(soft, Array(40).fill(0.2));
  assert.equal(soft.sample(0.45, 2000), true);
  const hard = new BeatDetector();
  feed(hard, Array(40).fill(0.2));
  assert.equal(hard.sample(0.9, 2000), true);
  assert.ok(soft.strength > 0 && soft.strength < hard.strength && hard.strength <= 1);
});

test('a second spike inside the refractory window is ignored', () => {
  const detector = new BeatDetector();
  feed(detector, Array(40).fill(0.2));
  assert.equal(detector.sample(0.8, 2000), true);
  detector.sample(0.2, 2050);
  assert.equal(detector.sample(0.8, 2100), false);
  feed(detector, Array(6).fill(0.2), 2150);
  assert.equal(detector.sample(0.8, 2450), true);
});

test('a steady kick pattern is tracked beat for beat', () => {
  const detector = new BeatDetector();
  // 120 BPM: a kick every 500 ms (10 samples) over a 0.2 floor.
  const pattern = Array.from({ length: 200 }, (_, i) => (i % 10 === 0 ? 0.8 : 0.2));
  const beats = feed(detector, pattern);
  assert.ok(beats.length >= 18, `expected ~20 beats, got ${beats.length}`);
});

test('kick is zero before any beat, peaks at the beat, and fades within ~300 ms', () => {
  const detector = new BeatDetector();
  assert.equal(detector.kick(0), 0);
  feed(detector, Array(40).fill(0.2));
  detector.sample(0.9, 2000);
  assert.ok(detector.kick(2000) > 0.95);
  assert.ok(detector.kick(2100) < detector.kick(2000));
  assert.ok(detector.kick(2300) < 0.1);
});
