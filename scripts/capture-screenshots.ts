// scripts/capture-screenshots.ts
// Captures README demo screenshots via Playwright by driving the dev-mode
// window.__releaseWeapon hook (same pattern as bomb-smoke.ts). Does not
// require ws-server — bomb pipeline is triggered directly against the store.
//
// Usage: bun scripts/capture-screenshots.ts
//   APP_URL=http://localhost:3000 (default)
//   OUT_DIR=docs/screenshots          (default)

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';
const APP_ORIGIN = new URL(APP_URL).origin;
const OUT_DIR = process.env.OUT_DIR ?? 'docs/screenshots';

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--autoplay-policy=no-user-gesture-required',
  ],
});

const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
  permissions: ['microphone'],
});
await context.grantPermissions(['microphone'], { origin: APP_ORIGIN });

const page = await context.newPage();

let exitCode = 1;
try {
  console.log(`▸ navigating to ${APP_URL}`);
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForFunction(
    () => typeof (window as unknown as { __releaseWeapon?: unknown }).__releaseWeapon === 'function',
    null,
    { timeout: 10000 },
  );
  // Let r3f settle a couple of frames so the terrain + reticle are painted.
  await page.waitForTimeout(800);

  // ── 01: idle scene + reticle ─────────────────────────────────────────
  const shot1 = join(OUT_DIR, '01-scene.png');
  await page.screenshot({ path: shot1, type: 'png' });
  console.log(`▸ wrote ${shot1}`);

  // ── 02: connect/talk UI visible (pre-transmission) ───────────────────
  // The Connect button is the natural call-to-action shot. Hover it so it
  // pops slightly. We don't actually click — that would need ws-server.
  await page.locator('button', { hasText: /Connect/i }).first().hover();
  await page.waitForTimeout(200);
  const shot2 = join(OUT_DIR, '02-talk.png');
  await page.screenshot({ path: shot2, type: 'png' });
  console.log(`▸ wrote ${shot2}`);

  // ── 03: AIRSTRIKE (the core loop) ────────────────────────────────────
  // Use the misread grid 599799 (the friendly-killer from bomb-smoke.ts) so
  // the impact lands offset from the target — visually demonstrates the
  // wrong-grid → wrong-impact loop the demo is built around.
  await page.evaluate(() => {
    const w = window as unknown as { __releaseWeapon: (g: string) => void };
    w.__releaseWeapon('599799');
  });
  // delay 1.0s + fall 0.8s ≈ 1.8s to impact, then ring/smoke peak ~0.4s in.
  await page.waitForTimeout(2200);
  const shot3 = join(OUT_DIR, '03-airstrike.png');
  await page.screenshot({ path: shot3, type: 'png' });
  console.log(`▸ wrote ${shot3}`);

  console.log('capture-screenshots OK');
  exitCode = 0;
} catch (err) {
  console.log(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
  exitCode = 1;
} finally {
  await browser.close();
}

process.exit(exitCode);
