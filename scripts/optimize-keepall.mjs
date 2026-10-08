import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, weld, simplify } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import fs from "node:fs";
await MeshoptSimplifier.ready;

const [, , input, out, ratioArg, errorArg] = process.argv;
const ratio = ratioArg ? parseFloat(ratioArg) : 0.4;
const maxError = errorArg ? parseFloat(errorArg) : 0.01;

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
const doc = await io.read(input);
const root = doc.getRoot();

// Remove ONLY cameras/lights. KEEP Plane (white backdrop = teeth visibility).
for (const n of [...root.listNodes()]) if (/camera|light/i.test(n.getName())) n.dispose();

// Drop only unused attributes (no textures / normal maps). KEEP NORMAL + COLOR_0 untouched.
for (const m of root.listMeshes()) {
  for (const p of m.listPrimitives()) {
    for (const a of ["TANGENT", "TEXCOORD_0", "TEXCOORD_1"]) {
      const acc = p.getAttribute(a);
      if (acc) { p.setAttribute(a, null); acc.dispose(); }
    }
  }
}

const tx = [dedup(), weld({ tolerance: 0.00001 }), prune()];
if (ratio < 1) tx.push(simplify({ simplifier: MeshoptSimplifier, ratio, error: maxError }));
tx.push(dedup(), prune());
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
