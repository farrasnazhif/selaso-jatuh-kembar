import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { V3, rnd, scene, setSeed } from "./core.js";
import { T, ctex } from "./textures.js";
import { M, alphaDepth, block, boxAt, lampMats, std } from "./materials.js";
import { CH, FH } from "./house.js";

// ---------- lights ----------
const sun = new THREE.DirectionalLight("#fff4e0", 3);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, {
  left: -36,
  right: 36,
  top: 36,
  bottom: -36,
  near: 1,
  far: 220,
});
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
sun.target.position.set(0, 4, 2);
scene.add(sun, sun.target);

const interior = new THREE.Group();
scene.add(interior);
for (const x of [-3, 3])
  for (const z of [3, -1.5, -5.5]) {
    const l = new THREE.PointLight("#ffe0b5", 16, 16, 2);
    l.position.set(x, CH - 1.3, z);
    interior.add(l);
    const bulb = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 0.14, 16),
      std({ color: "#fff", emissive: "#fff1d6", emissiveIntensity: 6 }),
    );
    bulb.position.set(x, CH - 0.07, z);
    interior.add(bulb);
  }
for (const x of [-4.5, 4.5]) {
  const s = new THREE.SpotLight("#ffd49a", 260, 18, 0.55, 0.6, 2);
  s.position.set(x, CH - 0.3, -2.5);
  s.target.position.set(x * 0.25, FH, -8.8);
  s.castShadow = true;
  s.shadow.mapSize.set(1024, 1024);
  s.shadow.bias = -0.0006;
  interior.add(s, s.target);
}
const nightLights = [];
function nightLight(x, y, z, max, color = "#ffb763", dist = 16) {
  const l = new THREE.PointLight(color, 0, dist, 2);
  l.position.set(x, y, z);
  scene.add(l);
  nightLights.push([l, max]);
}
nightLight(0, 5.4, 10.6, 30);
for (const s of [-1, 1]) {
  // ground floodlights washing the facade
  const f = new THREE.SpotLight("#ffc58a", 0, 45, 0.42, 0.7, 2);
  f.position.set(s * 10, 0.3, 22);
  f.target.position.set(s * 2, 11, 7);
  f.castShadow = s > 0;
  f.shadow.mapSize.set(1024, 1024);
  f.shadow.bias = -0.0005;
  scene.add(f, f.target);
  nightLights.push([f, 900]);
}
nightLight(-8, 4.4, 10.6, 14);
nightLight(8, 4.4, 10.6, 14);

// ---------- vegetation, lamps ----------
const leafMat = std({
  map: T.frond,
  alphaTest: 0.5,
  side: THREE.DoubleSide,
  roughness: 0.75,
});
const leafDepth = alphaDepth(T.frond);
const trunkMat = std({ color: "#76644f", roughness: 1 });
function palm(x, z, h, lean, rot) {
  const g = new THREE.Group();
  const c = new THREE.CatmullRomCurve3([
    new V3(0, 0, 0),
    new V3(lean * 0.2, h * 0.35, 0),
    new V3(lean * 0.7, h * 0.7, 0),
    new V3(lean, h, 0),
  ]);
  const trunk = new THREE.Mesh(
    new THREE.TubeGeometry(c, 20, 0.2, 8),
    trunkMat,
  );
  trunk.castShadow = true;
  g.add(trunk);
  const top = c.getPoint(1);
  for (let i = 0; i < 12; i++) {
    const L = 3.6 + rnd() * 1.4,
      fg = new THREE.PlaneGeometry(L, 1.1, 12, 1);
    fg.rotateX(-Math.PI / 2);
    fg.translate(L / 2, 0, 0);
    const p = fg.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const u = p.getX(k);
      p.setY(k, 0.5 * u - 0.13 * u * u - Math.abs(p.getZ(k)) * 0.3);
    }
    fg.computeVertexNormals();
    const f = new THREE.Mesh(fg, leafMat);
    f.customDepthMaterial = leafDepth;
    f.castShadow = true;
    f.position.copy(top);
    f.rotation.set(
      0,
      (i / 12) * Math.PI * 2 + rnd() * 0.3,
      (rnd() - 0.4) * 0.5,
    );
    g.add(f);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  scene.add(g);
  block(x - 0.3, x + 0.3, 0, 3, z - 0.3, z + 0.3);
}
setSeed(99);
for (const [x, z, h] of [
  [-19, -5, 9],
  [-17.5, 13, 10],
  [19, 9, 11],
  [20, -7, 9],
  [-27, 26, 12],
  [27, 30, 10],
  [-14, -19, 10],
  [15, -21, 12],
  [31, 4, 9],
  [-32, 6, 11],
  [-29, -14, 10],
  [33, -16, 12],
  [8, -26, 11],
  [-6, -27, 9],
])
  palm(x, z, h, 1 + rnd() * 1.8, rnd() * 6.28);

