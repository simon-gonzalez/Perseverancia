import * as THREE from 'three';

// Sol de tarde, bajo sobre el horizonte
export const SUN_DIR = new THREE.Vector3(0.55, 0.22, -0.8).normalize();

export function createSky() {
  const geo = new THREE.SphereGeometry(1500, 48, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { sunDir: { value: SUN_DIR } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position.z = gl_Position.w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 sunDir;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y, -0.1, 1.0);
        vec3 horizon = vec3(0.78, 0.47, 0.27);
        vec3 zenith  = vec3(0.30, 0.15, 0.10);
        vec3 col = mix(horizon, zenith, pow(max(h, 0.0), 0.55));
        float s = max(dot(d, sunDir), 0.0);
        // En Marte el polvo vuelve azulado el halo alrededor del sol
        col = mix(col, vec3(0.55, 0.62, 0.70), pow(s, 60.0) * 0.55);
        col += vec3(1.0, 0.70, 0.45) * pow(s, 12.0) * 0.18;
        col += vec3(1.0, 0.92, 0.80) * smoothstep(0.99975, 0.99990, s) * 3.0;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  return new THREE.Mesh(geo, mat);
}
