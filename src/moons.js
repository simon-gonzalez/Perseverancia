import * as THREE from 'three';
import { noise2 } from './noise.js';

function moonTexture(seed) {
  const s = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(s, s);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const n = noise2(x * 0.08 + seed, y * 0.08) * 0.5 + noise2(x * 0.3, y * 0.3 + seed) * 0.2;
      const v = 150 + n * 60;
      img.data.set([v, v * 0.92, v * 0.85, 255], (y * s + x) * 4);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function moon(radius, seed, stretch) {
  const geo = new THREE.IcosahedronGeometry(radius, 4);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + noise2(x / radius * 2 + seed, y / radius * 2 + z / radius) * 0.12;
    p.setXYZ(i, x * k * stretch, y * k, z * k);
  }
  geo.computeVertexNormals();
  // Las lunas no reciben niebla: se ven nítidas tras el polvo atmosférico tenue
  const mat = new THREE.MeshStandardMaterial({ map: moonTexture(seed), roughness: 1, fog: false, emissive: 0xe8c9a8, emissiveIntensity: 0.7 });
  return new THREE.Mesh(geo, mat);
}

// Fobos (más grande, alargado) y Deimos (diminuto) en el cielo de la tarde
export function createMoons() {
  const group = new THREE.Group();
  const phobos = moon(11, 3.1, 1.35);
  phobos.position.set(-330, 260, -900);
  phobos.rotation.set(0.3, 0.8, 0.2);
  const deimos = moon(6, 7.7, 1.15);
  deimos.position.set(-80, 330, -1000);
  group.add(phobos, deimos);
  return group;
}
