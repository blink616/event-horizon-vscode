import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { format, resolveConfig } from 'prettier';
import { theme } from './theme.js';

const root = new URL('../', import.meta.url);
const themePath = new URL('themes/darkroom-color-theme.json', root);
const iconPath = new URL('images/icon.png', root);
const bannerPath = new URL('images/banner.png', root);
const svg = await readFile(new URL('src/icon.svg', root), 'utf8');
const icon = new Resvg(svg).render().asPng();
const bannerSvg = await readFile(new URL('src/banner.svg', root), 'utf8');
const banner = new Resvg(bannerSvg).render().asPng();
const json = await format(JSON.stringify(theme), {
  ...(await resolveConfig(fileURLToPath(themePath))),
  parser: 'json',
});

if (process.argv.includes('--check')) {
  const [currentTheme, currentIcon, currentBanner] = await Promise.all([
    readFile(themePath, 'utf8'),
    readFile(iconPath),
    readFile(bannerPath),
  ]);
  if (currentTheme !== json || !currentIcon.equals(icon) || !currentBanner.equals(banner)) {
    throw new Error('Generated assets are stale. Run pnpm build.');
  }
  console.log('Generated theme and icon are up to date.');
} else {
  await Promise.all([
    mkdir(new URL('themes/', root), { recursive: true }),
    mkdir(new URL('images/', root), { recursive: true }),
    mkdir(new URL('dist/', root), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(themePath, json),
    writeFile(iconPath, icon),
    writeFile(bannerPath, banner),
  ]);
  console.log(
    `Built ${theme.name}: ${Object.keys(theme.colors).length} UI colors, ${theme.tokenColors.length} syntax rules.`,
  );
}
