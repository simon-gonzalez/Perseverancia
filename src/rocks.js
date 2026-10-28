import * as THREE from 'three';
import { heightAt } from './terrain.js';
import { noise2, rand } from './noise.js';

function rockGeometry(seed) {
  const geo = new THREE.IcosahedronGeometry(1, 3);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = noise2(v.x * 2 + seed, v.z * 2 + v.y * 1.3) * 0.25
      + noise2(v.x * 5 + seed, v.y * 5) * 0.08;
    v.multiplyScalar(1 + n);
    v.y *= 0.65;
    if (v.y < -0.2) v.y = -0.2; // base plana, asentada en la arena
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createRocks() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x6e3b24, roughness: 0.9, flatShading: true });
  const variants = [0, 1, 2, 3].map((s) => rockGeometry(s * 13.7));
  const COUNT = 260;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();

  variants.forEach((geo, vi) => {
    const inst = new THREE.InstancedMesh(geo, mat, COUNT);
    inst.castShadow = inst.receiveShadow = true;
    for (let i = 0; i < COUNT; i++) {
      const k = vi * 1000 + i;
      const r = 6 + Math.pow(rand(k), 0.7) * 160;
      const a = rand(k + 0.5) * Math.PI * 2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const big = rand(k + 0.9) > 0.95;
      const s = big ? 1.5 + rand(k + 2) * 2.5 : 0.15 + Math.pow(rand(k + 3), 3) * 0.9;
      e.set(rand(k + 4) * 0.4, rand(k + 5) * 6.28, rand(k + 6) * 0.4);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(x, heightAt(x, z) - s * 0.15, z), q, new THREE.Vector3(s, s, s));
      inst.setMatrixAt(i, m);
    }
    group.add(inst);
  });
  return group;
}
