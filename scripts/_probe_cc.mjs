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
for (const mat of doc.getRoot().listMaterials()) {
  const cc = mat.getExtension("KHR_materials_clearcoat");
  console.log(
    `mat "${mat.getName()}": metal=${mat.getMetallicFactor()} rough=${mat.getRoughnessFactor()} ` +
      (cc ? `clearcoat=${cc.getClearcoatFactor()} ccRough=${cc.getClearcoatRoughnessFactor()}` : "clearcoat=N/A")
  );
}