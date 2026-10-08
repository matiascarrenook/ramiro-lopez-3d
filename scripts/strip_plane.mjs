import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const root = doc.getRoot();

for (const m of [...root.listMeshes()]) if (m.getName() === "Plane") m.dispose();
for (const n of [...root.listNodes()]) if (/camera|light/i.test(n.getName())) n.dispose();

await io.write(process.argv[3], doc);
console.log("written (no draco)", process.argv[3]);
