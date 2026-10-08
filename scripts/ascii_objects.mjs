import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const root = doc.getRoot();
const W = 60, H = 34;

function render(mesh, label) {
  const pts = [];
  for (const p of mesh.listPrimitives()) {
    const pos = p.getAttribute("POSITION");
    const a = pos.getArray();
    const colAcc = p.getAttribute("COLOR_0");
    const carr = colAcc ? colAcc.getArray() : null;
    const ccomp = colAcc ? colAcc.getElementSize() : 0;
    const n = pos.getCount();
    const step = Math.max(1, Math.floor(n / 60000));
    for (let i = 0; i < n; i += step) {
      const o = i * 3;
      let r = 1, g = 1, b = 1;
      if (carr) { const co = i * ccomp; r = carr[co]; g = carr[co + 1]; b = carr[co + 2]; }
      pts.push([a[o], a[o + 1], a[o + 2], r, g, b]);
    }
  }
  if (!pts.length) return;
  let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity, mnz = Infinity, mxz = -Infinity;
  for (const v of pts) { mnx = Math.min(mnx, v[0]); mxx = Math.max(mxx, v[0]); mny = Math.min(mny, v[1]); mxy = Math.max(mxy, v[1]); mnz = Math.min(mnz, v[2]); mxz = Math.max(mxz, v[2]); }
  const grid = Array.from({ length: H }, () => new Array(W).fill(null));
  const col = (v) => {
    const [r, g, b] = [v[3], v[4], v[5]];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx < 0.12) return "#";
    if (mn > 0.6) return "W";
    if (b >= r && b >= g && b - r > 0.08) return "i";
    if (r > 0.4 && g > 0.2 && b < 0.35 && r - b > 0.15) return "o";
    if (mx < 0.3) return ".";
    return "-";
  };
  for (const v of pts) {
    const gx = Math.floor(((v[0] - mnx) / (mxx - mnx || 1)) * (W - 1));
    const gy = Math.floor(((v[1] - mny) / (mxy - mny || 1)) * (H - 1));
    const row = H - 1 - gy;
    const c = grid[row][gx];
    if (!c || v[2] > c.z) grid[row][gx] = { z: v[2], ch: col(v) };
  }
  console.log(`\n=== ${label}  dim=(${(mxx - mnx).toFixed(2)} x ${(mxy - mny).toFixed(2)} x ${(mxz - mnz).toFixed(2)}) verts=${pos0count(mesh)} ===`);
  for (const row of grid) console.log(row.map((c) => (c ? c.ch : " ")).join(""));
}

function pos0count(mesh) {
  return mesh.listPrimitives().reduce((a, p) => a + p.getAttribute("POSITION").getCount(), 0);
}

for (const m of root.listMeshes()) render(m, m.getName());
