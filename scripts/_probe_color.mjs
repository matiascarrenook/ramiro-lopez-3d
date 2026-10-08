import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import draco3d from "draco3dgltf";
const io = new NodeIO()
  .registerExtensions(KHRONOS_EXTENSIONS)
  .registerDependencies({
    "draco3d.decoder": await draco3d.createDecoderModule(),
    "draco3d.encoder": await draco3d.createEncoderModule(),
  });
const f = process.argv[2];
const doc = await io.read(f);
let counts = 0, tot = [0, 0, 0], min = [1, 1, 1], max = [0, 0, 0], samples = 0;
for (const mesh of doc.getRoot().listMeshes())
  for (const prim of mesh.listPrimitives()) {
    const c = prim.getAttribute("COLOR_0");
    if (c) {
      counts++;
      const step = Math.max(1, Math.floor(c.getCount() / 4000));
      for (let i = 0; i < c.getCount(); i += step) {
        const v = c.getElement(i, []);
        tot[0] += v[0]; tot[1] += v[1]; tot[2] += v[2];
        for (let k = 0; k < 3; k++) { if (v[k] < min[k]) min[k] = v[k]; if (v[k] > max[k]) max[k] = v[k]; }
        samples++;
      }
    }
  }
console.log("prims con COLOR_0:", counts);
if (samples) console.log("color medio:", tot.map(v => (v / samples).toFixed(3)).join(","), "| min:", min.map(v => v.toFixed(3)).join(","), "| max:", max.map(v => v.toFixed(3)).join(","), "| muestras:", samples);
else console.log("SIN COLOR_0");