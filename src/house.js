import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { V2, scene, walkables } from "./core.js";
import { T, rep } from "./textures.js";
import { M, block, boxAt, gable, lampMats, roomEnv, skirt, std, strip } from "./materials.js";

// ---------- layout constants ----------
const VH = 2.0,
  FH = 2.4,
  CH = 7.4; // veranda floor, hall floor, ceiling
const HX = 10,
  HZ0 = -10,
  HZ1 = 6; // hall interior
const VX = 13.2,
  VZ0 = -10.2,
  VZ1 = 10.2; // veranda platform

// ---------- ground ----------
{
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    std({ map: T.grass, roughness: 1 }),
  );
  grass.rotation.x = -Math.PI / 2;
  grass.receiveShadow = true;
  scene.add(grass);
  walkables.push(grass);
  const pave = new THREE.Mesh(
    new THREE.PlaneGeometry(48, 60),
    std({ map: rep(T.paving, 48 / 4, 60 / 4), roughness: 0.85 }),
  );
  pave.rotation.x = -Math.PI / 2;
  pave.position.set(0, 0.015, 12);
  pave.receiveShadow = true;
  scene.add(pave);
  walkables.push(pave);
  // painted curbs
  const curb = std({ color: "#d8c04a", roughness: 0.7 });
  boxAt(-24, 24, 0, 0.12, 41.8, 42.2, curb);
  boxAt(-24.2, -23.8, 0, 0.12, -18, 42, curb);
  boxAt(23.8, 24.2, 0, 0.12, -18, 42, curb);
}

// ---------- platform, piers, stairs ----------
boxAt(
  -VX,
  VX,
  1.4,
  VH,
  VZ0,
  VZ1,
  [M.tepas, M.tepas, M.verFloor, M.tepas, M.tepas, M.tepas],
  { walk: true },
);
block(-VX, VX, 0, VH, VZ0, 10.0); // can't walk under the house
boxAt(-12.8, 12.8, 0, 1.4, -9.8, 9.8, M.dark, { cast: false });
{
  const geo = new THREE.BoxGeometry(0.55, 1.4, 0.55),
    pts = [];
  for (let x = -VX + 0.3; x <= VX; x += 3.27) {
    if (Math.abs(x) > 3) pts.push([x, VZ1 - 0.3]);
    pts.push([x, VZ0 + 0.3]);
  }
  for (let z = -6; z <= 6; z += 4)
    pts.push([-VX + 0.3, z], [VX - 0.3, z]);
  const im = new THREE.InstancedMesh(geo, M.pier, pts.length),
    mt = new THREE.Matrix4();
  pts.forEach(([x, z], i) =>
    im.setMatrixAt(i, mt.makeTranslation(x, 0.7, z)),
  );
  im.castShadow = im.receiveShadow = true;
  scene.add(im);
}
const STEPS = 9,
  RUN = 0.35;
for (let i = 0; i < STEPS; i++) {
  const top = VH - (i + 1) * (VH / (STEPS + 1)) + 0.02,
    z0 = VZ1 + i * RUN;
  boxAt(
    -2.5,
    2.5,
    0,
    top,
    z0,
    z0 + RUN,
    [M.peach, M.peach, M.stairTop, M.peach, M.peach, M.peach],
    { walk: true },
  );
}
{
  const L = STEPS * RUN,
    sh = new THREE.Shape([
      new V2(0, 0),
      new V2(L + 0.5, 0),
      new V2(L + 0.5, 0.95),
      new V2(L * 0.55, 1.6),
      new V2(0, VH + 1.05),
    ]);
  const geo = new THREE.ExtrudeGeometry(sh, {
    depth: 0.32,
    bevelEnabled: true,
    bevelSize: 0.03,
    bevelThickness: 0.03,
    bevelSegments: 2,
  });
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(geo, M.pink);
    m.rotation.y = -Math.PI / 2;
    m.position.set(s < 0 ? -2.5 : 2.82, 0, VZ1);
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    const x0 = s < 0 ? -2.86 : 2.5;
    block(x0, x0 + 0.36, 0, 3.2, VZ1, VZ1 + L + 0.5);
    boxAt(
      x0 - 0.05,
      x0 + 0.41,
      0,
      1.45,
      VZ1 + L + 0.2,
      VZ1 + L + 0.66,
      M.maroon,
      { collide: true },
    );
    boxAt(
      x0 - 0.12,
      x0 + 0.48,
      1.45,
      1.6,
      VZ1 + L + 0.13,
      VZ1 + L + 0.73,
      M.trim,
    );
  }
}

