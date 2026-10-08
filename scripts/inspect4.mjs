import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const root = doc.getRoot();
console.log("=== " + process.argv[2]);
for (const m of root.listMeshes()) {
  const pos = m.listPrimitives()[0].getAttribute("POSITION");
  const v = m.listPrimitives().reduce((a, p) => a + p.getAttribute("POSITION").getCount(), 0);
  const mn = pos.getMin([]), mx = pos.getMax([]);
  const col = m.listPrimitives()[0].getAttribute("COLOR_0");
  console.log(`  "${m.getName()}" verts=${v} color=${col ? "Y" : "N"} bbox=[${mn.map((x) => x.toFixed(2))}]..[${mx.map((x) => x.toFixed(2))}]`);
}
