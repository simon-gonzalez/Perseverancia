import * as THREE from 'three';
import { fbm, noise2 } from './noise.js';

const SIZE = 600;
const SEGMENTS = 320;

// Dunas: crestas asimétricas (barlovento suave, sotavento abrupto) + colinas lejanas
export function heightAt(x, z) {
  const warp = fbm(x * 0.01, z * 0.01, 3) * 18;
  const p = (x + warp) * 0.045 + z * 0.012;
  const ridge = Math.pow(1 - Math.abs(Math.sin(p)), 2.2);
  const duneAmp = 2.6 * (0.6 + 0.4 * noise2(x * 0.02, z * 0.02));
  const hills = fbm(x * 0.006, z * 0.006, 4) * 22;
  const ripples = Math.sin((x * 0.9 + z * 0.25) + noise2(x * 0.1, z * 0.1) * 2) * 0.04;
  const dist = Math.hypot(x, z);
  const far = THREE.MathUtils.smoothstep(dist, 120, 280) * 30 * (fbm(x * 0.004, z * 0.004, 3) + 0.6);
  return ridge * duneAmp + hills + ripples + far;
}

export function createTerrain() {
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const base = new THREE.Color(0xb5653a);
  const light = new THREE.Color(0xd9955f);
  const dark = new THREE.Color(0x7a3a1e);
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    const n = fbm(x * 0.05, z * 0.05, 3);
    c.copy(base).lerp(light, THREE.MathUtils.clamp(0.5 + n, 0, 1));
    c.lerp(dark, THREE.MathUtils.clamp(-n * 0.8 - 0.1, 0, 0.5));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0,
    map: grainTexture(),
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}

// Textura de grano fino para que el suelo no se vea plástico de cerca
function grainTexture() {
  const s = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(s, s);
  for (let i = 0; i < s * s; i++) {
    const v = 215 + Math.random() * 40;
    img.data.set([v, v * 0.97, v * 0.94, 255], i * 4);
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(120, 120);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