// ---------- veranda: columns, railings, lanterns ----------
{
  const bal = [];
  const rail = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0),
      alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const bx = alongX
      ? [Math.min(x0, x1), Math.max(x0, x1), z0 - 0.06, z0 + 0.06]
      : [x0 - 0.06, x0 + 0.06, Math.min(z0, z1), Math.max(z0, z1)];
    boxAt(
      bx[0],
      bx[1],
      VH + 0.95,
      VH + 1.07,
      bx[2] - 0.02,
      bx[3] + 0.02,
      M.post,
    );
    boxAt(bx[0], bx[1], VH + 0.08, VH + 0.16, bx[2], bx[3], M.post);
    block(
      bx[0] - 0.05,
      bx[1] + 0.05,
      VH,
      VH + 1.1,
      bx[2] - 0.05,
      bx[3] + 0.05,
    );
    for (let t = 0.1; t < len; t += 0.17)
      bal.push([x0 + ((x1 - x0) * t) / len, z0 + ((z1 - z0) * t) / len]);
  };
  const e = 0.1;
  rail(-VX + e, VZ1 - e, -2.55, VZ1 - e);
  rail(2.55, VZ1 - e, VX - e, VZ1 - e);
  rail(-VX + e, VZ0 + e, -VX + e, VZ1 - e);
  rail(VX - e, VZ0 + e, VX - e, VZ1 - e);
  rail(-VX + e, VZ0 + e, -HX - 0.2, VZ0 + e);
  rail(HX + 0.2, VZ0 + e, VX - e, VZ0 + e);
  const geo = new THREE.CylinderGeometry(0.03, 0.04, 0.8, 6),
    im = new THREE.InstancedMesh(geo, M.post, bal.length),
    mt = new THREE.Matrix4();
  bal.forEach(([x, z], i) =>
    im.setMatrixAt(i, mt.makeTranslation(x, VH + 0.55, z)),
  );
  im.castShadow = true;
  scene.add(im);

  const cols = [];
  for (const x of [-12.95, -9.6, -6.2, 6.2, 9.6, 12.95])
    cols.push([x, VZ1 - 0.25]);
  for (const z of [-9.95, -6, -2, 2, 6])
    cols.push([-12.95, z], [12.95, z]);
  for (const [x, z] of cols) {
    boxAt(x - 0.15, x + 0.15, VH, 5.5, z - 0.15, z + 0.15, M.post, {
      collide: true,
    });
    boxAt(x - 0.22, x + 0.22, 5.0, 5.18, z - 0.22, z + 0.22, M.trim);
  }
  for (const x of [-9.6, -6.2, 6.2, 9.6]) {
    // lanterns on the front columns
    const mat = std({
      color: "#fff3d0",
      emissive: "#ffb357",
      emissiveIntensity: 0,
    });
    lampMats.push(mat);
    boxAt(x - 0.13, x + 0.13, 3.9, 4.3, VZ1 - 0.12, VZ1 + 0.06, mat, {
      cast: false,
    });
    boxAt(x - 0.17, x + 0.17, 4.3, 4.38, VZ1 - 0.16, VZ1 + 0.1, M.trim);
  }
}

// ---------- hall walls ----------
const DOOR = 1.6,
  DOORH = 3.3;
