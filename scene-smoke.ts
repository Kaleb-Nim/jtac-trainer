import { chromium } from 'playwright';

const consoleEvents: string[] = [];
const pageErrors: string[] = [];

const browser = await chromium.launch({
  headless: true,
  args: [
    // Mic permission is granted to keep TalkButton/useRealtimeVoice happy on first render,
    // even though scene smoke does not actually invoke connect().
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
  ],
});

const context = await browser.newContext({
  permissions: ['microphone'],
});
await context.grantPermissions(['microphone'], { origin: 'http://localhost:3000' });

const page = await context.newPage();

page.on('console', (msg) => {
  consoleEvents.push(`[${msg.type()}] ${msg.text()}`);
});
page.on('pageerror', (err) => {
  pageErrors.push(`${err.name}: ${err.message}`);
});

let exitCode = 1;
try {
  console.log('▸ navigating to http://localhost:3000');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

  // Wait for r3f to mount the canvas (up to 10s)
  await page.waitForSelector('canvas', { timeout: 10000 });

  const canvasCount = await page.locator('canvas').count();
  if (canvasCount !== 1) {
    console.log(`FAIL: expected 1 canvas, found ${canvasCount}`);
    process.exit(1);
  }

  const gridCount = await page.locator('text=GRID:').count();
  if (gridCount < 1) {
    console.log(`FAIL: GRID: text not found in Reticle (count=${gridCount})`);
    process.exit(1);
  }

  const scenarioCount = await page
    .locator('text=Armor column reported at grid 600200')
    .count();
  if (scenarioCount !== 1) {
    console.log(`FAIL: scenario brief text not found (count=${scenarioCount})`);
    process.exit(1);
  }

  // Read the live grid readout and assert format GRID: NNNNNN
  // Reticle renders "GRID: <space>500500" — match anywhere in body.
  const bodyText = (await page.locator('body').textContent()) ?? '';
  const gridMatch = bodyText.match(/GRID:\s*(\d{6})/);
  if (!gridMatch) {
    console.log('FAIL: no GRID: NNNNNN substring in body text');
    console.log(`body slice: ${bodyText.slice(0, 500)}`);
    process.exit(1);
  }
  console.log(`▸ canvas: ${canvasCount}, scenario: ok, grid: ${gridMatch[1]}`);

  // Fail on any fatal page errors mentioning Error/Cannot
  const fatal = pageErrors.filter(
    (e) => /Error|Cannot/.test(e) && !/ResizeObserver/.test(e),
  );
  const fatalConsole = consoleEvents.filter(
    (e) => e.startsWith('[error]') && /(Error|Cannot)/.test(e) && !/ResizeObserver/.test(e),
  );

  if (fatal.length > 0) {
    console.log('FAIL: page errors detected:');
    fatal.forEach((e) => console.log('  ' + e));
    process.exit(1);
  }
  if (fatalConsole.length > 0) {
    console.log('FAIL: console errors detected:');
    fatalConsole.forEach((e) => console.log('  ' + e));
    process.exit(1);
  }

  console.log('scene-smoke OK');
  exitCode = 0;
} catch (err) {
  console.log(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
  exitCode = 1;
} finally {
  await browser.close();
}

process.exit(exitCode);
