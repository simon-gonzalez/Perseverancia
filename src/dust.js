import * as THREE from 'three';

// Partículas de polvo suspendidas que derivan con el viento alrededor de la cámara
export function createDust() {
  const COUNT = 2500, R = 60;
  const base = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    base[i * 3] = (Math.random() - 0.5) * R * 2;
    base[i * 3 + 1] = Math.random() * 20;
    base[i * 3 + 2] = (Math.random() - 0.5) * R * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3));
  const mat = new THREE.PointsMaterial({
    color: 0xf0c08a, size: 0.12, transparent: true, opacity: 0.55, depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;

  points.userData.update = (t, camera) => {
    const p = geo.attributes.position;
    for (let i = 0; i < COUNT; i++) {
      const wrap = (v) => ((v % (R * 2)) + R * 3) % (R * 2) - R;
      p.array[i * 3] = camera.position.x + wrap(base[i * 3] + t * 2.2);
      p.array[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.7 + i) * 0.3;
      p.array[i * 3 + 2] = camera.position.z + wrap(base[i * 3 + 2] + t * 0.6);
    }
    p.needsUpdate = true;
  };
  return points;
}