const ceilingBox = [M.wall, M.wall, M.wall, M.ceiling, M.wall, M.wall];
boxAt(-HX - 0.2, HX + 0.2, VH, CH, HZ0 - 0.2, HZ0, M.wall, {
  collide: true,
});
boxAt(-HX - 0.2, -HX, VH, CH, HZ0, HZ1 + 0.2, M.wall, { collide: true });
boxAt(HX, HX + 0.2, VH, CH, HZ0, HZ1 + 0.2, M.wall, { collide: true });
boxAt(-HX, -DOOR, VH, CH, HZ1, HZ1 + 0.2, M.wall, { collide: true });
boxAt(DOOR, HX, VH, CH, HZ1, HZ1 + 0.2, M.wall, { collide: true });
boxAt(-DOOR, DOOR, FH + DOORH, CH, HZ1, HZ1 + 0.2, M.wall);
boxAt(-DOOR, DOOR, VH, FH, HZ1, HZ1 + 0.25, M.post, { walk: true }); // threshold
boxAt(-HX - 0.2, HX + 0.2, CH, 11.3, HZ0 - 0.2, HZ1 + 0.2, ceilingBox); // upper band + ceiling
// door frame + carved panel above
boxAt(
  -DOOR - 0.25,
  -DOOR,
  FH,
  FH + DOORH + 0.25,
  HZ1 + 0.2,
  HZ1 + 0.3,
  M.trim,
);
boxAt(
  DOOR,
  DOOR + 0.25,
  FH,
  FH + DOORH + 0.25,
  HZ1 + 0.2,
  HZ1 + 0.3,
  M.trim,
);
boxAt(
  -DOOR - 0.25,
  DOOR + 0.25,
  FH + DOORH,
  FH + DOORH + 0.25,
  HZ1 + 0.2,
  HZ1 + 0.3,
  M.trim,
);
{
  const p = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 1.1),
    std({ map: rep(T.porch, 1, 0.5), roughness: 0.5 }),
  );
  p.position.set(0, FH + DOORH + 0.85, HZ1 + 0.22);
  scene.add(p);
}
// windows (lattice panes poke through the wall so they read from both sides)
function windowAt(x, z, ry) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 2.25, 0.26),
    M.trim,
  );
  const pane = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.95, 0.3),
    M.lattice,
  );
  frame.castShadow = true;
  g.add(frame, pane);
  g.position.set(x, FH + 2.1, z);
  g.rotation.y = ry;
  scene.add(g);
}
for (const x of [-8, -4.6, 4.6, 8]) windowAt(x, HZ1 + 0.1, 0);
for (const z of [-7.5, -3.5, 0.5, 4]) {
  windowAt(-HX - 0.1, z, Math.PI / 2);
  windowAt(HX + 0.1, z, Math.PI / 2);
}
// carved vents in the upper band
for (let x = -8.8; x <= 8.8; x += 2.2) {
  const v = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.62), M.vent);
  v.position.set(x, 8.25, HZ1 + 0.21);
  scene.add(v);
}
for (let z = -8.6; z <= 5; z += 2.2)
  for (const s of [-1, 1]) {
    const v = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.62), M.vent);
    v.position.set(s * (HX + 0.21), 8.25, z);
    v.rotation.y = (s * Math.PI) / 2;
    scene.add(v);
  }

// ---------- roofs ----------
const hallRect = [-HX - 0.2, HX + 0.2, HZ0 - 0.2, HZ1 + 0.2];
skirt(hallRect, [-14.3, 14.3, -11.3, 11.3], 7.3, 5.4); // tier 1: over the twin lower verandas
skirt(hallRect, [-12.1, 12.1, -12.1, 8.1], 9.45, 8.35); // tier 2
gable(
  11.9,
  9.75,
  20.5,
  -11.6,
  7.7,
  std({ map: T.gable, roughness: 0.55 }),
  1.7,
); // main roof
gable(
  5.7,
  7.35,
  12.3,
  HZ1 + 0.15,
  12.5,
  std({ map: T.porch, roughness: 0.55 }),
  1.15,
  false,
); // entrance porch
for (const s of [-1, 1]) {
  boxAt(s * 4.6 - 0.2, s * 4.6 + 0.2, 0, 2.0, 11.8, 12.2, M.tepas, {
    collide: true,
  });
  boxAt(s * 4.6 - 0.14, s * 4.6 + 0.14, 2.0, 7.25, 11.86, 12.14, M.post, {
    collide: true,
  });
  boxAt(s * 4.6 - 0.14, s * 4.6 + 0.14, 7.0, 7.22, 9.5, 12.4, M.post);
}
boxAt(-5.4, 5.4, 6.95, 7.2, 11.9, 12.1, M.post);

// ---------- interior ----------
// mirror under a semi-transparent glossy plank floor: the polished-wood reflections from the photos
boxAt(
  -HX,
  HX,
  VH,
  FH,
  HZ0,
  HZ1,
  [M.wall, M.wall, M.hallTop, M.wall, M.wall, M.wall],
  { walk: true, cast: false },
);
boxAt(-HX, HX, FH - 0.03, FH - 0.02, HZ0, HZ1, M.hallUnder, {
  cast: false,
});
const mirror = new Reflector(new THREE.PlaneGeometry(2 * HX, HZ1 - HZ0), {
  textureWidth: innerWidth * 0.6,
  textureHeight: innerHeight * 0.6,
  color: 0x9a9a9a,
  clipBias: 0.003,
});
mirror.rotation.x = -Math.PI / 2;
mirror.position.set(0, FH - 0.006, (HZ0 + HZ1) / 2);
scene.add(mirror);

const carpet = new THREE.Mesh(
  new THREE.PlaneGeometry(3.4, 11.6),
  std({ map: T.carpet, roughness: 0.95 }),
);
carpet.rotation.x = -Math.PI / 2;
carpet.position.set(0, FH + 0.006, -0.4);
carpet.receiveShadow = true;
scene.add(carpet);

