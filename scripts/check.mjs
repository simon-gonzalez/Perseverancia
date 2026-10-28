// Abre la página en Chrome headless (el Chrome instalado, sin descargar navegadores),
// guarda una captura y lista los errores de consola.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const URL = process.env.CHECK_URL || 'http://localhost:5173';
const OUT = 'screenshots/check.png';

mkdirSync('screenshots', { recursive: true });
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`);
  else if (msg.type() === 'log') console.log(`[página] ${msg.text()}`);
});
page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
page.on('requestfailed', (req) => errors.push(`[request] ${req.url()} ${req.failure()?.errorText}`));

await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(4000);
await page.screenshot({ path: 'screenshots/start.png' });
// Maneja el rover con teclas reales; la simulación avanza con pasos fijos (ver __simulate)
const drive = async (keys, seconds) => {
  for (const k of keys) await page.keyboard.down(k);
  await page.evaluate((s) => window.__simulate(s), seconds);
  for (const k of keys) await page.keyboard.up(k);
};
await drive(['w'], 5);
await drive(['w', 'a'], 2.5);
await drive(['w'], 3);
await drive([], 1.5);
await page.waitForTimeout(1000);
await page.screenshot({ path: OUT });
await browser.close();

console.log(`Captura: ${OUT}`);
if (errors.length) {
  console.log(`\n${errors.length} error(es):`);
  errors.forEach((e) => console.log(' - ' + e));
  process.exit(1);
}
console.log('Sin errores de consola.');
