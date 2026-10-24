// Draws the app icons and iPhone launch screens from scripts/flame.svg, using Chrome to turn them into PNGs.
// Run it again after changing the flame: `node scripts/make-images.mjs`.
// iPhone only picks up a new icon or launch screen when Kindling is removed and added to the home screen again.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => p && existsSync(p));
if (!CHROME) throw new Error('Chrome not found. Set CHROME to its path.');

const svg = readFileSync('scripts/flame.svg', 'utf8');
/** The flame in other colours: its outer and inner shapes. */
const flame = (outer = '#fff4e6', inner = '#f29c58') => svg.replace('#fff4e6', outer).replace('#f29c58', inner);
const work = mkdtempSync(join(tmpdir(), 'kindling-images-'));

/** Renders a page of HTML to a PNG of the given size (in CSS pixels, times the pixel ratio). */
function render(html, out, width, height, scale = 1) {
  const page = join(work, 'page.html');
  writeFileSync(page, `<!doctype html><html><body style="margin:0;overflow:hidden">${html}</body></html>`);
  execFileSync(CHROME, [
    '--headless=new', '--hide-scrollbars', '--disable-gpu', `--force-device-scale-factor=${scale}`,
    `--window-size=${width},${height}`, `--screenshot=${join(process.cwd(), out)}`, pathToFileURL(page).href,
  ], { stdio: 'ignore' });
}

// --- App icons: the flame on a warm gradient. iPhone rounds the corners itself. ---
const icon = (size) => `<div style="width:${size}px;height:${size}px;background:linear-gradient(160deg,#f7b26f,#ee8a3c);display:grid;place-items:center">
  <div style="width:${size * 0.78}px;height:${size * 0.78}px">${flame()}</div></div>`;
for (const [file, size] of [['icon-512.png', 512], ['icon-192.png', 192], ['apple-touch-icon.png', 180]]) {
  render(icon(size), `public/${file}`, size, size);
}

// --- Launch screens: the orange flame on white (Kindling is always light). ---
// Each iPhone screen size needs its own image: [width, height, pixel ratio] in portrait.
const SCREENS = [
  [440, 956, 3], [430, 932, 3], [428, 926, 3], [420, 912, 3], [414, 896, 3], [414, 896, 2],
  [402, 874, 3], [393, 852, 3], [390, 844, 3], [375, 812, 3], [375, 667, 2], [320, 568, 2],
];
mkdirSync('public/splash', { recursive: true });
const links = [];
for (const [w, h, dpr] of SCREENS) {
  const file = `splash/${w}x${h}@${dpr}.png`;
  render(`<div style="width:${w}px;height:${h}px;background:#ffffff;display:grid;place-items:center">
    <div style="width:120px;height:120px">${flame('#f47b30', '#fbc396')}</div></div>`,
  `public/${file}`, w, h, dpr);
  const media = `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`;
  links.push(`  <link rel="apple-touch-startup-image" media="${media}" href="/kindling/${file}">`);
}
console.log('Images written. Launch-screen tags for index.html:\n' + links.join('\n'));
