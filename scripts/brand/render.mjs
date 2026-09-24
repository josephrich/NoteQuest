// Regenerates every logo and icon file from design.mjs.
// Usage: node scripts/brand/render.mjs   (PNG output needs Playwright: npm i -D playwright)
import { writeFileSync, mkdirSync } from 'node:fs';
import { icon, markSvg, BOX } from './design.mjs';

const root = new URL('../../', import.meta.url).pathname;
const out = (p) => root + p;

// Vector files used directly by the app.
writeFileSync(out('public/logo-mark.svg'), markSvg());
writeFileSync(out('public/favicon.svg'), icon(512));

// Launch screen: the mark on the app's cream background.
function splash(size) {
  const frac = 0.24;
  const s = (size * frac) / BOX.h;
  const tx = (size - BOX.w * s) / 2 - BOX.x * s;
  const ty = (size - BOX.h * s) / 2 - BOX.y * s;
  const inner = markSvg().replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#fff8ec"/><g transform="translate(${tx} ${ty}) scale(${s})">${inner}</g></svg>`;
}

const pngs = [
  ['public/icon-192.png', icon(192)],
  ['public/icon-512.png', icon(512)],
  ['public/icon-maskable-512.png', icon(512, 0.66)],
  ['public/apple-touch-icon.png', icon(180)],
  ['ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', icon(1024)],
  ...['', '-1', '-2'].map((suffix) => [`ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732${suffix}.png`, splash(2732)]),
];

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.log('Wrote SVGs. Install Playwright (npm i -D playwright) to also render the PNG icons.');
  process.exit(0);
}
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage();
for (const [path, svg] of pngs) {
  const size = Number(svg.match(/width="(\d+)"/)[1]);
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>body{margin:0}</style>${svg}`);
  mkdirSync(out(path).replace(/[^/]+$/, ''), { recursive: true });
  // JPEG-free PNG without transparency: the icons all have solid backgrounds.
  await page.screenshot({ path: out(path), omitBackground: false });
  console.log('wrote', path);
}
await browser.close();
