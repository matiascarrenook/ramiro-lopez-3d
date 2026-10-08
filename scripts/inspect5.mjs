import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const root = doc.getRoot();

console.log("textures:", root.listTextures().length, " scenes:", root.listScenes().length);

console.log("\n=== MATERIALS ===");
for (const m of root.listMaterials()) {
  const c = m.getBaseColorFactor();
  console.log(`  "${m.getName()}" baseColor=[${c.map((x) => x.toFixed(3))}] rough=${m.getRoughnessFactor()} metal=${m.getMetallicFactor()} alphaMode=${m.getAlphaMode()} tex=${m.getBaseColorTexture() ? "Y" : "N"}`);
}

console.log("\n=== MESH PRIMITIVES ===");
for (const m of root.listMeshes()) {
  m.listPrimitives().forEach((p, i) => {
    const mat = p.getMaterial();
    const attrs = Object.keys(p.getAttribute("POSITION") ? { POSITION: 1 } : {});
    const has = (n) => (p.getAttribute(n) ? "Y" : "N");
    console.log(`  mesh "${m.getName()}" prim${i} mat="${mat ? mat.getName() : "none"}" verts=${p.getAttribute("POSITION").getCount()} P${has("POSITION")} N${has("NORMAL")} C${has("COLOR_0")} UV${has("TEXCOORD_0")}`);
  });
}

console.log("\n=== NODE TREE ===");
const walk = (n, d) => {
  const mesh = n.getMesh();
  console.log(`${"  ".repeat(d)}- "${n.getName()}" mesh=${mesh ? '"' + mesh.getName() + '"' : "none"} scale=[${n.getScale().map((x) => x.toFixed(2))}] trans=[${n.getTranslation().map((x) => x.toFixed(2))}]`);
  for (const c of n.listChildren()) walk(c, d + 1);
};
for (const s of root.listScenes()) {
  console.log(`scene "${s.getName()}"`);
  for (const n of s.listChildren()) walk(n, 1);
}