function curtain(len, x, z, ry) {
  const h = CH - 0.55 - FH,
    g = new THREE.PlaneGeometry(len, h, Math.ceil(len * 10), 1),
    p = g.attributes.position;
  for (let i = 0; i < p.count; i++)
    p.setZ(i, Math.sin((p.getX(i) * Math.PI * 2) / 0.55) * 0.07);
  g.computeVertexNormals();
  const mat = new THREE.MeshPhysicalMaterial({
    map: rep(T.stripes, len / 1.1, 1),
    roughness: 0.5,
    sheen: 0.8,
    sheenRoughness: 0.4,
    sheenColor: "#ffffff",
  });
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, FH + h / 2, z);
  m.rotation.y = ry;
  m.receiveShadow = true;
  scene.add(m);
  const v = strip(
    len,
    0.55,
    std({ alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5 }),
    T.valance,
  );
  v.position.set(x, CH - 0.5, z);
  v.rotation.y = ry;
  v.translateZ(0.1);
}
curtain(HZ1 - HZ0 - 0.3, -HX + 0.15, (HZ0 + HZ1) / 2 - 0.15, Math.PI / 2);
curtain(HZ1 - HZ0 - 0.3, HX - 0.15, (HZ0 + HZ1) / 2 - 0.15, -Math.PI / 2);
curtain(2 * HX - 0.3, 0, HZ0 + 0.15, 0);
// ceiling cornice + coffer frame
boxAt(-HX, HX, CH - 0.18, CH, HZ1 - 0.18, HZ1, M.white);
boxAt(-HX, HX, CH - 0.18, CH, HZ0, HZ0 + 0.18, M.white);
for (const [x0, x1, z0, z1] of [
  [-5, 5, 4, 4.25],
  [-5, 5, -6.25, -6],
  [-5, -4.75, -6, 4],
  [4.75, 5, -6, 4],
])
  boxAt(x0, x1, CH - 0.22, CH, z0, z1, M.white, { cast: false });

// turned wooden pillars with gold capitals
{
  const prof = [
    [0.34, 0],
    [0.34, 0.12],
    [0.26, 0.2],
    [0.3, 0.32],
    [0.2, 0.5],
    [0.17, 0.7],
    [0.16, 4.2],
    [0.2, 4.38],
    [0.3, 4.62],
    [0.26, 4.7],
    [0, 4.7],
  ].map(([r, y]) => new V2(r, y));
  const shaft = new THREE.LatheGeometry(
    prof.slice(0, 7).concat([new V2(0, 4.2)]),
    24,
  );
  const cap = new THREE.LatheGeometry(prof.slice(6), 24);
  for (const x of [-4.3, 4.3])
    for (const z of [2.6, -1.2, -5]) {
      const s = new THREE.Mesh(shaft, M.post),
        c = new THREE.Mesh(cap, M.gold);
      for (const m of [s, c]) {
        m.position.set(x, FH, z);
        m.castShadow = m.receiveShadow = true;
        scene.add(m);
      }
      s.scale.y = c.scale.y = (CH - FH) / 4.7;
      block(x - 0.3, x + 0.3, FH, CH, z - 0.3, z + 0.3);
    }
}

