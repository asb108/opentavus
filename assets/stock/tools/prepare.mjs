// Offline preparation only. Runtime/builds use the committed, hash-checked result.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { NodeIO } from "@gltf-transform/core";
import { EXTTextureWebP } from "@gltf-transform/extensions";
import { dedup, prune, textureCompress } from "@gltf-transform/functions";
import sharp from "sharp";

const [source, destination] = process.argv.slice(2);
if (!source || !destination) throw new Error("Provide source.glb and destination.glb paths.");
const bytes = await readFile(source);
const digest = createHash("sha256").update(bytes).digest("hex");
if (digest !== "63c645a2a863b9972e9a9c2ed576a1de4c390b8475508e1473e69c87a3ee299c")
  throw new Error("The source does not match the reviewed CC0 MPFB avatar.");

const io = new NodeIO().registerExtensions([EXTTextureWebP]);
const document = await io.readBinary(bytes);
const shapes = new Set(["jawOpen", "eyeBlinkLeft", "eyeBlinkRight"]);
for (const mesh of document.getRoot().listMeshes()) {
  const names = mesh.getExtras().targetNames;
  if (!Array.isArray(names)) continue;
  const keep = names.map((name, index) => (shapes.has(name) ? index : -1)).filter((i) => i >= 0);
  for (const primitive of mesh.listPrimitives()) {
    primitive.listTargets().forEach((target, index) => {
      if (!keep.includes(index)) primitive.removeTarget(target);
    });
  }
  const weights = mesh.getWeights();
  mesh.setWeights(keep.map((index) => weights[index] || 0));
  mesh.setExtras({ ...mesh.getExtras(), targetNames: keep.map((index) => names[index]) });
}
await document.transform(
  prune(),
  dedup(),
  textureCompress({ encoder: sharp, targetFormat: "webp", resize: [1024, 1024] }),
);
const output = await io.writeBinary(document);
await writeFile(destination, output);
console.log(
  JSON.stringify({
    bytes: output.byteLength,
    sha256: createHash("sha256").update(output).digest("hex"),
    shapes: [...shapes],
  }),
);
