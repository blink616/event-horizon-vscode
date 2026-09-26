import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { parseHelperMessage, type CaptureStatus, type Levels } from './protocol.js';

interface CaptureEvents {
  status: (status: CaptureStatus, message: string) => void;
  levels: (levels: Levels) => void;
}

/** Owns one helper process; closing its input also terminates orphaned capture. */
export class AudioCapture {
  private child: ChildProcessWithoutNullStreams | undefined;
  private stopping = false;
  private disposed = false;
  private watchdog: ReturnType<typeof setInterval> | undefined;
  private killTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly launch: () => ChildProcessWithoutNullStreams,
    private readonly events: CaptureEvents,
  ) {}

  start(): void {
    if (this.child || this.disposed) return;
    this.stopping = false;
    this.events.status(
      'starting',
      'Allow system audio when macOS asks. Microphone access is not used.',
    );
    let child: ChildProcessWithoutNullStreams;
    try {
      child = this.launch();
    } catch {
      this.events.status(
        'error',
        'Audio helper could not launch. Rebuild or reinstall Horizon Pulse.',
      );
      return;
    }
    this.child = child;
    let buffer = '';
    let lastMessage = Date.now();
    let failed = false;
    const fail = (message: string) => {
      if (this.child !== child || this.stopping || failed) return;
      failed = true;
      this.events.status('error', message);
      this.terminate(child);
    };
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      if (this.child !== child || this.stopping || failed) return;
      buffer += chunk;
      if (buffer.length > 16_384) return fail('The audio helper returned an invalid response.');
      let newline: number;
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        const message = parseHelperMessage(line);
        if (!message) return fail('The audio helper returned an invalid response.');
        lastMessage = Date.now();
        if (message.type === 'error') return fail(message.message);
        if (message.type === 'ready') this.events.status('listening', 'Listening to system audio.');
        if (message.type === 'levels') this.events.levels(message.levels);
      }
    });
    // Drain diagnostics without retaining audio, environment data, or user paths.
    child.stderr.resume();
    child.stdin.on('error', () => {}); // Closing stdin can race with native exit.
    child.on('error', () =>
      fail('Audio helper could not launch. Rebuild or reinstall Horizon Pulse.'),
    );
    child.on('close', () => {
      if (this.child !== child) return;
      this.clearTimers();
      this.child = undefined;
      if (!failed && !this.stopping)
        this.events.status('error', 'System audio capture ended. Start again to reconnect.');
    });
    this.watchdog = setInterval(() => {
      if (Date.now() - lastMessage > 60_000)
        fail('Audio capture did not respond. Check system-audio permission, then try again.');
    }, 5_000);
    this.watchdog.unref();
  }

  stop(message = 'Audio capture is off.'): void {
    this.stopping = true;
    if (this.child) this.terminate(this.child);
    this.events.status('stopped', message);
  }

  dispose(): void {
    this.disposed = true;
    this.stop();
  }

  private terminate(child: ChildProcessWithoutNullStreams): void {
    this.clearTimers();
    child.stdin.end();
    child.kill('SIGTERM');
    this.killTimer = setTimeout(() => {
      if (this.child === child) child.kill('SIGKILL');
    }, 2_000);
    this.killTimer.unref();
  }

  private clearTimers(): void {
    clearInterval(this.watchdog);
    clearTimeout(this.killTimer);
    this.watchdog = undefined;
    this.killTimer = undefined;
  }
}
