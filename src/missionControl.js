import { createTelemetry, dateToSol } from './telemetry.js';

const KEYS = ['distance', 'elevation', 'tilt', 'light'];
const PROVIDER = { distance: 'NASA · waypoints M20', elevation: 'NASA · waypoints M20', tilt: 'NASA · waypoints M20', light: 'Cálculo orbital en vivo' };

const CSS = `
#mc { position: fixed; top: 16px; right: 16px; width: 330px; max-height: calc(100vh - 32px); overflow: auto;
  font: 12px/1.4 ui-monospace, Consolas, monospace; color: #ffd9b0;
  background: rgba(30, 14, 6, 0.62); backdrop-filter: blur(6px);
  border: 1px solid rgba(255, 170, 100, 0.35); border-radius: 10px; padding: 12px 14px;
  box-shadow: 0 8px 30px rgba(0,0,0,.35); transition: opacity .25s, transform .25s; }
#mc.hidden { opacity: 0; transform: translateX(20px); pointer-events: none; }
#mc header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;
  letter-spacing: .12em; font-weight: 700; color: #ffb877; }
#mc header small { font-weight: 400; letter-spacing: 0; color: #c9a283; }
#mc .row { border-top: 1px solid rgba(255,170,100,.2); padding: 9px 0 6px; }
#mc .top { display: flex; justify-content: space-between; align-items: baseline; }
#mc .name { color: #e8bf98; text-transform: uppercase; font-size: 10.5px; letter-spacing: .08em; }
#mc .val { font-size: 20px; color: #fff1e2; font-weight: 700; }
#mc .val .u { font-size: 12px; color: #d9a77c; margin-left: 3px; font-weight: 400; }
#mc .val.wait { color: #a88a74; font-size: 14px; }
#mc canvas { display: block; width: 100%; height: 38px; margin: 4px 0 3px; }
#mc .meaning { color: #e6cdb6; font-family: system-ui, sans-serif; font-size: 12px; }
#mc .prov { color: #a8876f; font-size: 10px; margin-top: 2px; }
#mc .live { color: #7fe39a; }
#mc footer { color: #a8876f; font-size: 10px; margin-top: 6px; }
#mc-hint { position: fixed; top: 16px; right: 16px; font: 11px ui-monospace, monospace; color: #ffd9b0;
  background: rgba(30,14,6,.5); padding: 4px 8px; border-radius: 6px; opacity: 0; transition: opacity .25s; }
#mc.hidden + #mc-hint { opacity: 1; }
`;

export function createMissionControl() {
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CSS }));
  const telemetry = createTelemetry();
  const panel = document.createElement('div');
  panel.id = 'mc';
  panel.innerHTML = `<header>CONTROL DE MISIÓN · PERCY <small id="mc-sol"></small></header>`;
  const hint = Object.assign(document.createElement('div'), { id: 'mc-hint', textContent: 'T · control de misión' });
  document.body.append(panel, hint);

  const values = {};
  const rows = {};
  for (const key of KEYS) {
    const m = telemetry.metadata.get(key);
    const row = document.createElement('div');
    row.className = 'row';
    row.dataset.key = key;
    row.innerHTML = `
      <div class="top"><span class="name">${m.name}</span><span class="val wait">cargando…</span></div>
      <canvas></canvas>
      <div class="meaning">${m.meaning}</div>
      <div class="prov">fuente: ${PROVIDER[key]}${m.live ? ' · <span class="live">● en vivo</span>' : ''}</div>`;
    panel.appendChild(row);
    rows[key] = { el: row, meta: m, history: [] };
  }
  panel.insertAdjacentHTML('beforeend', '<footer>Gráficas: toda la misión, del aterrizaje (sol 0) a hoy.</footer>');

  const show = (key, value) => {
    const { el, meta } = rows[key];
    values[key] = value;
    const v = el.querySelector('.val');
    v.classList.remove('wait');
    v.innerHTML = `${value.toLocaleString('es-CL', { minimumFractionDigits: meta.decimals, maximumFractionDigits: meta.decimals })}<span class="u">${meta.unit}</span>`;
  };

  // Historial (request) → gráfica + último valor; en vivo (subscribe) → actualiza
  for (const key of KEYS) {
    telemetry.request(key).then((points) => {
      rows[key].history = points;
      if (!rows[key].meta.live) show(key, points.at(-1).value);
      draw(rows[key]);
    }).catch((err) => console.error(`Telemetría ${key}:`, err));
    telemetry.subscribe(key, (p) => { show(key, p.value); draw(rows[key], p); });
  }

  const solEl = panel.querySelector('#mc-sol');
  const tickSol = () => { solEl.textContent = `sol ${Math.floor(dateToSol(new Date()))}`; };
  tickSol();
  setInterval(tickSol, 10000);

  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 't' && !e.repeat) panel.classList.toggle('hidden');
  });

  // Para `npm run check`
  window.__mission = {
    values,
    get visible() { return !panel.classList.contains('hidden'); },
  };
}

function draw(row, live) {
  const pts = row.history;
  if (!pts.length) return;
  const cv = row.el.querySelector('canvas');
  const dpr = window.devicePixelRatio || 1;
  const w = cv.clientWidth, h = cv.clientHeight;
  cv.width = w * dpr; cv.height = h * dpr;
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  const all = live ? [...pts, live] : pts;
  const s0 = 0, s1 = Math.max(all.at(-1).sol, 1);
  let lo = Infinity, hi = -Infinity;
  for (const p of all) { lo = Math.min(lo, p.value); hi = Math.max(hi, p.value); }
  const pad = (hi - lo) * 0.1 || 1;
  lo -= pad; hi += pad;
  const X = (s) => ((s - s0) / (s1 - s0)) * (w - 2) + 1;
  const Y = (v) => h - 2 - ((v - lo) / (hi - lo)) * (h - 4);

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(255,160,90,.35)');
  grad.addColorStop(1, 'rgba(255,160,90,0)');
  ctx.beginPath();
  all.forEach((p, i) => (i ? ctx.lineTo(X(p.sol), Y(p.value)) : ctx.moveTo(X(p.sol), Y(p.value))));
  ctx.strokeStyle = '#ffb877';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.lineTo(X(all.at(-1).sol), h);
  ctx.lineTo(X(all[0].sol), h);
  ctx.fillStyle = grad;
  ctx.fill();
  const last = all.at(-1);
  ctx.fillStyle = '#fff1e2';
  ctx.beginPath();
  ctx.arc(X(last.sol), Y(last.value), 2.5, 0, Math.PI * 2);
  ctx.fill();
}