// pelaminan (royal dais)
{
  const BZ = HZ0 + 0.2;
  const tiers = [
    [6.6, -6.2],
    [5.1, -6.9],
    [2.4, -7.6],
  ];
  tiers.forEach(([hw, z1], i) => {
    const gb = std({
      map: T.goldband,
      metalness: 0.55,
      roughness: 0.35,
      envMap: roomEnv,
      envMapIntensity: 0.6,
    });
    boxAt(
      -hw,
      hw,
      FH + i * 0.25,
      FH + (i + 1) * 0.25,
      BZ,
      z1,
      [gb, gb, M.red, gb, gb, gb],
      { walk: true },
    );
  });
  const top = FH + 0.75;
  const post = (x, z, y0, y1) => {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, y1 - y0, 10),
      M.gold,
    );
    m.position.set(x, (y0 + y1) / 2, z);
    m.castShadow = true;
    scene.add(m);
  };
  const header = (x0, x1, y0, y1, z) =>
    boxAt(
      x0,
      x1,
      y0,
      y1,
      z - 0.14,
      z + 0.14,
      std({
        map: rep(T.goldband, 1 / 1.2, 1 / (y1 - y0)),
        metalness: 0.55,
        roughness: 0.35,
        envMap: roomEnv,
        envMapIntensity: 0.6,
      }),
    );
  const pyramid = (cx, cz, hw, hd, y, h) => {
    const m = new THREE.Mesh(
      new THREE.ConeGeometry(Math.SQRT2, h, 4, 1),
      M.trim,
    );
    m.geometry.rotateY(Math.PI / 4); // square base, half-width 1
    m.scale.set(hw, 1, hd);
    m.position.set(cx, y + h / 2, cz);
    m.castShadow = true;
    scene.add(m);
  };
  // central canopy
  for (const x of [-2.1, 2.1])
    for (const z of [-7.75, BZ + 0.2]) post(x, z, top, 6.35);
  header(-2.4, 2.4, 5.65, 6.35, -7.75);
  for (const s of [-1, 1])
    boxAt(
      s * 2.1 - 0.12,
      s * 2.1 + 0.12,
      5.65,
      6.35,
      BZ,
      -7.6,
      M.goldBand,
    );
  pyramid(0, (BZ - 7.75) / 2, 2.45, 1.15, 6.35, 0.85);
  // drapes tied back on the front posts
  const drape = new THREE.LatheGeometry(
    [
      [0.02, 0],
      [0.2, 0.04],
      [0.13, 0.6],
      [0.06, 1.3],
      [0.08, 1.4],
      [0.12, 2.0],
      [0.16, 2.6],
      [0.02, 2.62],
    ].map(([r, y]) => new V2(r, y)),
    18,
  );
  for (const x of [-1.85, 1.85, -1.4, 1.4]) {
    const d = new THREE.Mesh(drape, M.satin);
    d.position.set(x, top, -7.6);
    d.castShadow = true;
    scene.add(d);
  }
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 2.9),
    std({ color: "#e9c86a", roughness: 0.5, metalness: 0.2 }),
  );
  back.position.set(0, top + 1.45, BZ + 0.05);
  scene.add(back);
  // side canopies
  for (const s of [-1, 1]) {
    const cx = s * 4.1,
      y0 = FH + 0.5;
    for (const x of [cx - 1.05, cx + 1.05])
      for (const z of [-8.3, BZ + 0.2]) post(x, z, y0, 5.5);
    header(cx - 1.25, cx + 1.25, 5.0, 5.5, -8.3);
    pyramid(cx, (BZ - 8.3) / 2, 1.25, 0.8, 5.5, 0.65);
    const dp = new THREE.Mesh(
      new THREE.PlaneGeometry(2.1, 1.3),
      M.diamond,
    );
    dp.position.set(cx, y0 + 0.65, BZ + 0.05);
    scene.add(dp);
    const cur = new THREE.Mesh(
      new THREE.PlaneGeometry(2.1, 2.0),
      M.satin,
    );
    cur.position.set(cx, y0 + 2.3, BZ + 0.05);
    scene.add(cur);
  }
  // throne, cushions, ornamental chests
  boxAt(-0.95, 0.95, top, top + 0.5, -9.5, -8.6, M.gold, {
    collide: true,
  });
  boxAt(-0.95, 0.95, top + 0.5, top + 1.6, -9.6, -9.38, M.goldBand);
  boxAt(-0.8, 0.8, top + 0.5, top + 0.68, -9.3, -8.7, M.red);
  for (const [x, c] of [
    [-1.55, "#2f6f68"],
    [1.55, "#9a2a2a"],
  ]) {
    const mat = std({ color: c, roughness: 0.5 });
    boxAt(x - 0.32, x + 0.32, top, top + 0.45, -9.3, -8.7, mat, {
      collide: true,
    });
    boxAt(
      x - 0.26,
      x + 0.26,
      top + 0.45,
      top + 0.82,
      -9.25,
      -8.75,
      M.goldBand,
    );
    boxAt(x - 0.32, x + 0.32, top + 0.82, top + 0.86, -9.3, -8.7, M.gold);
  }
  // payung (royal umbrellas)
  for (const s of [-1, 1]) {
    const x = s * 3.3,
      z = -5.6;
    post(x, z, FH, FH + 2.6);
    const u = new THREE.Mesh(
      new THREE.ConeGeometry(0.75, 0.38, 24, 1, true),
      M.satin,
    );
    u.position.set(x, FH + 2.6, z);
    u.castShadow = true;
    scene.add(u);
    const fr = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.75, 0.22, 24, 1, true),
      std({
        map: rep(T.valance, 9, 1),
        alphaTest: 0.5,
        side: THREE.DoubleSide,
      }),
    );
    fr.position.set(x, FH + 2.31, z);
    scene.add(fr);
    block(x - 0.15, x + 0.15, FH, FH + 2.6, z - 0.15, z + 0.15);
  }
}

export { CH, FH, HX, HZ0, HZ1, VH, mirror };
