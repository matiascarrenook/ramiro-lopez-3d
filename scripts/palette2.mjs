import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const root = doc.getRoot();

for (const m of root.listMeshes()) {
  for (const p of m.listPrimitives()) {
    const col = p.getAttribute("COLOR_0");
    const pos = p.getAttribute("POSITION");
    const n = pos.getCount();
    if (!col) {
      console.log(`\n"${m.getName()}": NO COLOR_0 (material="${p.getMaterial() ? p.getMaterial().getName() : "?"}", baseColor=[${p.getMaterial() ? p.getMaterial().getBaseColorFactor().map((x) => x.toFixed(2)) : ""}])`);
      continue;
    }
    const comp = col.getElementSize();
    const arr = col.getArray();
    const buckets = new Map();
    let white = 0, black = 0;
    const sample = Math.max(1, Math.floor(n / 40000));
    let count = 0;
    for (let i = 0; i < n; i += sample) {
      const o = i * comp;
      let r = arr[o], g = arr[o + 1], b = arr[o + 2];
      if (col.getComponentType() === 5121) { r /= 255; g /= 255; b /= 255; }
      count++;
      if (r > 0.78 && g > 0.78 && b > 0.78) white++;
      if (r < 0.12 && g < 0.12 && b < 0.12) black++;
      const k = `${Math.round(r * 8)},${Math.round(g * 8)},${Math.round(b * 8)}`;
      buckets.set(k, (buckets.get(k) || 0) + 1);
    }
    const top = [...buckets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    console.log(`\n"${m.getName()}" verts=${n} comp=${comp} type=${col.getComponentType()} white=${Math.round((white / count) * 100)}% black=${Math.round((black / count) * 100)}%`);
    for (const [k, v] of top) {
      const [r, g, b] = k.split(",").map((x) => Math.round((x / 8) * 255));
      console.log(`    [${r},${g},${b}]  ${Math.round((v / count) * 100)}%`);
    }
  }
}
