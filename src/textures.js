import * as THREE from "three";
import { renderer, rnd, setSeed } from "./core.js";

// ---------- procedural textures ----------
const aniso = renderer.capabilities.getMaxAnisotropy();
function ctex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = aniso;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const rep = (t, rx, ry) => {
  const c = t.clone();
  c.repeat.set(rx, ry);
  c.needsUpdate = true;
  return c;
};
function grain(g, w, h, n, a) {
  for (let i = 0; i < n; i++) {
    g.fillStyle =
      rnd() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`;
    g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
  }
}
function curl(g, x, y, r, dir, turns) {
  g.beginPath();
  for (let i = 0; i <= 48; i++) {
    const t = i / 48,
      a = dir * t * turns * Math.PI * 2,
      rr = r * (1 - t * 0.8);
    const px = x + Math.cos(a) * rr,
      py = y + Math.sin(a) * rr;
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  }
  g.stroke();
}
// symmetric Malay-style vine & curl ornament (mirrored about the vertical centre)
function vines(g, w, h, color, count, s0, y0 = 0, y1 = 1) {
  const draw = () => {
    setSeed(s0);
    g.strokeStyle = g.fillStyle = color;
    g.lineCap = "round";
    for (let i = 0; i < count; i++) {
      const r = (0.035 + rnd() * 0.07) * Math.min(w, (y1 - y0) * h * 2);
      const x = w * 0.5 - r * 1.2 - rnd() * (w * 0.45 - r * 2),
        y = h * (y0 + 0.12 * (y1 - y0) + rnd() * 0.76 * (y1 - y0));
      g.lineWidth = Math.max(2, r * 0.16);
      g.beginPath();
      g.moveTo(w * 0.5, y + (rnd() - 0.5) * r * 3);
      g.quadraticCurveTo(x + r * 1.6, y - r * 1.4, x + r, y);
      g.stroke();
      curl(g, x, y, r, rnd() < 0.5 ? 1 : -1, 1.2 + rnd() * 0.6);
      g.beginPath();
      g.ellipse(
        x + r * 1.3,
        y - r * 1.1,
        r * 0.5,
        r * 0.17,
        -0.8,
        0,
        Math.PI * 2,
      );
      g.fill();
      g.beginPath();
      g.arc(x + r * 0.3, y + r * 0.9, r * 0.14, 0, Math.PI * 2);
      g.fill();
    }
  };
  draw();
  g.save();
  g.translate(w, 0);
  g.scale(-1, 1);
  draw();
  g.restore();
}
function scallopTex(top, teeth, line) {
  return ctex(256, 128, (g, w, h) => {
    g.fillStyle = top;
    g.fillRect(0, 0, w, 56);
    g.fillStyle = line;
    g.fillRect(0, 8, w, 4);
    g.fillRect(0, 44, w, 4);
    for (let x = 16; x < w; x += 32) {
      g.beginPath();
      g.arc(x, 28, 7, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = teeth;
    for (let x = 0; x < w; x += 32) {
      // "lebah bergantung" (hanging bee) teeth
      g.beginPath();
      g.moveTo(x, 56);
      g.lineTo(x + 32, 56);
      g.lineTo(x + 20, 100);
      g.quadraticCurveTo(x + 16, 124, x + 12, 100);
      g.closePath();
      g.fill();
    }
    g.globalCompositeOperation = "destination-out";
    for (let x = 16; x < w; x += 32) {
      g.beginPath();
      g.arc(x, 74, 5, 0, Math.PI * 2);
      g.fill();
    }
  });
}

const T = {};
T.wall = ctex(
  512,
  512,
  (g, w, h) => {
    for (let x = 0; x < w; x += 64) {
      g.fillStyle = `hsl(22,${42 + rnd() * 12}%,${22 + rnd() * 7}%)`;
      g.fillRect(x, 0, 64, h);
      g.strokeStyle = "rgba(0,0,0,.14)";
      for (let k = 0; k < 7; k++) {
        const gx = x + 4 + rnd() * 56;
        g.beginPath();
        g.moveTo(gx, 0);
        g.bezierCurveTo(
          gx + rnd() * 10 - 5,
          h * 0.3,
          gx + rnd() * 10 - 5,
          h * 0.7,
          gx,
          h,
        );
        g.stroke();
      }
      g.fillStyle = "rgba(0,0,0,.55)";
      g.fillRect(x + 62, 0, 2, h);
    }
    grain(g, w, h, 4000, 0.05);
  },
  1 / 2.4,
  1 / 2.4,
);
T.floor = ctex(
  512,
  512,
  (g, w, h) => {
    for (let x = 0; x < w; x += 42) {
      let y = -rnd() * 300;
      while (y < h) {
        const L = 220 + rnd() * 260;
        g.fillStyle = `hsl(${18 + rnd() * 8},${35 + rnd() * 15}%,${14 + rnd() * 8}%)`;
        g.fillRect(x, y, 42, L);
        g.fillStyle = "rgba(0,0,0,.6)";
        g.fillRect(x, y, 42, 2);
        y += L;
      }
      g.fillStyle = "rgba(0,0,0,.6)";
      g.fillRect(x + 40, 0, 2, h);
      g.strokeStyle = "rgba(255,220,180,.05)";
      for (let k = 0; k < 4; k++) {
        g.beginPath();
        const gx = x + 5 + rnd() * 30;
        g.moveTo(gx, 0);
        g.lineTo(gx + rnd() * 6 - 3, h);
        g.stroke();
      }
    }
    grain(g, w, h, 3000, 0.04);
  },
  1 / 3,
  1 / 3,
);
T.roof = ctex(
  512,
  512,
  (g, w, h) => {
    g.fillStyle = "#7a2e25";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32)
      for (let x = ((y / 32) % 2) * 16; x < w + 32; x += 32) {
        g.fillStyle = `hsl(${4 + rnd() * 8},${45 + rnd() * 15}%,${26 + rnd() * 9}%)`;
        g.fillRect(x - 32, y, 31, 30);
        g.fillStyle = "rgba(0,0,0,.35)";
        g.fillRect(x - 32, y + 28, 32, 3);
      }
    grain(g, w, h, 5000, 0.06);
  },
  1 / 2.5,
  1 / 2.5,
);
T.tepas = ctex(
  512,
  128,
  (g, w, h) => {
    g.fillStyle = "#6f9c84";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#c9e2c0";
    g.fillRect(0, 6, w, 6);
    g.fillRect(0, h - 12, w, 6);
    vines(g, w, h, "#d6ecd0", 10, 3, 0.15, 0.85);
    grain(g, w, h, 2000, 0.06);
  },
  1 / 2,
  1 / 0.6,
);
T.stripes = ctex(256, 8, (g, w) => {
  const cols = [
    "#c8202b",
    "#f0c63a",
    "#24883c",
    "#f0c63a",
    "#c8202b",
    "#b81a24",
    "#24883c",
    "#f6d550",
  ];
  const ws = [40, 22, 38, 14, 30, 16, 44, 52];
  let x = 0;
  cols.forEach((c, i) => {
    g.fillStyle = c;
    g.fillRect(x, 0, ws[i], 8);
    x += ws[i];
  });
});
T.carpet = ctex(
  256,
  512,
  (g, w, h) => {
    g.fillStyle = "#9e1a1f";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#d9c28a";
    g.fillRect(8, 0, 6, h);
    g.fillRect(w - 14, 0, 6, h);
    g.fillRect(28, 0, 3, h);
    g.fillRect(w - 31, 0, 3, h);
    g.fillStyle = "#2a4f3a";
    g.fillRect(16, 0, 10, h);
    g.fillRect(w - 26, 0, 10, h);
    for (const cy of [128, 384]) {
      g.fillStyle = "#d9c28a";
      g.beginPath();
      g.ellipse(w / 2, cy, 70, 100, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#b52329";
      g.beginPath();
      g.ellipse(w / 2, cy, 54, 82, 0, 0, Math.PI * 2);
      g.fill();
      vines(
        g,
        w,
        220,
        "#e7d39c",
        5,
        11 + cy,
        (cy - 90) / 220,
        (cy + 90) / 220,
      );
    }
    grain(g, w, h, 6000, 0.05);
  },
  1,
  3,
);
T.gable = ctex(
  1024,
  1024,
  (g, w, h) => {
    g.fillStyle = "#c4646a";
    g.fillRect(0, 0, w, h * 0.62);
    vines(g, w, h, "#f0c23a", 34, 5, 0.18, 0.6);
    const band = (y0, y1, col) => {
      g.fillStyle = col;
      g.fillRect(0, h * y0, w, h * (y1 - y0));
      g.strokeStyle = "rgba(150,60,60,.35)";
      g.lineWidth = 3;
      for (let x = -h; x < w; x += 22) {
        g.beginPath();
        g.moveTo(x, h * y0);
        g.lineTo(x + h * (y1 - y0), h * y1);
        g.stroke();
      }
    };
    const gold = (y0, y1) => {
      g.fillStyle = "#eec03b";
      g.fillRect(0, h * y0, w, h * (y1 - y0));
    };
    gold(0.6, 0.64);
    band(0.64, 0.76, "#efb3a5");
    gold(0.76, 0.79);
    band(0.79, 0.9, "#f2c0b3");
    gold(0.9, 0.93);
    band(0.93, 1, "#8c3530");
  },
  1,
  1,
);
T.porch = ctex(512, 512, (g, w, h) => {
  g.fillStyle = "#8f2f28";
  g.fillRect(0, 0, w, h);
  vines(g, w, h, "#f2c23a", 22, 9, 0.2, 0.92);
  g.fillStyle = "#eec03b";
  g.fillRect(0, h - 18, w, 10);
});
T.goldband = ctex(
  512,
  128,
  (g, w, h) => {
    g.fillStyle = "#35161a";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#e4b84a";
    g.fillRect(0, 4, w, 8);
    g.fillRect(0, h - 12, w, 8);
    vines(g, w, h, "#e9bf52", 9, 21, 0.15, 0.85);
  },
  1 / 1.2,
  1 / 0.25,
);
T.diamond = ctex(
  256,
  256,
  (g, w, h) => {
    g.fillStyle = "#2d1d22";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#e8dcb2";
    for (const [cx, cy] of [
      [0, 0],
      [w, 0],
      [0, h],
      [w, h],
      [w / 2, h / 2],
    ]) {
      g.beginPath();
      g.moveTo(cx, cy - 92);
      g.lineTo(cx + 92, cy);
      g.lineTo(cx, cy + 92);
      g.lineTo(cx - 92, cy);
      g.fill();
    }
    g.fillStyle = "#2d1d22";
    for (const [cx, cy] of [[w / 2, h / 2]]) {
      g.beginPath();
      g.arc(cx, cy, 30, 0, Math.PI * 2);
      g.fill();
    }
    vines(g, w, h, "#c99a3c", 6, 31, 0.3, 0.7);
  },
  2,
  1.5,
);
function latticeDraw(hole, wood, gold) {
  return (g, w, h) => {
    g.fillStyle = wood;
    g.fillRect(0, 0, w, h);
    g.fillStyle = gold;
    g.fillRect(0, 0, w, 10);
    g.fillRect(0, h - 10, w, 10);
    g.fillRect(0, 0, 10, h);
    g.fillRect(w - 10, 0, 10, h);
    g.fillStyle = hole;
    for (let y = 26; y < h - 16; y += 28)
      for (let x = 22 + ((y / 28) % 2) * 14; x < w - 16; x += 28) {
        g.beginPath();
        g.moveTo(x, y - 11);
        g.lineTo(x + 9, y);
        g.lineTo(x, y + 11);
        g.lineTo(x - 9, y);
        g.fill();
      }
  };
}
T.lattice = ctex(256, 384, latticeDraw("#140904", "#4a2614", "#d9a83a"));
T.latticeE = ctex(256, 384, latticeDraw("#ffd9a0", "#000", "#000"));
T.vent = ctex(256, 96, latticeDraw("#140904", "#4a2614", "#d9a83a"));
T.ventE = ctex(256, 96, latticeDraw("#ffc890", "#000", "#000"));
T.paving = ctex(
  512,
  512,
  (g, w, h) => {
    g.fillStyle = "#3b3633";
    g.fillRect(0, 0, w, h);
    const r = 22,
      dx = r * Math.sqrt(3);
    for (let row = -1, y = 0; y < h + r * 2; row++, y = row * r * 1.5)
      for (let x = ((row % 2) * dx) / 2 - dx; x < w + dx; x += dx) {
        g.fillStyle = `hsl(${12 + rnd() * 20},${8 + rnd() * 10}%,${30 + rnd() * 14}%)`;
        g.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = Math.PI / 6 + (k * Math.PI) / 3;
          g.lineTo(x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2));
        }
        g.fill();
      }
    grain(g, w, h, 8000, 0.06);
  },
  1,
  1,
);
T.grass = ctex(
  256,
  256,
  (g, w, h) => {
    g.fillStyle = "#4f7a2d";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = `hsl(${80 + rnd() * 30},${40 + rnd() * 20}%,${20 + rnd() * 20}%)`;
      g.fillRect(rnd() * w, rnd() * h, 1, 2 + rnd() * 3);
    }
  },
  120,
  120,
);
T.frond = ctex(512, 128, (g, w, h) => {
  g.strokeStyle = "#6b6a2c";
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(0, h / 2);
  g.lineTo(w, h / 2);
  g.stroke();
  for (let x = 30; x < w - 10; x += 9) {
    const L = (h / 2 - 4) * Math.sin(Math.PI * (x / w) * 0.95 + 0.1);
    for (const s of [-1, 1]) {
      g.strokeStyle = `hsl(${85 + rnd() * 25},${45 + rnd() * 15}%,${22 + rnd() * 14}%)`;
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(x, h / 2);
      g.quadraticCurveTo(
        x + 10,
        h / 2 + s * L * 0.5,
        x + 22,
        h / 2 + s * L,
      );
      g.stroke();
    }
  }
});
T.scallop = scallopTex("#e8b923", "#e8b923", "#b77f12");
T.valance = scallopTex("#d9a93a", "#1f7a3a", "#9a1c22");
T.stairTop = ctex(
  512,
  64,
  (g, w, h) => {
    g.fillStyle = "#e8b298";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#2b8a8a";
    for (const u of [0.1, 0.27, 0.45, 0.55, 0.73, 0.9])
      for (let y = 8; y < h; y += 24) {
        g.save();
        g.translate(u * w, y + 8);
        g.rotate(Math.PI / 4);
        g.fillRect(-5, -5, 10, 10);
        g.restore();
      }
    grain(g, w, h, 600, 0.05);
  },
  1 / 5,
  1 / 0.35,
);

export { T, ctex, rep };
