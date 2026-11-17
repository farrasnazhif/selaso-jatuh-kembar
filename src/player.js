import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { V3, camera, colliders, walkables } from "./core.js";
import { FH, VH } from "./house.js";

// ---------- player / controls ----------
const overlay = document.getElementById("overlay");
const setMode = (m) => (mode = m);
const controls = new PointerLockControls(camera, document.body);
const keys = {};
const player = { pos: new V3(0, 0, 36), vy: 0, bob: 0 };
const R = 0.25,
  EYE = 1.65,
  ray = new THREE.Raycaster(),
  DOWN = new V3(0, -1, 0);
function blocked(x, z, feet) {
  for (const b of colliders)
    if (
      x > b.min.x - R &&
      x < b.max.x + R &&
      z > b.min.z - R &&
      z < b.max.z + R &&
      feet + 0.45 < b.max.y &&
      feet + 1.75 > b.min.y
    )
      return true;
  return false;
}
function groundAt(x, z, fromY) {
  ray.set(new V3(x, fromY, z), DOWN);
  ray.far = 50;
  const h = ray.intersectObjects(walkables, false)[0];
  return h ? h.point.y : 0;
}
function tryMove(dx, dz) {
  const p = player.pos,
    nx = p.x + dx,
    nz = p.z + dz;
  if (blocked(nx, nz, p.y)) return false;
  if (groundAt(nx, nz, p.y + 0.6) - p.y > 0.5) return false;
  p.x = THREE.MathUtils.clamp(nx, -120, 120);
  p.z = THREE.MathUtils.clamp(nz, -120, 120);
  return true;
}
function walk(dt) {
  const f = new V3();
  camera.getWorldDirection(f);
  f.y = 0;
  f.normalize();
  const r = new V3(-f.z, 0, f.x);
  const mv = new V3()
    .addScaledVector(
      f,
      (keys.KeyW || keys.ArrowUp ? 1 : 0) -
        (keys.KeyS || keys.ArrowDown ? 1 : 0),
    )
    .addScaledVector(
      r,
      (keys.KeyD || keys.ArrowRight ? 1 : 0) -
        (keys.KeyA || keys.ArrowLeft ? 1 : 0),
    );
  const moving = mv.lengthSq() > 0;
  if (moving) {
    mv.normalize().multiplyScalar(
      (keys.ShiftLeft || keys.ShiftRight ? 6.5 : 3.2) * dt,
    );
    tryMove(mv.x, 0);
    tryMove(0, mv.z);
  }
  const p = player.pos,
    g = groundAt(p.x, p.z, p.y + 0.6);
  if (g > p.y) {
    p.y += (g - p.y) * Math.min(1, dt * 18);
    player.vy = 0;
  } else {
    player.vy -= 22 * dt;
    p.y = Math.max(g, p.y + player.vy * dt);
    if (p.y === g) player.vy = 0;
  }
  if (keys.Space && p.y - g < 0.02) player.vy = 5.5;
  player.bob +=
    moving && p.y - g < 0.05 ? dt * (keys.ShiftLeft ? 14 : 9) : 0;
  camera.position.set(p.x, p.y + EYE + Math.sin(player.bob) * 0.045, p.z);
}

const SPOTS = [
  { p: [0, 0, 29], yaw: 0, name: "The plaza" },
  {
    p: [-11.6, VH, 8.6],
    yaw: -Math.PI / 2 - 0.35,
    name: "Selaso, the lower veranda",
  },
  { p: [0, FH, 4.6], yaw: 0, name: "Balai, the main hall" },
  { p: [1.5, FH, -3.2], yaw: 0.25, name: "Pelaminan, the royal dais" },
];
function teleport(i) {
  const s = SPOTS[i];
  player.pos.set(...s.p);
  player.vy = 0;
  camera.rotation.set(-0.04, s.yaw, 0);
  camera.position.set(s.p[0], s.p[1] + EYE, s.p[2]);
  caption(s.name);
}
const capEl = document.getElementById("caption");
let capTimer;
function caption(text) {
  capEl.textContent = text;
  capEl.style.opacity = 1;
  clearTimeout(capTimer);
  capTimer = setTimeout(() => (capEl.style.opacity = 0), 3200);
}

// ---------- cinematic tour ----------
const tourPos = new THREE.CatmullRomCurve3(
  [
    [36, 17, 48],
    [16, 9, 38],
    [3, 4, 27],
    [0, 2.6, 19],
    [0, 2.6, 15.2],
    [0, 3.9, 11.4],
    [-2.5, 3.75, 9.0],
    [0, 4.05, 6.6],
    [0, 4.05, 2.5],
    [2.4, 4.1, -1.5],
    [0.6, 4.2, -4.6],
  ].map((p) => new V3(...p)),
  false,
  "centripetal",
);
const tourLook = new THREE.CatmullRomCurve3(
  [
    [0, 9, 0],
    [0, 8.5, 0],
    [0, 7, 0],
    [0, 6, 6],
    [0, 4.6, 6],
    [-8, 3.9, 9],
    [-12, 3.7, 7],
    [0, 4, 0],
    [0, 3.8, -7],
    [-1, 3.8, -9],
    [0, 3.9, -9.5],
  ].map((p) => new V3(...p)),
  false,
  "centripetal",
);
const TOUR_LEN = 52,
  tourCaps = [
    [0, "Selaso Jatuh Kembar"],
    [0.18, "Selembayung: crossed horns crowning the gables"],
    [0.38, 'Two lower verandas, the "twin fallen" selaso'],
    [0.62, "Balai, the main hall"],
    [0.84, "Pelaminan, the royal dais"],
  ];
let mode = "orbit",
  tourT = 0,
  capIdx = -1;
const lookTmp = new V3();
function startTour(t0 = 0) {
  mode = "tour";
  tourT = t0;
  capIdx = -1;
  overlay.classList.add("hidden");
}
function endTour() {
  mode = "walk";
  player.pos.set(
    camera.position.x,
    groundAt(camera.position.x, camera.position.z, camera.position.y),
    camera.position.z,
  );
  overlay.classList.remove("hidden");
  document.getElementById("explore").textContent = "Explore on foot";
}
function tour(dt) {
  tourT = Math.min(1, tourT + dt / TOUR_LEN);
  const t =
    tourT < 0.5 ? 2 * tourT * tourT : 1 - Math.pow(-2 * tourT + 2, 2) / 2;
  const e = 0.5 * t + 0.5 * tourT; // mostly linear with soft ends
  camera.position.copy(tourPos.getPointAt(e));
  lookTmp.lerp(
    tourLook.getPointAt(e),
    tourT < 0.001 ? 1 : Math.min(1, dt * 3),
  );
  camera.lookAt(lookTmp);
  const ci = tourCaps.findLastIndex((c) => tourT >= c[0]);
  if (ci !== capIdx) {
    capIdx = ci;
    caption(tourCaps[ci][1]);
  }
  if (tourT >= 1) endTour();
}

export { controls, endTour, keys, mode, player, setMode, startTour, teleport, tour, walk };
