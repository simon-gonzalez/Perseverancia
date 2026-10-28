import * as THREE from 'three';

// Las 4 cámaras de Percy: puntos que brillan sobre su pieza del modelo y abren fotos reales.
// Fotos: API raw_images de la NASA, elegidas a mano (ver public/photos/photos.json).
const CAMERAS = [
  { part: 'Mastcam_Z_cams', name: 'Mastcam-Z', what: 'Las "ojos" con zoom del mástil, a color' },
  { part: 'NavCams', name: 'NavCam', what: 'Cámara de navegación del mástil' },
  { part: 'hazcams_front', name: 'HazCam frontal', what: 'Vigila obstáculos delante de las ruedas' },
  { part: 'WATSON', name: 'WATSON', what: 'Lupa en la punta del brazo robótico' },
];

const CSS = `
#cam-tip { position: fixed; pointer-events: none; transform: translate(-50%, -140%);
  font: 12px ui-monospace, Consolas, monospace; color: #fff1e2; background: rgba(30,14,6,.8);
  border: 1px solid rgba(255,170,100,.5); padding: 4px 8px; border-radius: 6px; white-space: nowrap;
  opacity: 0; transition: opacity .15s; }
#cam-tip small { color: #d9a77c; display: block; }
#cam-flash { position: fixed; inset: 0; background: #fff; opacity: 0; pointer-events: none; z-index: 20; }
#cam-flash.go { animation: flash .6s ease-out; }
@keyframes flash { 0% { opacity: .95 } 100% { opacity: 0 } }
#cam-shutter { position: fixed; inset: 0; pointer-events: none; z-index: 19; }
#cam-shutter::before, #cam-shutter::after { content: ''; position: absolute; left: 0; right: 0; height: 0; background: #000; }
#cam-shutter::before { top: 0 } #cam-shutter::after { bottom: 0 }
#cam-shutter.go::before, #cam-shutter.go::after { animation: shut .32s ease-in-out; }
@keyframes shut { 0%,100% { height: 0 } 50% { height: 50.5% } }
#viewer { position: fixed; inset: 0; z-index: 15; display: none; align-items: center; justify-content: center;
  background: rgba(12,5,2,.72); backdrop-filter: blur(3px); }
#viewer.open { display: flex; }
#viewer figure { margin: 0; max-width: min(1100px, 92vw); cursor: zoom-in; position: relative; }
#viewer.zoom figure { max-width: 100vw; cursor: zoom-out; }
#viewer img { display: block; width: 100%; max-height: 78vh; object-fit: contain; border-radius: 6px;
  box-shadow: 0 20px 60px rgba(0,0,0,.6); }
#viewer.zoom img { max-height: 100vh; border-radius: 0; }
#viewer img.reveal { animation: reveal 2.6s ease-out both; }
@keyframes reveal {
  0% { filter: brightness(3) blur(18px) sepia(1); clip-path: inset(0 0 100% 0); }
  35% { filter: brightness(1.6) blur(8px) sepia(.6); clip-path: inset(0 0 0 0); }
  100% { filter: none; clip-path: inset(0 0 0 0); } }
#viewer figcaption { font: 13px ui-monospace, Consolas, monospace; color: #ffd9b0; margin-top: 10px;
  display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
#viewer figcaption b { color: #fff1e2; font-size: 16px; }
#viewer .keys { color: #a8876f; }
#viewer.zoom figcaption { display: none; }
`;

