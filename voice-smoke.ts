import { chromium } from 'playwright';

const consoleEvents: string[] = [];
const wsEvents: string[] = [];
const pageErrors: string[] = [];

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

page.on('console', (msg) => {
  consoleEvents.push(`[${msg.type()}] ${msg.text()}`);
});
page.on('pageerror', (err) => {
  pageErrors.push(`${err.name}: ${err.message}`);
});
page.on('websocket', (ws) => {
  wsEvents.push(`OPEN ${ws.url()}`);
  ws.on('framesent', (f) => {
    const payload = typeof f.payload === 'string' ? f.payload : `[binary ${f.payload.byteLength}b]`;
    if (payload.length < 200) wsEvents.push(`→ ${payload}`);
    else wsEvents.push(`→ ${payload.slice(0, 100)}…(${payload.length}b)`);
  });
  ws.on('framereceived', (f) => {
    const payload = typeof f.payload === 'string' ? f.payload : `[binary ${f.payload.byteLength}b]`;
    if (payload.length < 200) wsEvents.push(`← ${payload}`);
    else wsEvents.push(`← ${payload.slice(0, 100)}…(${payload.length}b)`);
  });
  ws.on('close', () => wsEvents.push(`CLOSE ${ws.url()}`));
  ws.on('socketerror', (e) => wsEvents.push(`ERR ${e}`));
});

console.log('▸ navigating to http://localhost:3000');
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

const h1 = await page.locator('h1').textContent();
const phaseBefore = await page.locator('[data-testid="phase"]').textContent();
console.log(`▸ h1: ${h1}`);
console.log(`▸ phase before click: ${phaseBefore}`);

console.log('▸ clicking Connect');
await page.getByRole('button', { name: 'Connect' }).click();

// wait up to 8s for phase to leave 'idle'
let phase = phaseBefore ?? '';
const deadline = Date.now() + 8000;
while (Date.now() < deadline) {
  phase = (await page.locator('[data-testid="phase"]').textContent()) ?? '';
  if (!phase.includes('idle')) break;
  await page.waitForTimeout(150);
}
console.log(`▸ phase after click: ${phase}`);

// wait additional 5s for response text or audio
await page.waitForTimeout(5000);

const finalPhase = await page.locator('[data-testid="phase"]').textContent();
const transcript = await page.locator('[data-testid="transcript"]').textContent();
const response = await page.locator('[data-testid="response"]').textContent();
const errorEl = await page.locator('[data-testid="error"]').count();
const errorText = errorEl > 0 ? await page.locator('[data-testid="error"]').textContent() : null;

console.log(`▸ final phase: ${finalPhase}`);
console.log(`▸ transcript: ${transcript?.trim().slice(0, 200)}`);
console.log(`▸ response:   ${response?.trim().slice(0, 200)}`);
if (errorText) console.log(`▸ error UI:   ${errorText}`);

console.log('\n=== WebSocket events ===');
wsEvents.slice(0, 40).forEach((e) => console.log(e));
if (wsEvents.length > 40) console.log(`...(${wsEvents.length - 40} more)`);

console.log('\n=== Console (errors/warns only) ===');
consoleEvents.filter((e) => e.startsWith('[error]') || e.startsWith('[warning]')).slice(0, 20).forEach((e) => console.log(e));

if (pageErrors.length) {
  console.log('\n=== Page errors ===');
  pageErrors.forEach((e) => console.log(e));
}

await browser.close();

const passed =
  finalPhase?.includes('listening') ||
  finalPhase?.includes('responding') ||
  (response?.trim().length ?? 0) > 1;

console.log(`\n▸ smoke test ${passed ? 'PASSED' : 'FAILED'}`);
process.exit(passed ? 0 : 1);
