import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, weld, simplify, normals } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import draco3d from "draco3dgltf";
import fs from "node:fs";
await MeshoptSimplifier.ready;

const [, , input, out, ratioArg, errorArg] = process.argv;
const ratio = ratioArg ? parseFloat(ratioArg) : 0.5;
const maxError = errorArg ? parseFloat(errorArg) : 0.001;

const io = new NodeIO()
  .registerExtensions(KHRONOS_EXTENSIONS)
  .registerDependencies({
    "draco3d.decoder": await draco3d.createDecoderModule(),
    "draco3d.encoder": await draco3d.createEncoderModule(),
  });
const doc = await io.read(input);
const root = doc.getRoot();

// Keep Plane (white backdrop = teeth visibility). Remove only cameras/lights.
for (const n of [...root.listNodes()]) if (/camera|light/i.test(n.getName())) n.dispose();

// Drop normals/uvs/tangents so weld can merge seam-split vertices (shape unchanged).
for (const m of root.listMeshes()) {
  for (const p of m.listPrimitives()) {
    for (const a of ["NORMAL", "TANGENT", "TEXCOORD_0", "TEXCOORD_1"]) {
      const acc = p.getAttribute(a);
      if (acc) { p.setAttribute(a, null); acc.dispose(); }
    }
  }
}

const tx = [dedup(), weld({ tolerance: 0.00005 }), prune()];
if (ratio < 1) tx.push(simplify({ simplifier: MeshoptSimplifier, ratio, error: maxError }));
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
console.log(`ratio=${ratio} error=${maxError} totalVerts=${totalV} size=${(fs.statSync(out).size / 1048576).toFixed(1)}MB`);
