import { createHash } from "node:crypto";
import { cp, mkdir, readFile } from "node:fs/promises";

const source = new URL("../node_modules/@excalidraw/excalidraw/dist/prod/fonts", import.meta.url);
const destination = new URL("../apps/web/public/fonts", import.meta.url);
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
await cp(new URL("../assets/font-notices", import.meta.url), new URL("licenses/", destination), {
  recursive: true,
});
await cp(
  new URL("../node_modules/@fontsource-variable/figtree/LICENSE", import.meta.url),
  new URL("licenses/Figtree.txt", destination),
);
await cp(
  new URL("../node_modules/katex/LICENSE", import.meta.url),
  new URL("licenses/KaTeX.txt", destination),
);
const stock = new URL("../assets/stock/mira/", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("manifest.json", stock), "utf8"));
const avatar = await readFile(new URL("mira.glb", stock));
if (
  manifest.eligibility !== "reviewed_permissive" ||
  manifest.license !== "CC0-1.0" ||
  avatar.byteLength !== manifest.prepared.bytes ||
  createHash("sha256").update(avatar).digest("hex") !== manifest.prepared.sha256
)
  throw new Error("The stock avatar does not match its reviewed manifest.");
const avatars = new URL("../apps/web/public/avatars/", import.meta.url);
await mkdir(avatars, { recursive: true });
await cp(new URL("mira.glb", stock), new URL("mira.glb", avatars));
// The poster is captured from this same stock mesh by the documented browser check.
const poster = await readFile(new URL("mira.png", stock));
if (
  poster.byteLength !== manifest.poster.bytes ||
  createHash("sha256").update(poster).digest("hex") !== manifest.poster.sha256
)
  throw new Error("The stock poster does not match its reviewed manifest.");
await cp(new URL("mira.png", stock), new URL("mira.png", avatars));
await cp(new URL("LICENSE.txt", stock), new URL("mira-LICENSE.txt", avatars));
await cp(new URL("manifest.json", stock), new URL("manifest.json", avatars));
async function copyPhotographic(directory, publicDirectory, expectedId) {
  const photo = new URL(`../assets/stock/${directory}/`, import.meta.url);
  const photoManifest = JSON.parse(await readFile(new URL("manifest.json", photo), "utf8"));
  const expectedPhotoIds = ["neutral", "warm", "attentive", "thoughtful", "poster"];
  const validRegion = (region) =>
    Array.isArray(region) &&
    region.length === 4 &&
    region.every((value) => typeof value === "number" && Number.isFinite(value)) &&
    region[2] >= 0.02 &&
    region[2] <= 0.35 &&
    region[3] >= 0.02 &&
    region[3] <= 0.35 &&
    region[0] - region[2] >= 0 &&
    region[0] + region[2] <= 1 &&
    region[1] - region[3] >= 0 &&
    region[1] + region[3] <= 1;
  if (
    photoManifest.schema_version !== 1 ||
    photoManifest.id !== expectedId ||
    photoManifest.eligibility !== "reviewed_permissive" ||
    photoManifest.license !== "CC0-1.0" ||
    photoManifest.tile !== 512 ||
    photoManifest.grid !== 6 ||
    photoManifest.poses !== 4 ||
    JSON.stringify(photoManifest.blink_indices) !== JSON.stringify([32, 33, 34, 35]) ||
    !validRegion(photoManifest.regions?.mouth) ||
    !validRegion(photoManifest.regions?.eyes) ||
    JSON.stringify(photoManifest.visemes) !==
      JSON.stringify(["rest", "closed", "open", "wide", "round", "pucker", "teeth", "tongue"]) ||
    !Array.isArray(photoManifest.files) ||
    photoManifest.files.length !== expectedPhotoIds.length ||
    expectedPhotoIds.some(
      (id) => photoManifest.files.filter((asset) => asset.id === id).length !== 1,
    )
  )
    throw new Error("Photographic assets do not match the reviewed prepared-frame contract.");
  for (const asset of photoManifest.files) {
    const data = await readFile(new URL(`${asset.id}.webp`, photo));
    if (
      data.length > 4 * 1024 * 1024 ||
      data.length !== asset.bytes ||
      createHash("sha256").update(data).digest("hex") !== asset.sha256
    )
      throw new Error(`The prepared photographic asset ${asset.id} is invalid.`);
  }
  const photoPublic = new URL(`${publicDirectory}/`, avatars);
  await mkdir(photoPublic, { recursive: true });
  for (const asset of photoManifest.files)
    await cp(new URL(`${asset.id}.webp`, photo), new URL(`${asset.id}.webp`, photoPublic));
  await cp(new URL("manifest.json", photo), new URL("manifest.json", photoPublic));
  await cp(new URL("LICENSE.txt", photo), new URL("LICENSE.txt", photoPublic));
}
await copyPhotographic("photographic", "photo", "stock.mira.photographic.v2");
await copyPhotographic("einstein", "einstein", "stock.einstein.photographic.v1");
await cp(
  new URL("../node_modules/three/LICENSE", import.meta.url),
  new URL("licenses/Three.txt", destination),
);
console.log("Prepared locally served fonts and reviewed stock human.");
