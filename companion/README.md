<div align="center">
  <img src="media/icon.png" alt="Horizon Pulse: a gold and violet black hole" width="180" />
</div>

<br />

<h1 align="center">Horizon Pulse</h1>

<p align="center">A little gravity. A little rhythm. Inside your editor.</p>

<div align="center">

[![Install for VS Code](https://img.shields.io/badge/VS_Code-Install-edc182?style=for-the-badge&labelColor=10121c)][marketplace]
[![Version 0.1.1](https://img.shields.io/badge/Version-0.1.1-b9a0f7?style=for-the-badge&labelColor=10121c)][repository]
[![macOS 14.2+](https://img.shields.io/badge/macOS-14.2%2B-95d2d5?style=for-the-badge&labelColor=10121c)](#requirements)
[![License MIT](https://img.shields.io/badge/License-MIT-b8caa0?style=for-the-badge&labelColor=10121c)](LICENSE)

</div>

<br />

<p align="center">
  <strong>One capture toggle · 2.5× response · Local audio processing</strong>
</p>

<p align="center">
  Created by <a href="https://github.com/blink616">Hamiz Ali</a> · Publisher <code>blankmax</code>
</p>

<br />

---

<br />

## About

An audio-reactive black hole for Visual Studio Code by **Hamiz Ali**. A gold accretion disk reacts to bass, violet light follows the midrange, and particles respond to treble—all inside the bottom panel.

Horizon Pulse complements [Darkroom: Event Horizon](https://marketplace.visualstudio.com/items?itemName=blankmax.darkroom-theme) and works with any VS Code theme.

<br />

## Table of Contents

- [About](#about)
- [Requirements](#requirements)
- [Install and Use](#install-and-use)
- [Audio Permissions and Troubleshooting](#audio-permissions-and-troubleshooting)
- [Privacy](#privacy)
- [Frequently Asked Questions](#frequently-asked-questions)
- [Feedback](#feedback)
- [Development](#development)
- [License](#license)

<br />

## Requirements

- VS Code **1.85.0 or later**.
- **macOS 14.2 or later** for system-audio capture.
- A package matching your Mac's architecture: Apple Silicon (`darwin-arm64`) or Intel (`darwin-x64`).

Live audio capture is not supported on Windows or Linux. The extension runs on your local Mac when connected to a remote workspace.

<br />

## Install and Use

1. Open **Extensions** in VS Code, search for **Horizon Pulse**, and install it. For a downloaded `.vsix`, use **Extensions: Install from VSIX…** instead.
2. Run **Horizon Pulse: Open Visualizer** from the Command Palette.
3. Turn on the switch in the bottom-right corner and allow macOS system-audio access when prompted.
4. Play audio from an app on your Mac.
5. Turn the switch off to finish.

You can also install from your terminal:

```sh
code --install-extension blankmax.horizon-pulse
```

Response is fixed at **2.5×**. The visualization follows your system's reduced-motion preference, keeping audio-level feedback while stopping rotation and expansion.

Capture starts only when you request it. Hiding or closing the visualizer stops capture; reopening leaves it off. You can also stop capture using the active **Horizon Pulse** status-bar item or **Horizon Pulse: Stop System Audio**.

<br />

## Audio Permissions and Troubleshooting

macOS may identify the capture helper as **Horizon Audio** or its host, **Visual Studio Code**. Manage access in **System Settings → Privacy & Security → Screen & System Audio Recording**. Only system audio is requested; the extension does not capture your screen or microphone.

If the visualization does not respond, confirm that audio is playing and system-audio access is enabled. After changing permissions or your output device, stop and restart capture. Some sources may restrict capture. Hover over the capture switch for the current status or error message.

System audio includes other app sounds and notifications, as well as music.

<br />

## Privacy

Audio is processed locally in memory. The native helper sends the visualizer only four normalized measurements: bass, midrange, treble, and overall intensity. Audio is never recorded, saved, or uploaded. There are no accounts, cloud services, analytics, or network requests.

<br />

## Frequently Asked Questions

### Does it need Darkroom: Event Horizon?

No. Horizon Pulse works with any VS Code theme.

### Does capture restart when I reopen the panel?

No. Turn the capture switch on whenever you want to resume.

### Can I change the response or turn on reduced motion?

Response is fixed at **2.5×**. Motion follows your system preference automatically; there are no sliders or extra settings.

### Does it use my microphone?

No. It analyzes system audio only, including music, app sounds, and notifications.

<br />

## Feedback

Report issues on [GitHub](https://github.com/blink616/event-horizon-vscode/issues). Include your macOS version, Mac architecture, VS Code version, and any capture error shown in the switch tooltip.

<br />

## Development

From the repository root, use Node.js **22 or later**, pnpm **10.31.0**, and Apple's Command Line Tools:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm pulse:build
pnpm pulse:check
pnpm pulse:package
```

Select **Preview Horizon Pulse** in Run and Debug, then run **Horizon Pulse: Open Visualizer** in the development host.

The build compiles the Swift helper for the current Mac architecture, applies an ad-hoc signature, and runs native DSP checks without requesting audio access. Packaging creates an architecture-specific VSIX in `dist/`. On other platforms, `pnpm pulse:build --web-only` builds the extension and visualizer without the native helper.

Local builds use ad-hoc signing. A public native release still requires Developer ID signing and notarization, plus capture and permission checks on each supported Mac architecture. Rebuilding or changing the helper's signature can require permission again.

<br />

## License

[MIT](LICENSE) · Copyright © 2026 Hamiz Ali

<br />

<p align="center">
  Made by <a href="https://github.com/blink616">Hamiz Ali</a> · Inspired by the event horizon.
</p>

[marketplace]: https://marketplace.visualstudio.com/items?itemName=blankmax.horizon-pulse
[repository]: https://github.com/blink616/event-horizon-vscode
