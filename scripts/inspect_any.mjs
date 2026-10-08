import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import draco3d from "draco3dgltf";

const io = new NodeIO()
  .registerExtensions(KHRONOS_EXTENSIONS)
  .registerDependencies({
    "draco3d.decoder": await draco3d.createDecoderModule(),
    "draco3d.encoder": await draco3d.createEncoderModule(),
  });
const doc = await io.read(process.argv[2]);
const root = doc.getRoot();

const used = root.listExtensionsUsed().map((e) => e.extensionName).join(",") || "none";
console.log(`\n=== ${process.argv[2]} ===`);
console.log(`scenes=${root.listScenes().length} meshes=${root.listMeshes().length} materials=${root.listMaterials().length} textures=${root.listTextures().length} ext=${used}`);

for (const m of root.listMeshes()) {
  const prims = m.listPrimitives();
  const verts = prims.reduce((a, p) => a + (p.getAttribute("POSITION")?.getCount() || 0), 0);
  const tris = prims.reduce((a, p) => a + (p.getIndices() ? p.getIndices().getCount() / 3 : 0), 0);
  const attrs = [...new Set(prims.flatMap((p) => p.listSemantics()))].join(",");
  const mats = [...new Set(prims.map((p) => p.getMaterial()?.getName() || "none"))].join("|");
  console.log(`  mesh "${m.getName()}": verts=${verts} tris=${Math.round(tris)} attrs=${attrs} mats=${mats}`);
}

for (const mat of root.listMaterials()) {
  const base = mat.getBaseColorFactor().map((x) => x.toFixed(2)).join(",");
  console.log(`  mat "${mat.getName()}": base=[${base}] metal=${mat.getMetallicFactor()} rough=${mat.getRoughnessFactor()} baseTex=${mat.getBaseColorTexture() ? "Y" : "N"} double=${mat.getDoubleSided()}`);
}
