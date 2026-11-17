import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { V2, V3, colliders, renderer, scene, walkables } from "./core.js";
import { T, rep } from "./textures.js";

// ---------- materials ----------
const pmrem = new THREE.PMREMGenerator(renderer);
const roomEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const std = (o) => new THREE.MeshStandardMaterial(o);
const M = {
  wall: std({ map: T.wall, roughness: 0.78 }),
  post: std({ color: "#4a2514", roughness: 0.45 }),
  trim: std({ color: "#e6b422", roughness: 0.42, metalness: 0.25 }),
  roof: std({ map: T.roof, roughness: 0.7 }),
  soffit: std({
    map: T.wall,
    color: "#d8b090",
    roughness: 0.85,
    side: THREE.BackSide,
  }),
  tepas: std({ map: T.tepas, roughness: 0.7 }),
  pier: std({ color: "#7d977f", roughness: 0.85 }),
  dark: std({ color: "#140c08", roughness: 1 }),
  verFloor: std({ map: T.floor, color: "#f0c49c", roughness: 0.45 }),
  hallTop: std({
    map: T.floor,
    roughness: 0.22,
    transparent: true,
    opacity: 0.82,
  }),
  hallUnder: std({ color: "#1a0f0a", roughness: 0.5 }),
  ceiling: std({ color: "#cfcac0", roughness: 0.9 }),
  white: std({ color: "#efeae0", roughness: 0.6 }),
  pink: std({ color: "#efb5a6", roughness: 0.7 }),
  peach: std({ color: "#e0a88e", roughness: 0.6 }),
  stairTop: std({ map: T.stairTop, roughness: 0.5 }),
  maroon: std({ color: "#6e1d1d", roughness: 0.6 }),
  gold: std({
    color: "#e0ad3c",
    metalness: 1,
    roughness: 0.28,
    envMap: roomEnv,
    envMapIntensity: 0.7,
  }),
  goldBand: std({
    map: T.goldband,
    metalness: 0.55,
    roughness: 0.35,
    envMap: roomEnv,
    envMapIntensity: 0.6,
  }),
  red: std({ color: "#8e1b1d", roughness: 0.95 }),
  satin: new THREE.MeshPhysicalMaterial({
    color: "#d29a12",
    roughness: 0.5,
    sheen: 0.6,
    sheenRoughness: 0.35,
    sheenColor: "#ffd36a",
  }),
  lattice: std({
    map: T.lattice,
    emissiveMap: T.latticeE,
    emissive: "#ffb860",
    emissiveIntensity: 0,
    roughness: 0.6,
  }),
  vent: std({
    map: rep(T.vent, 1, 1),
    emissiveMap: T.ventE,
    emissive: "#ffb060",
    emissiveIntensity: 0,
    roughness: 0.6,
  }),
  diamond: std({ map: T.diamond, roughness: 0.5 }),
};
const glowMats = [M.lattice, M.vent]; // window glow at night
const lampMats = []; // exterior lamps (night only)

// UVs in metres so tiling textures never stretch
function worldUV(geo, w, h, d) {
  const uv = geo.attributes.uv,
    dims = [
      [d, h],
      [d, h],
      [w, d],
      [w, d],
      [w, h],
      [w, h],
    ];
  for (let i = 0; i < uv.count; i++) {
    const [a, b] = dims[i >> 2];
    uv.setXY(i, uv.getX(i) * a, uv.getY(i) * b);
  }
  return geo;
}
function boxAt(x0, x1, y0, y1, z0, z1, mat, o = {}) {
  const w = x1 - x0,
    h = y1 - y0,
    d = z1 - z0;
  const m = new THREE.Mesh(
    worldUV(new THREE.BoxGeometry(w, h, d), w, h, d),
    mat,
  );
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  m.castShadow = o.cast !== false;
  m.receiveShadow = true;
  (o.parent || scene).add(m);
  if (o.collide) block(x0, x1, y0, y1, z0, z1);
  if (o.walk) walkables.push(m);
  return m;
}
const block = (x0, x1, y0, y1, z0, z1) =>
  colliders.push(new THREE.Box3(new V3(x0, y0, z0), new V3(x1, y1, z1)));
