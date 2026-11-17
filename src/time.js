import * as THREE from "three";
import { V3, renderer, scene } from "./core.js";
import { ctex } from "./textures.js";
import { glowMats, lampMats, pmrem } from "./materials.js";
import { moon, nightLights, sky, stars, sun } from "./world.js";
import { bloom } from "./post.js";

// the Sky shader turns muddy grey once the sun is down, so night swaps in a painted gradient
const nightSky = ctex(4, 256, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, "#01030a");
  gr.addColorStop(0.38, "#07122a");
  gr.addColorStop(0.5, "#1a2d55");
  gr.addColorStop(0.52, "#0b1222");
  gr.addColorStop(1, "#030407");
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
});
nightSky.mapping = THREE.EquirectangularReflectionMapping;
let nightEnv = null;
const envScene = new THREE.Scene();
let envRT = null;
function updateEnv() {
  const useNight = cur.night > 0.75;
  sky.visible = !useNight;
  scene.background = useNight ? nightSky : null;
  if (useNight) {
    scene.environment = nightEnv ||=
      pmrem.fromEquirectangular(nightSky).texture;
    return;
  }
  envScene.add(sky);
  const rt = pmrem.fromScene(envScene, 0, 0.1, 2000);
  scene.add(sky);
  if (envRT) envRT.dispose();
  envRT = rt;
  scene.environment = rt.texture;
}

// ---------- time of day ----------
const PRESETS = {
  day: {
    el: 38,
    az: -38,
    lightEl: 38,
    lightAz: -38,
    turb: 1.8,
    ray: 0.9,
    mie: 0.003,
    sunI: 3.6,
    sunC: "#fff2dc",
    exp: 0.5,
    env: 0.9,
    fog: "#a9c4e2",
    fogD: 0.0065,
    night: 0,
    bloom: 0.18,
  },
  golden: {
    el: 6,
    az: -18,
    lightEl: 6,
    lightAz: -18,
    turb: 9,
    ray: 2.6,
    mie: 0.006,
    sunI: 3.2,
    sunC: "#ffa35a",
    exp: 0.58,
    env: 0.65,
    fog: "#d6a888",
    fogD: 0.0055,
    night: 0.45,
    bloom: 0.4,
  },
  night: {
    el: -4,
    az: -30,
    lightEl: 38,
    lightAz: -35,
    turb: 1.5,
    ray: 0.45,
    mie: 0.003,
    sunI: 0.7,
    sunC: "#7f9cff",
    exp: 0.75,
    env: 0.35,
    fog: "#0a1322",
    fogD: 0.012,
    night: 1,
    bloom: 0.85,
  },
};
const cur = { ...PRESETS.day },
  from = { ...PRESETS.day };
let target = PRESETS.day,
  tBlend = 1,
  presetName = "day";
const col = (a, b, t) =>
  "#" + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
function setTime(name) {
  Object.assign(from, cur);
  target = PRESETS[name];
  tBlend = 0;
  presetName = name;
  document
    .querySelectorAll("#time button")
    .forEach((b) => b.classList.toggle("on", b.dataset.t === name));
}
const deg = THREE.MathUtils.degToRad;
// jump straight to a preset (used on startup)
function snapTime(name) {
  setTime(name);
  tBlend = 0.999;
  applyTime(1, 0);
}
function applyTime(dt, frame) {
  if (tBlend >= 1) return;
  tBlend = Math.min(1, tBlend + dt / 2.2);
  const t = tBlend * tBlend * (3 - 2 * tBlend);
  for (const k in target)
    cur[k] =
      typeof target[k] === "string"
        ? col(from[k], target[k], t)
        : from[k] + (target[k] - from[k]) * t;
  const u = sky.material.uniforms,
    sp = new V3().setFromSphericalCoords(
      1,
      deg(90 - cur.el),
      deg(cur.az),
    );
  u.sunPosition.value.copy(sp);
  u.turbidity.value = cur.turb;
  u.rayleigh.value = cur.ray;
  u.mieCoefficient.value = cur.mie;
  u.mieDirectionalG.value = 0.85;
  sun.position
    .setFromSphericalCoords(110, deg(90 - cur.lightEl), deg(cur.lightAz))
    .add(sun.target.position);
  sun.intensity = cur.sunI;
  sun.color.set(cur.sunC);
  renderer.toneMappingExposure = cur.exp;
  scene.fog.color.set(cur.fog);
  scene.fog.density = cur.fogD;
  bloom.strength = cur.bloom;
  const n = cur.night;
  for (const m of lampMats) m.emissiveIntensity = n * 3;
  for (const m of glowMats) m.emissiveIntensity = n * 2.5;
  for (const [l, max] of nightLights) l.intensity = n * max;
  stars.material.opacity = Math.max(0, n * 1.4 - 0.4);
  moon.material.opacity = stars.material.opacity;
  if (tBlend === 1 || frame % 8 === 0) updateEnv();
}

export { PRESETS, applyTime, cur, presetName, setTime, snapTime };
