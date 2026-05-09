// bomb-smoke.ts — Phase 3 / PILOT-04..06 regression.
//
// Drives the BombImpact path WITHOUT the LLM/ws-server: uses the dev-mode
// window.__setTransmittedGrid hook exposed by BombImpact. Verifies:
//
//   Test 1 (Take A): grid 599699 → impact on TARGET_WORLD (≈ 0.5 m off).
//   Test 2 (Lase):   L key → lasedRange > 0 + 'RNG  NNNN m' line in HUD.
//   Test 3 (Take B): grid 599799 → impact ≈ 20 m from FRIENDLIES_WORLD
//                    (z=320 per SCENARIO; threshold widened from the plan
//                    body's <5 to <25 to match the geometric reality of
//                    the relocated friendlies position).
//   Test 4 (Reset):  R key → transmittedGrid/lasedRange/impactResult all
//                    null.
//
// Mirrors scene-smoke.ts launch / permission / console-filter pattern.

import { chromium } from 'playwright';

const errors: string[] = [];
const benign = /ResizeObserver|PointerLockControls|WrongDocumentError|deprecated|GL Driver|ScriptProcessorNode|AudioWorkletNode/i;

const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--autoplay-policy=no-user-gesture-required',
  ],
});

const context = await browser.newContext({
  permissions: ['microphone'],
});
await context.grantPermissions(['microphone'], { origin: 'http://localhost:3000' });

const page = await context.newPage();

page.on('console', (m) => {
  if (m.type() === 'error' && !benign.test(m.text())) {
    errors.push(`[console] ${m.text()}`);
  }
});
page.on('pageerror', (e) => {
  if (!benign.test(String(e))) errors.push(`[pageerror] ${String(e)}`);
});

let exitCode = 1;
try {
  console.log('▸ navigating to http://localhost:3000');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForFunction(
    () => typeof (window as unknown as { __setTransmittedGrid?: unknown }).__setTransmittedGrid === 'function',
    null,
    { timeout: 8000 },
  );
  await page.waitForFunction(
    () => typeof (window as unknown as { __getStore?: unknown }).__getStore === 'function',
    null,
    { timeout: 8000 },
  );
  console.log('▸ dev hooks ready');

  // ── Test 1: correct grid (Take A) ─────────────────────────────────────
  await page.evaluate(() => (window as unknown as { __setTransmittedGrid: (g: string) => void }).__setTransmittedGrid('599699'));
  await page.waitForTimeout(3500);
  const r1 = await page.evaluate(() => (window as unknown as { __getImpactResult: () => unknown }).__getImpactResult()) as {
    grid?: string; distanceToTarget?: number; distanceToFriendlies?: number;
  } | null;
  if (!r1 || r1.grid !== '599699') {
    throw new Error('Test1 expected impactResult.grid=599699, got ' + JSON.stringify(r1));
  }
  if (typeof r1.distanceToTarget !== 'number' || r1.distanceToTarget > 5) {
    throw new Error('Test1 expected distanceToTarget < 5, got ' + r1.distanceToTarget);
  }
  console.log(`▸ Test1 OK: grid=${r1.grid}, distToTarget=${r1.distanceToTarget?.toFixed(2)} m`);

  // ── Test 2: lase ──────────────────────────────────────────────────────
  await page.keyboard.press('l');
  await page.waitForTimeout(250);
  const lased = await page.evaluate(() => (window as unknown as { __getStore: () => { lasedRange: number | null } }).__getStore().lasedRange);
  if (typeof lased !== 'number' || lased <= 0 || !isFinite(lased)) {
    throw new Error('Test2 expected positive finite lasedRange, got ' + lased);
  }
  const rngText = await page.locator('text=/RNG\\s+\\d{4}\\s*m/').count();
  if (rngText < 1) throw new Error('Test2 RNG line not visible in Reticle (count=' + rngText + ')');
  console.log(`▸ Test2 OK: lasedRange=${lased.toFixed(1)} m, RNG line visible`);

  // ── Test 3: misread (Take B) — must land near friendlies (z=320) ──────
  await page.evaluate(() => (window as unknown as { __setTransmittedGrid: (g: string) => void }).__setTransmittedGrid('599799'));
  await page.waitForTimeout(3500);
  const r3 = await page.evaluate(() => (window as unknown as { __getImpactResult: () => unknown }).__getImpactResult()) as {
    grid?: string; distanceToTarget?: number; distanceToFriendlies?: number;
  } | null;
  if (!r3 || r3.grid !== '599799') {
    throw new Error('Test3 expected impactResult.grid=599799, got ' + JSON.stringify(r3));
  }
  if (typeof r3.distanceToFriendlies !== 'number' || r3.distanceToFriendlies > 25) {
    throw new Error('Test3 expected distanceToFriendlies < 25, got ' + r3.distanceToFriendlies);
  }
  console.log(`▸ Test3 OK: grid=${r3.grid}, distToFriendlies=${r3.distanceToFriendlies?.toFixed(2)} m, distToTarget=${r3.distanceToTarget?.toFixed(2)} m`);

  // ── Test 4: reset ─────────────────────────────────────────────────────
  await page.keyboard.press('r');
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => (window as unknown as { __getStore: () => { transmittedGrid: unknown; lasedRange: unknown; impactResult: unknown } }).__getStore());
  if (after.transmittedGrid !== null) {
    throw new Error('Test4 transmittedGrid not null: ' + JSON.stringify(after.transmittedGrid));
  }
  if (after.lasedRange !== null) {
    throw new Error('Test4 lasedRange not null: ' + JSON.stringify(after.lasedRange));
  }
  if (after.impactResult !== null) {
    throw new Error('Test4 impactResult not null: ' + JSON.stringify(after.impactResult));
  }
  console.log('▸ Test4 OK: transmittedGrid + lasedRange + impactResult all null');

  if (errors.length) {
    throw new Error('Console/page errors: ' + errors.slice(0, 5).join(' | '));
  }

  console.log('bomb-smoke OK');
  exitCode = 0;
} catch (err) {
  console.log(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
  exitCode = 1;
} finally {
  await browser.close();
}

process.exit(exitCode);
