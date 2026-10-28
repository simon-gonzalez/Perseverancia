// Telemetría al estilo Open MCT: cada dato tiene una ficha (nombre, unidad, qué significa)
// y un proveedor con request() para el historial y subscribe() para lo que llega en vivo.
// (Open MCT: TelemetryAPI.addProvider → request/subscribe; ver mapa-del-repo.html)

// Snapshot local de https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json
// (ese servidor no permite leerlo directo desde otra web, así que va copiado en public/data)
const WAYPOINTS_URL = '/data/M20_waypoints.json';

// Reloj de la misión: sol 0 = aterrizaje en Jezero, 18-feb-2021
const LANDING_MS = Date.UTC(2021, 1, 18, 20, 55);
const SOL_MS = 88775244;
export const solToDate = (sol) => new Date(LANDING_MS + sol * SOL_MS);
export const dateToSol = (d) => (d.getTime() - LANDING_MS) / SOL_MS;

class Registry {
  constructor() { this.providers = []; this.metadata = new Map(); }
  addProvider(p) { this.providers.push(p); p.metadata.forEach((m) => this.metadata.set(m.key, m)); }
  #find(key) { return this.providers.find((p) => p.supports(key)); }
  request(key) { return this.#find(key).request(key); }
  subscribe(key, cb) { const p = this.#find(key); return p.subscribe ? p.subscribe(key, cb) : () => {}; }
}

// Proveedor 1: historial de manejos de la NASA (datos pasados, sin tiempo real)
function waypointsProvider() {
  let cache;
  const load = () => (cache ??= fetch(WAYPOINTS_URL)
    .then((r) => { if (!r.ok) throw new Error(`waypoints HTTP ${r.status}`); return r.json(); })
    // Solo fin de manejo ("y"): los puntos intermedios ("m") traen dist_total_m = 0
    .then((j) => j.features.map((f) => f.properties).filter((p) => p.final === 'y')));
  const field = { distance: (p) => p.dist_total_m / 1000, elevation: (p) => p.elev_geoid, tilt: (p) => p.tilt };

  return {
    metadata: [
      { key: 'distance', name: 'Distancia recorrida', unit: 'km', decimals: 2,
        meaning: 'Todo lo que Percy ha manejado sobre Marte desde que aterrizó.' },
      { key: 'elevation', name: 'Altura del terreno', unit: 'm', decimals: 0,
        meaning: 'A qué altura está respecto al "nivel del mar" marciano: va subiendo desde el fondo del cráter.' },
      { key: 'tilt', name: 'Inclinación', unit: '°', decimals: 1,
        meaning: 'Cuán ladeado quedó el rover al final de cada manejo. Más de 20° es una pendiente seria.' },
    ],
    supports: (key) => key in field,
    async request(key) {
      return (await load()).map((p) => ({ sol: p.sol, value: field[key](p) }));
    },
  };
}

// Proveedor 2: tiempo de luz Tierra–Marte, calculado con órbitas keplerianas (JPL, elementos J2000)
const ORBITS = {
  earth: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0,
    0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0],
  mars: [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891,
    0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
};
const AU_KM = 149597870.7, C_KMS = 299792.458, RAD = Math.PI / 180;

function heliocentric(el, T) {
  const [a, e, I, L, wbar, node] = el.slice(0, 6).map((v, i) => v + el[i + 6] * T);
  const w = wbar - node;
  let M = ((L - wbar) % 360) * RAD;
  let E = M;
  for (let i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const [cw, sw, cO, sO, cI, sI] = [w, w, node, node, I, I].map((v, i) => (i % 2 ? Math.sin : Math.cos)(v * RAD));
  return [
    (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    sw * sI * xp + cw * sI * yp,
  ];
}

export function lightMinutes(date) {
  const T = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / (36525 * 86400000);
  const e = heliocentric(ORBITS.earth, T), m = heliocentric(ORBITS.mars, T);
  const au = Math.hypot(m[0] - e[0], m[1] - e[1], m[2] - e[2]);
  return (au * AU_KM) / C_KMS / 60;
}

function lightTimeProvider() {
  return {
    metadata: [
      { key: 'light', name: 'Tiempo de luz Tierra–Marte', unit: 'min', decimals: 2, live: true,
        meaning: 'Lo que tarda una orden desde la Tierra en llegar a Percy. Por eso no se puede manejar con joystick.' },
    ],
    supports: (key) => key === 'light',
    async request() {
      const out = [];
      for (let sol = 0; sol <= dateToSol(new Date()); sol += 5) out.push({ sol, value: lightMinutes(solToDate(sol)) });
      return out;
    },
    subscribe(key, cb) {
      const tick = () => { const now = new Date(); cb({ sol: dateToSol(now), value: lightMinutes(now) }); };
      tick();
      const id = setInterval(tick, 1000);
      return () => clearInterval(id);
    },
  };
}

export function createTelemetry() {
  const telemetry = new Registry();
  telemetry.addProvider(waypointsProvider());
  telemetry.addProvider(lightTimeProvider());
  return telemetry;
}