function alphaDepth(tex) {
  return new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    map: tex,
    alphaTest: 0.5,
  });
}

// generic sloped surface from quads of [x,y,z,u,v]; winding auto-flipped so normals face up
function surf(quads) {
  const pos = [],
    uv = [];
  for (let q of quads) {
    const [a, b, , d] = q;
    if ((b[2] - a[2]) * (d[0] - a[0]) - (b[0] - a[0]) * (d[2] - a[2]) < 0)
      q = [q[0], q[3], q[2], q[1]];
    for (const i of [0, 1, 2, 0, 2, 3]) {
      pos.push(q[i][0], q[i][1], q[i][2]);
      uv.push(q[i][3], q[i][4]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
function roofMesh(geo) {
  const top = new THREE.Mesh(geo, M.roof);
  top.castShadow = true;
  top.receiveShadow = true;
  const under = new THREE.Mesh(geo, M.soffit);
  under.receiveShadow = true;
  scene.add(top, under);
}
function skirt(i, o, yi, yo) {
  // hipped roof tier between an inner and outer rectangle
  const [ix0, ix1, iz0, iz1] = i,
    [ox0, ox1, oz0, oz1] = o,
    s = (d) => Math.hypot(d, yi - yo);
  roofMesh(
    surf([
      [
        [ox0, yo, oz1, ox0, 0],
        [ox1, yo, oz1, ox1, 0],
        [ix1, yi, iz1, ix1, s(oz1 - iz1)],
        [ix0, yi, iz1, ix0, s(oz1 - iz1)],
      ],
      [
        [ox0, yo, oz0, ox0, 0],
        [ox1, yo, oz0, ox1, 0],
        [ix1, yi, iz0, ix1, s(iz0 - oz0)],
        [ix0, yi, iz0, ix0, s(iz0 - oz0)],
      ],
      [
        [ox0, yo, oz0, oz0, 0],
        [ox0, yo, oz1, oz1, 0],
        [ix0, yi, iz1, iz1, s(ix0 - ox0)],
        [ix0, yi, iz0, iz0, s(ix0 - ox0)],
      ],
      [
        [ox1, yo, oz0, oz0, 0],
        [ox1, yo, oz1, oz1, 0],
        [ix1, yi, iz1, iz1, s(ox1 - ix1)],
        [ix1, yi, iz0, iz0, s(ox1 - ix1)],
      ],
    ]),
  );
  fascia(o, yo + 0.05, 0.62);
}
const scallopMat = std({
  map: T.scallop,
  alphaTest: 0.5,
  side: THREE.DoubleSide,
  roughness: 0.45,
  metalness: 0.2,
});
function strip(len, h, mat, tex) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(len, h), mat.clone());
  m.material.map = rep(tex, len / 0.5, 1);
  m.customDepthMaterial = alphaDepth(m.material.map);
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
  return m;
}
function fascia([x0, x1, z0, z1], y, h) {
  const cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2;
  for (const [len, x, z, ry] of [
    [x1 - x0, cx, z1, 0],
    [x1 - x0, cx, z0, Math.PI],
    [z1 - z0, x0, cz, -Math.PI / 2],
    [z1 - z0, x1, cz, Math.PI / 2],
  ]) {
    const m = strip(len, h, scallopMat, T.scallop);
    m.position.set(x, y - h / 2, z);
    m.rotation.y = ry;
  }
}
// gable roof: ridge along z, eaves at x=±W
function gable(
  W,
  eY,
  rY,
  z0,
  z1,
  frontMat,
  finialScale,
  backPanel = true,
) {
  const sl = Math.hypot(W, rY - eY);
  roofMesh(
    surf([
      [
        [-W, eY, z0, z0, 0],
        [-W, eY, z1, z1, 0],
        [0, rY, z1, z1, sl],
        [0, rY, z0, z0, sl],
      ],
      [
        [W, eY, z0, z0, 0],
        [W, eY, z1, z1, 0],
        [0, rY, z1, z1, sl],
        [0, rY, z0, z0, sl],
      ],
    ]),
  );
  const panel = (z, mat, flip) => {
    const g = new THREE.ShapeGeometry(
      new THREE.Shape([
        new V2(-W + 0.2, eY),
        new V2(W - 0.2, eY),
        new V2(0, rY - 0.15),
      ]),
    );
    const p = g.attributes.position,
      uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++)
      uv.setXY(
        i,
        (p.getX(i) + W) / (2 * W),
        (p.getY(i) - eY) / (rY - eY),
      );
    const m = new THREE.Mesh(g, mat);
    m.position.z = z;
    if (flip) m.rotation.y = Math.PI;
    m.receiveShadow = true;
    m.castShadow = true;
    scene.add(m);
  };
  panel(z1 - 0.25, frontMat);
  if (backPanel) panel(z0 + 0.25, M.wall, true);
  for (const z of backPanel ? [z1 + 0.05, z0 - 0.05] : [z1 + 0.05]) {
    const ang = Math.atan2(rY - eY, W),
      len = sl + 0.9;
    for (const s of [-1, 1]) {
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(len, 0.42, 0.16),
        M.trim,
      );
      b.position.set((s * W) / 2, (eY + rY) / 2 + 0.05, z);
      b.rotation.z = -s * ang;
      b.castShadow = true;
      scene.add(b);
      const sc = strip(len - 0.6, 0.5, scallopMat, T.scallop);
      sc.position.set(
        (s * W) / 2 - s * Math.sin(ang) * 0.4,
        (eY + rY) / 2 - Math.cos(ang) * 0.4,
        z - 0.03,
      );
      sc.rotation.z = -s * ang;
      const end = horn(s < 0 ? -1 : 1, 0.55);
      end.position.set(s * (W + 0.35), eY - 0.1, z);
      end.rotation.z = s * 0.5;
      scene.add(end);
    }
    boxAt(-W, W, eY - 0.22, eY + 0.02, z - 0.3, z - 0.05, M.trim);
    const f = finial(finialScale);
    f.position.set(0, rY + 0.1, z);
    scene.add(f);
  }
  const base = strip(2 * W - 0.4, 0.5, scallopMat, T.scallop);
  base.position.set(0, eY - 0.45, z1 - 0.2);
}
// selembayung: crossed horn finial, as flat carved boards
function horn(s, k = 1) {
  const pts = [
    [0.45 * s, -0.6],
    [0, 0],
    [-0.35 * s, 0.55],
    [-0.75 * s, 1.15],
    [-1.2 * s, 1.45],
    [-1.55 * s, 1.35],
    [-1.6 * s, 1.08],
    [-1.38 * s, 1.0],
    [-1.3 * s, 1.15],
  ];
  const c = new THREE.CatmullRomCurve3(
    pts.map((p) => new V3(p[0] * k, p[1] * k, 0)),
  );
  const L = [],
    R = [],
    N = 70;
  c.getSpacedPoints(N).forEach((p, i) => {
    const t = c.getTangentAt(i / N),
      w = (0.17 * (1 - i / N) + 0.03) * k;
    L.push(new V2(p.x - t.y * w, p.y + t.x * w));
    R.push(new V2(p.x + t.y * w, p.y - t.x * w));
  });
  const m = new THREE.Mesh(
    new THREE.ExtrudeGeometry(new THREE.Shape([...L, ...R.reverse()]), {
      depth: 0.09 * k,
      bevelEnabled: false,
    }),
    M.trim,
  );
  m.castShadow = true;
  return m;
}
function finial(k) {
  const g = new THREE.Group(),
    a = horn(1, k),
    b = horn(-1, k);
  a.position.z = 0.02;
  b.position.z = -0.12 * k;
  g.add(a, b);
  return g;
}

export { M, alphaDepth, block, boxAt, gable, glowMats, lampMats, pmrem, roomEnv, skirt, std, strip };
