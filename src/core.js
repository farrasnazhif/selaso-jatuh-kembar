import * as THREE from "three";

const V3 = THREE.Vector3,
  V2 = THREE.Vector2;
const params = new URLSearchParams(location.search);

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({
  powerPreference: "high-performance",
  preserveDrawingBuffer: params.has("shot"),
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2("#bcd3e8", 0.004);
const camera = new THREE.PerspectiveCamera(
  70,
  innerWidth / innerHeight,
  0.05,
  2000,
);
camera.rotation.order = "YXZ";

const colliders = [],
  walkables = [];
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const setSeed = (s) => (seed = s);

export { V2, V3, camera, colliders, params, renderer, rnd, scene, setSeed, walkables };
