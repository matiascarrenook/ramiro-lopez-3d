import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const root = doc.getRoot();
const W = 120, H = 70;

const verts = [];
for (const m of root.listMeshes()) {
  const name = m.getName();
  for (const p of m.listPrimitives()) {
    const pos = p.getAttribute("POSITION");
    const arr = pos.getArray();
    const colAcc = p.getAttribute("COLOR_0");
    const carr = colAcc ? colAcc.getArray() : null;
    const ccomp = colAcc ? colAcc.getElementSize() : 0;
    const n = pos.getCount();
    const step = n > 400000 ? 2 : 1;
    for (let i = 0; i < n; i += step) {
      const o = i * 3;
      let r = 1, g = 1, b = 1;
      if (carr) { const co = i * ccomp; r = carr[co]; g = carr[co + 1]; b = carr[co + 2]; }
      verts.push([arr[o], arr[o + 1], arr[o + 2], r, g, b, name]);
    }
  }
}

let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
for (const v of verts) { if (v[0] < minx) minx = v[0]; if (v[0] > maxx) maxx = v[0]; if (v[1] < miny) miny = v[1]; if (v[1] > maxy) maxy = v[1]; }
const grid = Array.from({ length: H }, () => new Array(W).fill(null));
const col = (v) => {
  const [r, g, b] = [v[3], v[4], v[5]];
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx < 0.12) return " ";
  if (mn > 0.6) return "W";
  if (b >= r && b >= g && b - r > 0.08) return "i";
  if (r > 0.4 && g > 0.2 && b < 0.35 && r - b > 0.15) return "o";
  if (mx < 0.3) return ".";
  return "-";
};
for (const v of verts) {
  const gx = Math.floor(((v[0] - minx) / (maxx - minx)) * (W - 1));
  const gy = Math.floor(((v[1] - miny) / (maxy - miny)) * (H - 1));
  const row = H - 1 - gy;
  const c = grid[row][gx];
  if (!c || v[2] > c.z) grid[row][gx] = { z: v[2], ch: col(v) };
}
console.log(`=== ${process.argv[2]}  (front view: X right, Y up, depth +Z)  legend: i=indigo o=orange W=white ( )=black .=-`);
for (const row of grid) console.log(row.map((c) => (c ? c.ch : " ")).join(""));