const flowers = [];
const bushMat = [0, 1, 2].map((i) =>
  std({
    color: ["#2f5e22", "#3d6f28", "#284f1e"][i],
    roughness: 0.9,
    flatShading: true,
  }),
);
function bush(x, z, s) {
  for (let k = 0; k < 3; k++) {
    const r = s * (0.45 + rnd() * 0.35),
      m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), bushMat[k]);
    m.position.set(
      x + (rnd() - 0.5) * s,
      r * 0.75,
      z + (rnd() - 0.5) * s * 0.6,
    );
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    for (let f = 0; f < 7; f++) {
      const d = new V3(rnd() - 0.5, rnd() * 0.9, rnd() - 0.5)
        .normalize()
        .multiplyScalar(r * 0.98);
      flowers.push(d.add(m.position));
    }
  }
}
for (let x = -12.5; x <= 12.5; x += 1.5)
  if (Math.abs(x) > 5.4) bush(x, 11.2 + rnd() * 0.4, 1 + rnd() * 0.4);
for (const x of [-3.9, 3.9]) bush(x, 14.5, 1.1);
for (let z = -9; z <= 9; z += 1.8) {
  bush(-14.2, z, 1 + rnd() * 0.3);
  bush(14.2, z, 1 + rnd() * 0.3);
}
{
  const im = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.07, 6, 4),
      std({ roughness: 0.6 }),
      flowers.length,
    ),
    mt = new THREE.Matrix4(),
    col = new THREE.Color();
  flowers.forEach((p, i) => {
    im.setMatrixAt(i, mt.makeTranslation(p.x, p.y, p.z));
    im.setColorAt(i, col.set(["#e2244a", "#ff6fa0", "#f2d23c"][i % 3]));
  });
  scene.add(im);
}
{
  // distant jungle: a painted treeline ring
  const t = ctex(
    2048,
    256,
    (g, w, h) => {
      for (let i = 0; i < 30; i++) {
        // palm silhouettes poking above the canopy
        const x = rnd() * w,
          top = 20 + rnd() * 60;
        g.strokeStyle = "#1d3518";
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(x, h);
        g.quadraticCurveTo(
          x + 10,
          (h + top) / 2,
          x + rnd() * 16 - 8,
          top,
        );
        g.stroke();
        g.lineWidth = 4;
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * Math.PI * 2;
          g.beginPath();
          g.moveTo(x, top);
          g.quadraticCurveTo(
            x + Math.cos(a) * 22,
            top - 10,
            x + Math.cos(a) * 34,
            top + 14 + Math.abs(Math.sin(a)) * 6,
          );
          g.stroke();
        }
      }
      for (let i = 0; i < 900; i++) {
        const x = rnd() * w,
          y = 95 + rnd() * 120,
          r = 12 + rnd() * 30;
        g.fillStyle = `hsl(${95 + rnd() * 30},${30 + rnd() * 20}%,${10 + rnd() * 12}%)`;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = "#16260f";
      g.fillRect(0, 200, w, 56);
    },
    4,
    1,
  );
  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(130, 130, 34, 96, 1, true),
    std({ map: t, alphaTest: 0.5, side: THREE.BackSide, roughness: 1 }),
  );
  ring.position.y = 15;
  scene.add(ring);
}
function lamp(x, z) {
  boxAt(x - 0.18, x + 0.18, 0, 0.3, z - 0.18, z + 0.18, M.white, {
    collide: true,
  });
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 3.6, 8),
    std({ color: "#25332a", roughness: 0.5, metalness: 0.6 }),
  );
  pole.position.set(x, 1.8, z);
  pole.castShadow = true;
  scene.add(pole);
  const mat = std({
    color: "#fff8ea",
    emissive: "#ffd59a",
    emissiveIntensity: 0,
    roughness: 0.2,
  });
  lampMats.push(mat);
  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 20, 14),
    mat,
  );
  globe.position.set(x, 3.8, z);
  scene.add(globe);
  nightLight(x, 3.8, z, 22, "#ffd08a", 18);
}
for (const [x, z] of [
  [-7, 18],
  [7, 18],
  [-7, 28],
  [7, 28],
  [-17, 36],
  [17, 36],
])
  lamp(x, z);

// ---------- sky, stars, moon ----------
const sky = new Sky();
sky.scale.setScalar(1000);
scene.add(sky);
const stars = (() => {
  const p = [];
  for (let i = 0; i < 2000; i++) {
    const v = new V3(rnd() - 0.5, rnd() * 0.9 + 0.05, rnd() - 0.5)
      .normalize()
      .multiplyScalar(800);
    p.push(v.x, v.y, v.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  const s = new THREE.Points(
    g,
    new THREE.PointsMaterial({
      size: 1.6,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    }),
  );
  scene.add(s);
  return s;
})();
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(14, 32, 16),
  new THREE.MeshBasicMaterial({
    color: "#f6f1e0",
    fog: false,
    transparent: true,
    opacity: 0,
  }),
);
moon.position.setFromSphericalCoords(
  700,
  THREE.MathUtils.degToRad(52),
  THREE.MathUtils.degToRad(-35),
);
scene.add(moon);

export { moon, nightLights, sky, stars, sun };
