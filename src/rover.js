import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { heightAt } from './terrain.js';

// Perseverance real: ~3 m de largo, 2,7 m de ancho, 2,2 m de alto
const REAL_LENGTH = 3.0;
const SPEED = 3.0;      // m/s (acelerado respecto al real, ~0,04 m/s)
const TURN = 1.1;       // rad/s
const CAMERA_RE = /cam|lens|watson|look_camera/i;

export function createRover(scene) {
  const root = new THREE.Group();          // posición/rumbo en el mundo
  const tilt = new THREE.Group();          // inclinación según el terreno
  root.add(tilt);
  root.position.y = heightAt(0, 0);
  scene.add(root);

  const state = { heading: 0, speed: 0, ready: false };
  const keys = new Set();
  window.addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

  const tracks = createTracks(scene);

  // El GLB de la NASA viene comprimido con Draco; el decodificador está en public/draco
  const draco = new DRACOLoader().setDecoderPath('/draco/');
  new GLTFLoader().setDRACOLoader(draco).load('/models/perseverance.glb', (gltf) => {
    const model = gltf.scene;
    model.traverse((o) => {
      if (o.isMesh) o.castShadow = o.receiveShadow = true;
    });

    // Escala a tamaño real usando la dimensión horizontal más larga
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const s = REAL_LENGTH / Math.max(size.x, size.z);
    model.scale.setScalar(s);
    // El GLB de la NASA mira hacia +Z; el rover avanza hacia -Z
    model.rotation.y = Math.PI;    box.setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -box.min.y, -center.z);
    tilt.add(model);

    const cams = [];
    model.traverse((o) => {
      if (CAMERA_RE.test(o.name) && !/bracket|cover|wiring/i.test(o.name)) cams.push(o.name);
    });
    console.log('Cámaras del rover:', cams.join(', '));
    state.model = model;
    state.ready = true;
  });

  const up = new THREE.Vector3(0, 1, 0);
  const n = new THREE.Vector3();
  const q = new THREE.Quaternion();

  function update(dt) {
    if (!state.ready) return;
    const fwd = (keys.has('w') ? 1 : 0) - (keys.has('s') ? 1 : 0);
    const turn = (keys.has('a') ? 1 : 0) - (keys.has('d') ? 1 : 0);
    state.speed = THREE.MathUtils.damp(state.speed, fwd * SPEED, 4, dt);
    if (Math.abs(state.speed) > 0.05) state.heading += turn * TURN * dt * Math.sign(state.speed);
    else state.heading += turn * TURN * 0.6 * dt; // giro en el sitio

    root.position.x -= Math.sin(state.heading) * state.speed * dt;
    root.position.z -= Math.cos(state.heading) * state.speed * dt;
    const { x, z } = root.position;
    root.position.y = heightAt(x, z);
    root.rotation.y = state.heading;

    // Normal del terreno para que el rover se incline con las dunas
    const e = 1.2;
    n.set(heightAt(x - e, z) - heightAt(x + e, z), 2 * e, heightAt(x, z - e) - heightAt(x, z + e)).normalize();
    n.applyAxisAngle(up, -state.heading);
    q.setFromUnitVectors(up, n);
    tilt.quaternion.slerp(q, 1 - Math.exp(-6 * dt));

    if (state.ready && Math.abs(state.speed) > 0.1) tracks.stamp(root, state.heading);
  }

  return { object: root, update, state };
}

// Huellas: una marca por rueda (3 por lado), en un buffer circular instanciado
function createTracks(scene) {
  const MAX = 6000;
  const geo = new THREE.PlaneGeometry(0.42, 0.5).rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x4a1f0e, roughness: 1, transparent: true, opacity: 0.7,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, MAX);
  mesh.count = 0;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  scene.add(mesh);

  let i = 0;
  const last = new THREE.Vector3(Infinity, 0, 0);
  const m = new THREE.Matrix4();
  const qq = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const p = new THREE.Vector3();
  const offsets = [-1.1, 1.1]; // separación entre ruedas izquierda/derecha (m)

  return {
    stamp(root, heading) {
      if (root.position.distanceTo(last) < 0.45) return;
      last.copy(root.position);
      qq.setFromAxisAngle(new THREE.Vector3(0, 1, 0), heading);
      for (const ox of offsets) {
        p.set(ox, 0, 0).applyQuaternion(qq).add(root.position);
        p.y = heightAt(p.x, p.z) + 0.12; // margen: la malla del terreno interpola entre vértices
        m.compose(p, qq, one);
        mesh.setMatrixAt(i, m);
        i = (i + 1) % MAX;
        mesh.count = Math.min(mesh.count + 1, MAX);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
