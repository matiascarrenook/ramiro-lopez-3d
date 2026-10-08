import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, weld, simplify, flatten, normals } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import fs from "node:fs";
await MeshoptSimplifier.ready;

const [, , input, out, ratioArg] = process.argv;
const ratio = ratioArg ? parseFloat(ratioArg) : 0.3;

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
const doc = await io.read(input);
const root = doc.getRoot();

for (const m of [...root.listMeshes()]) if (m.getName() === "Plane") m.dispose();
for (const n of [...root.listNodes()]) if (/camera|light/i.test(n.getName())) n.dispose();

for (const m of [...root.listMeshes()]) {
  for (const p of m.listPrimitives()) {
    for (const a of ["NORMAL", "TANGENT", "TEXCOORD_0", "TEXCOORD_1"]) {
      const acc = p.getAttribute(a);
      if (acc) { p.setAttribute(a, null); acc.dispose(); }
    }
  }
}

for (const mat of root.listMaterials()) {
  mat.setBaseColorFactor([1, 1, 1, 1]);
  mat.setMetallicFactor(0);
  mat.setRoughnessFactor(0.9);
}

const tx = [dedup(), flatten(), prune(), weld({ tolerance: 0.00005 })];
if (ratio < 1) tx.push(simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.0005 }));
tx.push(normals({ overwrite: true }), dedup(), prune());
await doc.transform(...tx);
await io.write(out, doc);

let totalV = 0;
for (const m of root.listMeshes()) {
  const v = m.listPrimitives().reduce((a, p) => a + p.getAttribute("POSITION").getCount(), 0);
  const c = m.listPrimitives()[0].getAttribute("COLOR_0") ? "Y" : "N";
  console.log(`  ${m.getName()}: verts=${v} color=${c}`);
  totalV += v;
}
console.log(`ratio=${ratio} totalVerts=${totalV} size=${(fs.statSync(out).size / 1048576).toFixed(1)}MB`);
