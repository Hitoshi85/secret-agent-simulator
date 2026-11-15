// Renderer, light (a warm late afternoon), sky, fog and the ground.
import * as THREE from 'three';
import { RIVER } from './world/city.js';
import { skyTex, pavingTex } from './world/textures.js';

export function makeRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); // phones: cap at 2x for speed
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFShadowMap;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.outputColorSpace = THREE.SRGBColorSpace;
  return r;
}

export function makeScene() {
  const scene = new THREE.Scene();
  const skyT = skyTex(['#6fa3d6', '#bcd7ea', '#f6e2c2']);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 24, 12), new THREE.MeshBasicMaterial({ map: skyT, side: THREE.BackSide, fog: false, depthWrite: false }));
  const uv = sky.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, Math.min(1, Math.max(0, (uv.getY(i) - 0.5) * 2.4)));
  sky.renderOrder = -1; scene.add(sky);
  scene.fog = new THREE.Fog('#e6d9c3', 220, 1100);

  scene.add(new THREE.HemisphereLight('#fff4e0', '#8a7560', 1.35));
  const sun = new THREE.DirectionalLight('#ffe8c4', 2.7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 10, far: 600 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const SUN_DIR = new THREE.Vector3(-0.55, 0.62, 0.55).normalize(); // low in the west-southwest

  const pav = pavingTex(); pav.repeat.set(160, 160);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshStandardMaterial({ map: pav, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  // Cut the river out by splitting the ground into a north and a south half.
  const north = ground.clone(); north.scale.set(1, (1200 + RIVER[1]) / 2400, 1); north.position.set(0, 0, (RIVER[1] - 1200) / 2);
  const south = ground.clone(); south.scale.set(1, (1200 - RIVER[3] + 300) / 2400, 1); south.position.set(0, 0, (RIVER[3] + 1500) / 2);
  north.material = north.material.clone(); north.material.map = pav.clone(); north.material.map.repeat.set(160, 160 * north.scale.y); north.material.map.needsUpdate = true;
  south.material = south.material.clone(); south.material.map = pav.clone(); south.material.map.repeat.set(160, 160 * south.scale.y); south.material.map.needsUpdate = true;
  scene.add(north, south);

  // The shadow box follows the agent, so shadows stay sharp near the player.
  const followSun = (x, z) => {
    sun.target.position.set(x, 0, z);
    sun.position.set(x + SUN_DIR.x * 300, SUN_DIR.y * 300, z + SUN_DIR.z * 300);
  };
  return { scene, sun, sky, followSun };
}
