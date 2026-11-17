import "./core.js";
import "./textures.js";
import "./materials.js";
import "./house.js";
import "./world.js";
import "./post.js";
import "./time.js";
import "./player.js";
import * as THREE from "three";
import { camera, params, renderer, scene } from "./core.js";
import { HX, HZ0, HZ1, VH, mirror } from "./house.js";
import { composer } from "./post.js";
import { PRESETS, applyTime, cur, presetName, setTime, snapTime } from "./time.js";
import { controls, endTour, keys, mode, player, setMode, startTour, teleport, tour, walk } from "./player.js";

// ---------- UI ----------
const overlay = document.getElementById("overlay"),
  cross = document.getElementById("cross");
document.getElementById("explore").onclick = () => {
  if (mode !== "walk") {
    setMode("walk");
    teleport(0);
  }
  controls.lock();
};
document.getElementById("tour").onclick = () => startTour();
document.querySelectorAll("#time button").forEach(
  (b) =>
    (b.onclick = (e) => {
      e.stopPropagation();
      setTime(b.dataset.t);
    }),
);
controls.addEventListener("lock", () => {
  overlay.classList.add("hidden");
  cross.style.display = "block";
});
controls.addEventListener("unlock", () => {
  cross.style.display = "none";
  if (mode === "walk") {
    overlay.classList.remove("hidden");
    document.getElementById("explore").textContent = "Resume";
  }
});
addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (e.code === "KeyN")
    setTime({ day: "golden", golden: "night", night: "day" }[presetName]);
  if (mode === "walk" && /^Digit[1-4]$/.test(e.code))
    teleport(+e.code.slice(5) - 1);
  if (mode === "tour" && e.code === "Escape") endTour();
});
addEventListener("keyup", (e) => (keys[e.code] = false));
addEventListener("blur", () => {
  for (const k in keys) keys[k] = false;
});
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// ---------- loop ----------
const startTime = params.get("time");
snapTime(PRESETS[startTime] ? startTime : "day");
if (params.has("shot")) overlay.style.display = "none";
if (params.has("spot")) {
  setMode("walk");
  teleport(+params.get("spot") - 1);
  overlay.classList.add("hidden");
}
if (params.has("tour")) {
  startTour(+params.get("tour"));
}

const clock = new THREE.Clock();
let frame = 0,
  inside = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  frame++;
  if (mode === "orbit") {
    const a = clock.elapsedTime * 0.06 + 0.5;
    camera.position.set(
      Math.sin(a) * 42,
      13 + Math.sin(a * 0.7) * 3,
      Math.cos(a) * 42 + 4,
    );
    camera.lookAt(0, 8, 0);
  } else if (mode === "tour") tour(dt);
  else if (controls.isLocked) walk(dt);
  applyTime(dt, frame);
  const c = camera.position,
    isIn =
      c.x > -HX - 1 &&
      c.x < HX + 1 &&
      c.z > HZ0 - 1 &&
      c.z < HZ1 + 3 &&
      c.y > VH;
  inside += ((isIn ? 1 : 0) - inside) * Math.min(1, dt * 3);
  mirror.visible =
    c.x > -HX && c.x < HX && c.z > HZ0 && c.z < HZ1 + 5 && c.y > VH; // skip the mirror pass outside
  scene.environmentIntensity = cur.env * (1 - 0.72 * inside);
  composer.render(dt);
});

// headless self-check: walk straight in from the plaza (should end on the dais, stopped by the throne)
// and walk into the house at x=6 (should stop at the platform edge, z≈10.25, y=0)
if (params.has("selftest")) {
  scene.updateMatrixWorld(true);
  const run = (x) => {
    setMode("walk");
    teleport(0);
    player.pos.x = x;
    keys.KeyW = true;
    for (let i = 0; i < 1800; i++) walk(1 / 60);
    keys.KeyW = false;
    return player.pos
      .toArray()
      .map((v) => v.toFixed(2))
      .join(",");
  };
  document.title = "SELFTEST " + run(0) + " | " + run(6);
}
