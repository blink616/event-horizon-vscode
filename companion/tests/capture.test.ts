import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { AudioCapture } from '../src/capture.js';
import { parseHelperMessage } from '../src/protocol.js';

const fixture = fileURLToPath(new URL('./helper-fixture.ts', import.meta.url));

test('protocol accepts bounded summaries and rejects malformed or non-finite input', () => {
  assert.deepEqual(parseHelperMessage('{"type":"ready"}'), { type: 'ready' });
  for (const input of [
    'no json',
    'null',
    '{}',
    '{"type":"levels","levels":null}',
    '{"type":"levels","levels":{"bass":1e999,"mid":0,"treble":0,"level":0}}',
    '{"type":"levels","levels":{"bass":-1,"mid":0,"treble":0,"level":0}}',
  ]) {
    assert.equal(parseHelperMessage(input), undefined);
  }
  const parsed = parseHelperMessage(
    '{"type":"levels","levels":{"bass":1,"mid":0.5,"treble":0,"level":0.2,"unexpected":"discard"}}',
  );
  assert.deepEqual(parsed, {
    type: 'levels',
    levels: { bass: 1, mid: 0.5, treble: 0, level: 0.2 },
  });
});

test(
  'capture reassembles split messages, prevents duplicate processes, and stops cleanly',
  { timeout: 10_000 },
  async () => {
    let child: ChildProcessWithoutNullStreams | undefined;
    let closed: Promise<unknown> | undefined;
    let starts = 0;
    const statuses: string[] = [];
    let received!: () => void;
    const gotLevels = new Promise<void>((resolve) => {
      received = resolve;
    });
    const capture = new AudioCapture(
      () => {
        starts++;
        child = spawn(process.execPath, ['--import', 'tsx', fixture, 'normal']);
        closed = once(child, 'close');
        return child;
      },
      {
        status: (status) => statuses.push(status),
        levels: (levels) => {
          assert.equal(levels.bass, 0.4);
          received();
        },
      },
    );
    try {
      capture.start();
      capture.start();
      await gotLevels;
      assert.equal(starts, 1);
      assert.deepEqual(statuses, ['starting', 'listening']);
      capture.stop();
      await closed;
      assert.equal(statuses.at(-1), 'stopped');
      assert.ok(child?.exitCode !== null || child?.signalCode !== null);
      capture.dispose();
      capture.start();
      assert.equal(starts, 1);
    } finally {
      capture.dispose();
      child?.kill('SIGKILL');
    }
  },
);

for (const scenario of ['invalid', 'oversize', 'exit']) {
  test(
    `capture handles ${scenario} output/exit without leaving a child running`,
    { timeout: 10_000 },
    async () => {
      let child: ChildProcessWithoutNullStreams | undefined;
      let closed: Promise<unknown> | undefined;
      const statuses: string[] = [];
      const capture = new AudioCapture(
        () => {
          child = spawn(process.execPath, ['--import', 'tsx', fixture, scenario]);
          closed = once(child, 'close');
          return child;
        },
        {
          status: (status) => statuses.push(status),
          levels: () => assert.fail('Unexpected levels'),
        },
      );
      try {
        capture.start();
        await closed;
        assert.ok(statuses.includes('error'));
      } finally {
        capture.dispose();
        child?.kill('SIGKILL');
      }
    },
  );
}

test('launch failure is actionable and does not retain a running state', () => {
  const statuses: string[] = [];
  const capture = new AudioCapture(
    () => {
      throw new Error('unavailable');
    },
    {
      status: (status) => statuses.push(status),
      levels: () => assert.fail(),
    },
  );
  capture.start();
  assert.deepEqual(statuses, ['starting', 'error']);
  capture.dispose();
});
