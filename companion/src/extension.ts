import * as vscode from 'vscode';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { release } from 'node:os';
import { AudioCapture } from './capture.js';
import type { CaptureStatus, HostMessage } from './protocol.js';

class PulseView implements vscode.WebviewViewProvider, vscode.Disposable {
  private view: vscode.WebviewView | undefined;
  private status: CaptureStatus = 'stopped';
  private message = 'Audio capture is off.';
  private readonly supported =
    process.platform === 'darwin' && Number(release().split('.')[0]) >= 23;
  private readonly capture: AudioCapture;
  private readonly statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    10,
  );

  constructor(private readonly context: vscode.ExtensionContext) {
    const helper = vscode.Uri.joinPath(
      context.extensionUri,
      'dist/native/HorizonAudio.app/Contents/MacOS/horizon-audio',
    ).fsPath;
    this.capture = new AudioCapture(() => spawn(helper, [], { stdio: ['pipe', 'pipe', 'pipe'] }), {
      status: (status, message) => {
        this.status = status;
        this.message = message;
        if (status === 'starting' || status === 'listening') {
          this.statusBar.text =
            status === 'starting' ? '$(loading~spin) Horizon Pulse' : '$(unmute) Horizon Pulse';
          this.statusBar.tooltip = 'System audio capture is active. Click to stop.';
          this.statusBar.show();
        } else this.statusBar.hide();
        this.sendStatus();
      },
      levels: (levels) => this.send({ type: 'levels', levels }),
    });
    this.statusBar.command = 'horizonPulse.stop';
    this.statusBar.name = 'Horizon Pulse audio capture';
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    const media = vscode.Uri.joinPath(this.context.extensionUri, 'media');
    const dist = vscode.Uri.joinPath(this.context.extensionUri, 'dist');
    view.webview.options = { enableScripts: true, localResourceRoots: [media, dist] };
    const nonce = randomBytes(24).toString('base64');
    const script = view.webview.asWebviewUri(vscode.Uri.joinPath(dist, 'visualizer.js'));
    const style = view.webview.asWebviewUri(vscode.Uri.joinPath(media, 'visualizer.css'));
    view.webview.html = readFileSync(vscode.Uri.joinPath(media, 'index.html').fsPath, 'utf8')
      .replaceAll('{{cspSource}}', view.webview.cspSource)
      .replaceAll('{{nonce}}', nonce)
      .replaceAll('{{script}}', script.toString())
      .replaceAll('{{style}}', style.toString());
    const subscriptions = [
      view.webview.onDidReceiveMessage((message: unknown) => {
        if (!message || typeof message !== 'object' || !('type' in message)) return;
        if (message.type === 'ready') this.sendStatus();
        if (message.type === 'start' && view.visible) {
          if (!this.supported) {
            this.status = 'error';
            this.message = 'System audio requires macOS 14.2 or later.';
            this.sendStatus();
          } else this.capture.start();
        }
        if (message.type === 'stop') this.stop();
      }),
      view.onDidChangeVisibility(() => {
        if (!view.visible)
          this.capture.stop('Paused because the visualizer is hidden. Start to resume.');
        else this.sendStatus();
      }),
    ];
    view.onDidDispose(() => {
      this.view = undefined;
      this.capture.stop();
      subscriptions.forEach((subscription) => subscription.dispose());
    });
  }

  stop(): void {
    this.capture.stop();
  }

  dispose(): void {
    this.capture.dispose();
    this.statusBar.dispose();
  }

  private send(message: HostMessage): void {
    if (this.view?.visible) void this.view.webview.postMessage(message);
  }

  private sendStatus(): void {
    this.send({
      type: 'status',
      status: this.status,
      message: this.message,
      supported: this.supported,
    });
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const provider = new PulseView(context);
  context.subscriptions.push(
    provider,
    vscode.window.registerWebviewViewProvider('horizonPulse.visualizer', provider),
    vscode.commands.registerCommand('horizonPulse.open', () =>
      vscode.commands.executeCommand('horizonPulse.visualizer.focus'),
    ),
    vscode.commands.registerCommand('horizonPulse.stop', () => provider.stop()),
  );
}
