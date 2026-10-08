import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune } from "@gltf-transform/functions";

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const root = doc.getRoot();

for (const m of [...root.listMeshes()]) if (m.getName() === "Plane") m.dispose();
for (const n of [...root.listNodes()]) if (/camera|light/i.test(n.getName())) n.dispose();

const colors = {
  "mesh.004": [0.85, 0.85, 0.9],
  "Mesh": [1, 0.1, 0.1],
  "Sphere": [0.1, 0.9, 0.25],
  "Sphere.001": [0.2, 0.4, 1],
};

for (const m of root.listMeshes()) {
  const c = colors[m.getName()] || [1, 1, 1];
  const mat = doc
    .createMaterial(m.getName() + "-diag")
    .setBaseColorFactor([c[0], c[1], c[2], 1])
    .setMetallicFactor(0)
    .setRoughnessFactor(0.9);
  for (const p of m.listPrimitives()) {
    p.setMaterial(mat);
    const cc = p.getAttribute("COLOR_0");
    if (cc) { p.setAttribute("COLOR_0", null); cc.dispose(); }
  }
  console.log("  colored", m.getName(), "->", c.join(","));
}

await doc.transform(dedup(), prune());
await io.write(process.argv[3], doc);
console.log("written", process.argv[3]);
