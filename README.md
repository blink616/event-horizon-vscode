# Darkroom: Event Horizon

A black hole inspired VS Code theme. Near-black panels recede around a cool, readable editor. Gold functions trace the accretion ring; violet control flow and icy types give the code its structure.

## Palette

| Role                                     | Color     |
| ---------------------------------------- | --------- |
| Outer space · title and status bars      | `#07080d` |
| Deep space · sidebar and terminal        | `#0b0d14` |
| Editor                                   | `#10121c` |
| Starlight · text                         | `#dce1ef` |
| Accretion · functions and cursor         | `#edc182` |
| Violet · keywords                        | `#b9a0f7` |
| Ice · types and classes                  | `#9dbfe9` |
| Cyan · variables and parameters          | `#95d2d5` |
| Nebula · properties and keys             | `#d6b3d1` |
| Dust · strings                           | `#b8caa0` |
| Redshift · numbers and literal constants | `#e4a3b5` |
| Distant light · comments                 | `#7f8aa5` |

Includes workbench, terminal ANSI, Git/diff, diagnostics, TextMate scopes, and semantic tokens. Base syntax colors, including comments and punctuation, are checked for at least 4.5:1 contrast against the editor background. This is a targeted contrast check, not a full accessibility certification; overlays and extension-provided UI can change the result.

## Try the draft

Use Node.js 22 or later and pnpm 10.31.0.

```sh
pnpm install --frozen-lockfile
pnpm build
```

Open this project in VS Code and press **F5** to launch **Preview Event Horizon**. The demo workspace selects the theme automatically. Open `horizon.ts`, then compare the HTML, CSS, JSON, Python, and Markdown samples. Use **Developer: Inspect Editor Tokens and Scopes** to inspect syntax colors.

To try it in your everyday workspace:

```sh
pnpm package
code --install-extension dist/darkroom-theme-0.1.0.vsix
```

Select **Darkroom: Event Horizon** under **Preferences: Color Theme**.

## Develop

The theme build source is TypeScript. VS Code consumes the generated JSON directly; the extension has no runtime code, activation hooks, network requests, or production dependencies.

- `src/palette.ts`: named colors and transparency helper.
- `src/workbench.ts`: UI colors.
- `src/syntax.ts`: TextMate and semantic token styles.
- `src/theme.ts`: theme definition.
- `src/build.ts`: deterministic JSON and PNG generation.
- `src/icon.svg`: editable vector source for the package icon.
- `themes/darkroom-color-theme.json`: committed generated theme; do not edit directly.

```sh
pnpm watch         # Rebuild on TypeScript source changes
pnpm build         # Regenerate the theme and icon (also after SVG edits)
pnpm format        # Format source and documentation
pnpm check         # Types, formatting, generated-file drift, and contrast tests
pnpm package       # Validate and create a VSIX in dist/
```

The Extension Development Host reloads the generated theme as it changes. Keep the generated JSON and icon committed alongside their sources. Packaging uses an explicit allowlist: only the manifest, theme, icon, README, changelog, and license ship.

## Optional music visualization

**Horizon Pulse** lives in `companion/` and ships as a separate extension. It provides a black-hole visualizer with local system-audio capture on macOS 14.2+, an audio-free animation preview, explicit start/stop controls, and reduced motion. It never uses the microphone. See `companion/README.md` for setup and permissions.

```sh
pnpm pulse:build
pnpm pulse:check
pnpm pulse:package
```

Select **Preview Horizon Pulse** in Run and Debug to load both extensions. The regular `pnpm package` command still packages only the theme.

## Before publishing

This is a local draft, not a Marketplace release. Add your real Marketplace `publisher` and public `repository` URL to `package.json`, fill in the license copyright holder, capture actual VS Code screenshots, and review the changelog and version before publishing. No invented publisher identity or repository URL is included. The package command permits a missing repository for local previews; remove that allowance when preparing the public release.

See the official [color theme guide](https://code.visualstudio.com/api/extension-guides/color-theme) and [publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).

## License

MIT. See `LICENSE`.
