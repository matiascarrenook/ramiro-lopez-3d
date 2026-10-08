import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const root = doc.getRoot();
const W = 64, H = 36;

const pts = [];
for (const m of root.listMeshes()) {
  if (m.getName() === "Plane") continue;
  for (const p of m.listPrimitives()) {
    const pos = p.getAttribute("POSITION");
    const a = pos.getArray();
    const colAcc = p.getAttribute("COLOR_0");
    const carr = colAcc ? colAcc.getArray() : null;
    const ccomp = colAcc ? colAcc.getElementSize() : 0;
    const n = pos.getCount();
    const step = Math.max(1, Math.floor(n / 120000));
    for (let i = 0; i < n; i += step) {
      const o = i * 3;
      let r = 1, g = 1, b = 1;
      if (carr) { const co = i * ccomp; r = carr[co]; g = carr[co + 1]; b = carr[co + 2]; }
      pts.push([a[o], a[o + 1], a[o + 2], r, g, b]);
    }
  }
}

const col = (p) => {
  const [r, g, b] = [p[3], p[4], p[5]];
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx < 0.12) return "#";
  if (mn > 0.6) return "W";
  if (b >= r && b - r > 0.08) return "i";
  if (r > 0.4 && g > 0.2 && b < 0.35 && r - b > 0.15) return "o";
  if (mx < 0.3) return ".";
  return "-";
};

const views = {
  "FRONT (+Z)": (v) => [v[0], v[1], v[2]],
  "BACK (-Z)": (v) => [-v[0], v[1], -v[2]],
  "RIGHT (+X)": (v) => [-v[2], v[1], v[0]],
  "LEFT (-X)": (v) => [v[2], v[1], -v[0]],
  "TOP (+Y)": (v) => [v[0], -v[2], v[1]],
  "BOTTOM (-Y)": (v) => [v[0], v[2], -v[1]],
};

for (const [name, f] of Object.entries(views)) {
  const t = pts.map((v) => { const [x, y, d] = f(v); return [x, y, d, ...v.slice(3)]; });
  let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
  for (const v of t) { mnx = Math.min(mnx, v[0]); mxx = Math.max(mxx, v[0]); mny = Math.min(mny, v[1]); mxy = Math.max(mxy, v[1]); }
  const grid = Array.from({ length: H }, () => new Array(W).fill(null));
  for (const v of t) {
    const gx = Math.floor(((v[0] - mnx) / (mxx - mnx || 1)) * (W - 1));
    const gy = Math.floor(((v[1] - mny) / (mxy - mny || 1)) * (H - 1));
    const row = H - 1 - gy;
    const c = grid[row][gx];
    if (!c || v[2] > c.z) grid[row][gx] = { z: v[2], ch: col(v) };
  }
  console.log(`\n=== ${name} ===`);
  for (const row of grid) console.log(row.map((c) => (c ? c.ch : " ")).join(""));
}
