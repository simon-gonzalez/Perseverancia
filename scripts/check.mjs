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

// Control de misión: los 4 datos deben tener un número y la tecla T debe ocultar/mostrar
const KEYS = ['distance', 'elevation', 'tilt', 'light'];
try {
  await page.waitForFunction(
    (keys) => keys.every((k) => Number.isFinite(window.__mission?.values[k])),
    KEYS, { timeout: 15000 });
} catch {
  errors.push('[misión] no cargaron los 4 datos en 15 s');
}
const values = await page.evaluate(() => window.__mission?.values ?? {});
console.log('Control de misión:');
for (const k of KEYS) console.log(`  ${k.padEnd(10)} ${Number.isFinite(values[k]) ? values[k].toFixed(3) : 'FALTA'}`);

// Espera a que termine la animación (en Chrome invisible el reloj de animaciones es lento)
const opacityIs = (v) => page.waitForFunction(
  (o) => getComputedStyle(document.getElementById('mc')).opacity === o, v, { timeout: 10000 }).catch(() => {});
await page.keyboard.press('t');
await opacityIs('0');
const hidden = await page.evaluate(() => !window.__mission.visible);
await page.screenshot({ path: 'screenshots/hidden.png' });
await page.keyboard.press('t');
await opacityIs('1');
const shown = await page.evaluate(() => window.__mission.visible);
console.log(`  tecla T    oculta: ${hidden ? 'sí' : 'NO'} · vuelve a mostrar: ${shown ? 'sí' : 'NO'}`);
if (!hidden || !shown) errors.push('[misión] la tecla T no oculta/muestra el panel');

await page.screenshot({ path: OUT });

// Cámaras de Percy: clic real sobre el punto de una cámara → foto abierta y revelada
const PHOTO_OUT = 'screenshots/foto.png';
const pos = await page.evaluate(() => window.__cams?.screenPos('Mastcam_Z_cams'));
if (!pos) {
  errors.push('[cámaras] no se encontró el punto de Mastcam_Z_cams');
} else {
  await page.mouse.move(pos.x, pos.y);
  await page.mouse.click(pos.x, pos.y);
  const opened = await page.waitForFunction(() => window.__cams.photo, null, { timeout: 15000 }).catch(() => null);
  if (!opened) errors.push('[cámaras] el clic en Mastcam_Z_cams no abrió una foto');
  // Espera a que termine el revelado de la foto
  await page.waitForFunction(() => {
    const img = document.querySelector('#viewer img');
    return img.classList.contains('reveal') && img.getAnimations().every((a) => a.playState === 'finished');
  }, null, { timeout: 20000 }).catch(() => {});
  await page.screenshot({ path: PHOTO_OUT });
  console.log(`  clic en Mastcam-Z → ${PHOTO_OUT}`);
}

// Cada cámara debe abrir una foto real
console.log('Cámaras:');
for (const part of await page.evaluate(() => window.__cams.names)) {
  await page.evaluate((p) => { window.__cams.close(); return window.__cams.open(p); }, part);
  const photo = await page.waitForFunction(() => window.__cams.photo, null, { timeout: 15000 })
    .then((h) => h.jsonValue()).catch(() => null);
  console.log(`  ${part.padEnd(15)} ${photo && photo.part === part ? `${photo.src.split('/').pop()} (${photo.w}px)` : 'SIN FOTO'}`);
  if (!photo || photo.part !== part) errors.push(`[cámaras] ${part} no abrió una foto`);
}
await page.keyboard.press('Escape');

await browser.close();

console.log(`Captura: ${OUT}`);
if (errors.length) {
  console.log(`\n${errors.length} error(es):`);
  errors.forEach((e) => console.log(' - ' + e));
  process.exit(1);
}
console.log('Sin errores de consola.');