export function createCameras({ rover, camera, renderer, scene }) {
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CSS }));
  const tip = el('div', 'cam-tip');
  const flash = el('div', 'cam-flash');
  const shutter = el('div', 'cam-shutter');
  const viewer = el('div', 'viewer');
  viewer.innerHTML = '<figure><img alt=""><figcaption></figcaption></figure>';
  document.body.append(tip, flash, shutter, viewer);
  const img = viewer.querySelector('img');
  const caption = viewer.querySelector('figcaption');

  let photos = {};
  const photosReady = fetch('/photos/photos.json').then((r) => r.json()).then((j) => { photos = j.cameras; });

  // Puntos brillantes (sprites aditivos, siempre visibles encima del modelo)
  const glow = new THREE.SpriteMaterial({
    map: glowTexture(), color: 0x9fe8ff, blending: THREE.AdditiveBlending,
    depthTest: false, depthWrite: false, transparent: true,
  });
  const markers = [];
  let attached = false;

  function attach(model) {
    const tilt = model.parent;
    tilt.updateMatrixWorld(true);
    for (const cam of CAMERAS) {
      const node = model.getObjectByName(cam.part);
      if (!node) { console.error(`Cámara sin pieza en el modelo: ${cam.part}`); continue; }
      const center = new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3());
      const sprite = new THREE.Sprite(glow.clone());
      sprite.position.copy(tilt.worldToLocal(center));
      // Mastcam-Z y NavCam comparten la cabeza del mástil: separa puntos encimados
      while (markers.some((m) => m.position.distanceTo(sprite.position) < 0.3)) sprite.position.y += 0.3;
      sprite.scale.setScalar(0.35);
      sprite.renderOrder = 10;
      sprite.userData.cam = cam;
      tilt.add(sprite);
      markers.push(sprite);
    }
    attached = true;
  }

  // Hover y clic (un clic que no fue arrastre de cámara)
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered = null, downAt = null;
  const pick = (e) => {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects(markers)[0]?.object ?? null;
  };
  renderer.domElement.addEventListener('pointermove', (e) => {
    hovered = pick(e);
    renderer.domElement.style.cursor = hovered ? 'pointer' : '';
    tip.style.opacity = hovered ? 1 : 0;
    if (hovered) {
      const c = hovered.userData.cam;
      tip.innerHTML = `${c.name}<small>${c.what} · clic para tomar foto</small>`;
      tip.style.left = `${e.clientX}px`;
      tip.style.top = `${e.clientY}px`;
    }
  });
  renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
    const hit = pick(e);
    if (hit) open(hit.userData.cam.part, 0);
  });

  // Visor de fotos
  let current = null;
  async function open(part, index) {
    await photosReady;
    const list = photos[part];
    if (!list?.length) return;
    const i = ((index % list.length) + list.length) % list.length;
    current = { part, index: i };
    const p = list[i];
    const cam = CAMERAS.find((c) => c.part === part);
    restart(shutter, 'go');
    restart(flash, 'go');
    shutterSound();
    viewer.classList.remove('zoom');
    viewer.classList.add('open');
    tip.style.opacity = 0;
    img.classList.remove('reveal');
    img.style.visibility = 'hidden';
    img.onload = () => { img.style.visibility = ''; restart(img, 'reveal'); };
    img.src = p.file;
    img.alt = `${cam.name}, sol ${p.sol}`;
    const days = Math.max(0, Math.round((Date.now() - Date.parse(p.utc + 'Z')) / 86400000));
    caption.innerHTML = `
      <span><b>${cam.name}</b> · sol ${p.sol} · ${days === 0 ? 'hoy' : `hace ${days} día${days === 1 ? '' : 's'}`}</span>
      <span class="keys">${i + 1}/${list.length} · ← → más fotos · clic ampliar · Esc volver</span>`;
  }
  const close = () => { viewer.classList.remove('open', 'zoom'); current = null; };

  viewer.addEventListener('click', (e) => {
    if (e.target === viewer) close();
    else viewer.classList.toggle('zoom');
  });
  window.addEventListener('keydown', (e) => {
    if (!current) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') open(current.part, current.index + 1);
    else if (e.key === 'ArrowLeft') open(current.part, current.index - 1);
  });

  // Pulso de los puntos
  function update(t) {
    if (!attached && rover.state.model) attach(rover.state.model);
    markers.forEach((m, i) => {
      const k = 0.75 + 0.25 * Math.sin(t * 3 + i * 1.7);
      m.material.opacity = k;
      m.scale.setScalar((m === hovered ? 0.5 : 0.35) * (0.9 + 0.1 * k));
    });
  }

  // Para `npm run check`
  window.__cams = {
    names: CAMERAS.map((c) => c.part),
    screenPos(part) {
      const m = markers.find((s) => s.userData.cam.part === part);
      if (!m) return null;
      const v = m.getWorldPosition(new THREE.Vector3()).project(camera);
      return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
    },
    open: (part) => open(part, 0),
    get photo() { return current && img.complete && img.naturalWidth ? { part: current.part, src: img.src, w: img.naturalWidth } : null; },
    close,
  };
  return { update };
}

function el(tag, id) { return Object.assign(document.createElement(tag), { id }); }

function restart(node, cls) { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); }

function glowTexture() {
  const s = 64, cv = Object.assign(document.createElement('canvas'), { width: s, height: s });
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(180,240,255,.85)');
  g.addColorStop(1, 'rgba(120,200,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(cv);
}

// Obturador sintetizado (sin archivos de audio): dos clics de ruido filtrado
let audio;
function shutterSound() {
  try {
    audio ??= new AudioContext();
    const t0 = audio.currentTime;
    for (const dt of [0, 0.09]) {
      const len = audio.sampleRate * 0.05;
      const buf = audio.createBuffer(1, len, audio.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
      const src = audio.createBufferSource();
      src.buffer = buf;
      const f = audio.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 2400;
      src.connect(f).connect(audio.destination);
      src.start(t0 + dt);
    }
  } catch { /* sin audio: la foto igual se muestra */ }
}
