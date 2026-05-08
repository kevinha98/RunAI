// generate-icons.mjs
// Generates all required PNG icon sizes from the SVG using Playwright
// Run: node generate-icons.mjs

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ASSETS = join(__dirname, 'apps', 'mobile', 'assets');
const RENDER_HTML = join(ASSETS, '_render.html');

const SIZES = [
  { name: 'icon',          w: 1024, h: 1024, desc: 'iOS App Store / Expo default' },
  { name: 'adaptive-icon', w: 1024, h: 1024, desc: 'Android adaptive foreground' },
  { name: 'splash',        w: 2048, h: 2048, desc: 'Expo splash (padded)', splash: true },
  { name: 'favicon',       w:   32, h:   32, desc: 'Web favicon' },
  { name: 'icon-192',      w:  192, h:  192, desc: 'PWA 192' },
  { name: 'icon-512',      w:  512, h:  512, desc: 'PWA 512' },
];

// Splash has a lot of padding around the icon so it looks good on all screens
const SPLASH_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 2048" width="2048" height="2048">
  <rect width="2048" height="2048" fill="#0a0b10"/>
  <g transform="translate(512 512)">
    <defs>
      <linearGradient id="fg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#38bdf8"/>
        <stop offset="100%" stop-color="#818cf8"/>
      </linearGradient>
      <linearGradient id="border" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#38bdf8"/>
        <stop offset="100%" stop-color="#818cf8"/>
      </linearGradient>
    </defs>
    <rect width="1024" height="1024" rx="220" fill="#111218"/>
    <rect x="28" y="28" width="968" height="968" rx="196" fill="none" stroke="url(#border)" stroke-width="4" opacity="0.22"/>
    <text x="512" y="798" text-anchor="middle"
      font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif"
      font-weight="800" font-size="760" fill="url(#fg)">R</text>
  </g>
</svg>`;

async function run() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ deviceScaleFactor: 1 });

  for (const size of SIZES) {
    const page = await ctx.newPage();
    await page.setViewportSize({ width: size.w, height: size.h });

    if (size.splash) {
      await page.setContent(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>*{margin:0;padding:0;}html,body{width:${size.w}px;height:${size.h}px;overflow:hidden;background:#0a0b10;}</style></head><body>${SPLASH_SVG}</body></html>`);
    } else {
      // Scale the 1024px render to target size via CSS
      await page.setContent(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>*{margin:0;padding:0;}html,body{width:${size.w}px;height:${size.h}px;overflow:hidden;background:transparent;}</style></head><body>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${size.w}" height="${size.h}">
        <defs>
          <linearGradient id="fg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#818cf8"/>
          </linearGradient>
          <linearGradient id="border" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#818cf8"/>
          </linearGradient>
        </defs>
        <rect width="1024" height="1024" rx="220" fill="#0a0b10"/>
        <rect x="28" y="28" width="968" height="968" rx="196" fill="none" stroke="url(#border)" stroke-width="4" opacity="0.22"/>
        <text x="512" y="798" text-anchor="middle"
          font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif"
          font-weight="800" font-size="760" fill="url(#fg)">R</text>
      </svg>
      </body></html>`);
    }

    await page.waitForTimeout(200);

    const out = join(ASSETS, `${size.name}.png`);
    await page.screenshot({ path: out, omitBackground: !size.splash });
    console.log(`✓ ${size.name}.png  (${size.w}×${size.h})  — ${size.desc}`);
    await page.close();
  }

  await browser.close();
  console.log('\nAll icons generated in apps/mobile/assets/');
}

run().catch(err => { console.error(err); process.exit(1); });
