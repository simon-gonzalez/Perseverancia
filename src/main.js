import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createTerrain, heightAt } from './terrain.js';
import { createSky, SUN_DIR } from './sky.js';
import { createRocks } from './rocks.js';
import { createMoons } from './moons.js';
import { createDust } from './dust.js';
import { createRover } from './rover.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const FOG = new THREE.Color(0xc9925f);
scene.fog = new THREE.FogExp2(FOG, 0.0042);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 3000);
camera.position.set(-4, heightAt(-4, 9) + 3, 9);

// La cámara orbita alrededor del rover (mouse) y lo sigue cuando se mueve
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, heightAt(0, 0) + 1.2, 0);
controls.minDistance = 4;
controls.maxDistance = 60;
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.49;
controls.update();

// Luz de tarde: sol bajo, cálido; cielo polvoriento rellena las sombras
const sun = new THREE.DirectionalLight(0xffc48a, 3.2);
sun.position.copy(SUN_DIR).multiplyScalar(120);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -80;
sun.shadow.camera.right = 80;
sun.shadow.camera.top = 80;
sun.shadow.camera.bottom = -80;
sun.shadow.camera.far = 400;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.04;
sun.shadow.radius = 6;
scene.add(sun, sun.target);

scene.add(new THREE.HemisphereLight(0xe8b98a, 0x6b3a1f, 0.9));

scene.add(createSky());
scene.add(createTerrain());
scene.add(createRocks());
scene.add(createMoons(camera));
const dust = createDust();
scene.add(dust);
const rover = createRover(scene);
const followed = new THREE.Vector3().copy(rover.object.position);
const delta = new THREE.Vector3();
const chase = new THREE.Vector3();
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function step(dt) {
  rover.update(dt);
  // Desplaza cámara y objetivo lo mismo que avanzó el rover
  delta.subVectors(rover.object.position, followed);
  followed.copy(rover.object.position);
  camera.position.add(delta);
  controls.target.add(delta);
  // Al manejar, la cámara se acomoda suavemente detrás del rover
  if (Math.abs(rover.state.speed) > 0.1) {
    const h = rover.state.heading;
    chase.set(Math.sin(h) * 9, 4, Math.cos(h) * 9).add(rover.object.position);
    camera.position.lerp(chase, 1 - Math.exp(-2.5 * dt));
  }
  const ground = heightAt(camera.position.x, camera.position.z) + 1.5;
  if (camera.position.y < ground) camera.position.y = ground;
  // La sombra sigue al rover
  sun.target.position.copy(rover.object.position);
  sun.position.copy(rover.object.position).addScaledVector(SUN_DIR, 120);
  controls.update();
}

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  step(Math.min(clock.getDelta(), 0.05));
  dust.userData.update(clock.elapsedTime, camera);
  renderer.render(scene, camera);
});

// Hook para `npm run check`: el Chrome invisible renderiza a pocos FPS,
// así que avanza la simulación con pasos fijos sin depender del reloj
window.__simulate = (seconds) => {
  for (let i = 0; i < seconds * 60; i++) step(1 / 60);
};
