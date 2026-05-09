// debrief-smoke.ts — Phase 4 / BRIEF-01..06 regression.
//
// Drives the full end-of-run path WITHOUT calling DashScope: intercepts
// /api/debrief via page.route() so the smoke is offline-stable and the
// verdict text is deterministic.
//
//   Test A (solid):  inject grid 599699 → release → impact → append 2 fake turns →
//                    intercepted route returns {verdict:'solid', ...} →
//                    click END RUN → assert badge text === 'solid'.
//   Test B (unsafe): dismiss via NEW RUN → inject grid 599799 → release → impact →
//                    append turns → intercepted route returns
//                    {verdict:'unsafe', critique:'... 19.7 m ...'} →
//                    click END RUN → assert badge text === 'unsafe' AND
//                    critique paragraph contains '19'.
//
// Mirrors bomb-smoke.ts launch / permission / console-filter pattern.

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

let stubResponse: { verdict: string; critique: string } = {
  verdict: 'solid',
  critique: 'Direct hit. Maintain that ROE next time.',
};

await page.route('**/api/debrief', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(stubResponse),
  });
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
    () => typeof (window as unknown as { __releaseWeapon?: unknown }).__releaseWeapon === 'function',
    null,
    { timeout: 8000 },
  );
  await page.waitForFunction(
    () => typeof (window as unknown as { __getStore?: unknown }).__getStore === 'function',
    null,
    { timeout: 8000 },
  );
  await page.waitForFunction(
    () => typeof (window as unknown as { __appendTurn?: unknown }).__appendTurn === 'function',
    null,
    { timeout: 8000 },
  );
  await page.waitForFunction(
    () => typeof (window as unknown as { __triggerEndRun?: unknown }).__triggerEndRun === 'function',
    null,
    { timeout: 8000 },
  );
  console.log('▸ dev hooks ready');

  // ── Test A: solid path (grid 599699) ───────────────────────────────────
  stubResponse = { verdict: 'solid', critique: 'Direct hit. Maintain that ROE next time.' };

  await page.evaluate(() =>
    (window as unknown as { __setTransmittedGrid: (g: string) => void }).__setTransmittedGrid('599699'),
  );
  await page.evaluate(() =>
    (window as unknown as { __releaseWeapon: (g: string) => void }).__releaseWeapon('599699'),
  );
  await page.waitForFunction(
    () => (window as unknown as { __getImpactResult: () => unknown }).__getImpactResult() !== null,
    null,
    { timeout: 8000 },
  );

  await page.evaluate(() => {
    const w = window as unknown as { __appendTurn: (t: { role: string; text: string; ts: number }) => void };
    w.__appendTurn({ role: 'user', text: 'line 6 grid five-niner-niner-six-niner-niner', ts: Date.now() });
    w.__appendTurn({ role: 'pilot', text: 'copy five-niner-niner-six-niner-niner', ts: Date.now() });
  });

  await page.click('[data-testid="end-run"]');
  await page.waitForSelector('[data-testid="debrief-verdict"]', { timeout: 8000 });
  const vA = await page.locator('[data-testid="debrief-verdict"]').textContent();
  if (vA?.trim() !== 'solid') {
    throw new Error('TestA expected verdict text "solid", got ' + JSON.stringify(vA));
  }
  console.log('▸ TestA OK: verdict=solid badge rendered');

  // Dismiss via NEW RUN: the END RUN button flips to NEW RUN once debrief is set.
  await page.click('[data-testid="end-run"]');
  await page.waitForSelector('[data-testid="debrief-verdict"]', { state: 'detached', timeout: 5000 });
  // After endRun(), impactResult is null — wait for store cleared.
  await page.waitForFunction(
    () => (window as unknown as { __getImpactResult: () => unknown }).__getImpactResult() === null,
    null,
    { timeout: 5000 },
  );

  // ── Test B: unsafe path (grid 599799) ──────────────────────────────────
  stubResponse = {
    verdict: 'unsafe',
    critique: 'Bombs landed 19.7 m from friendlies. Do not clear hot until grid is verified.',
  };

  await page.evaluate(() =>
    (window as unknown as { __setTransmittedGrid: (g: string) => void }).__setTransmittedGrid('599799'),
  );
  await page.evaluate(() =>
    (window as unknown as { __releaseWeapon: (g: string) => void }).__releaseWeapon('599799'),
  );
  await page.waitForFunction(
    () => (window as unknown as { __getImpactResult: () => unknown }).__getImpactResult() !== null,
    null,
    { timeout: 8000 },
  );

  await page.evaluate(() => {
    const w = window as unknown as { __appendTurn: (t: { role: string; text: string; ts: number }) => void };
    w.__appendTurn({ role: 'user', text: 'line 6 grid five-niner-niner-seven-niner-niner', ts: Date.now() });
    w.__appendTurn({ role: 'pilot', text: 'copy five-niner-niner-seven-niner-niner', ts: Date.now() });
  });

  await page.click('[data-testid="end-run"]');
  await page.waitForSelector('[data-testid="debrief-verdict"]', { timeout: 8000 });
  const vB = await page.locator('[data-testid="debrief-verdict"]').textContent();
  if (vB?.trim() !== 'unsafe') {
    throw new Error('TestB expected verdict text "unsafe", got ' + JSON.stringify(vB));
  }
  const critiqueB = await page.locator('[data-testid="debrief-critique"]').textContent();
  if (!critiqueB || !critiqueB.includes('19')) {
    throw new Error('TestB expected critique to contain "19", got ' + JSON.stringify(critiqueB));
  }
  console.log('▸ TestB OK: verdict=unsafe badge + critique mentions "19"');

  if (errors.length) {
    throw new Error('Console/page errors: ' + errors.slice(0, 5).join(' | '));
  }

  console.log('debrief-smoke OK');
  exitCode = 0;
} catch (err) {
  console.log(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
  if (errors.length) {
    console.log('errors:', errors.slice(0, 5).join(' | '));
  }
  exitCode = 1;
} finally {
  await browser.close();
}

process.exit(exitCode);
