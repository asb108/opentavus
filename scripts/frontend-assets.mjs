import { cp, mkdir } from "node:fs/promises";

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
console.log("Prepared locally served drawing fonts.");
