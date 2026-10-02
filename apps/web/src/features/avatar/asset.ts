/** The shipped stock GLB is data, with no remote buffers, images or decoder code. */
export function validateStockGlb(bytes: ArrayBuffer): void {
  const fail = () => {
    throw new Error("The human avatar asset is invalid. Rebuild the local app.");
  };
  if (bytes.byteLength < 24 || bytes.byteLength > 8 * 1024 * 1024) fail();
  const view = new DataView(bytes);
  if (
    view.getUint32(0, true) !== 0x46546c67 ||
    view.getUint32(4, true) !== 2 ||
    view.getUint32(8, true) !== bytes.byteLength ||
    view.getUint32(16, true) !== 0x4e4f534a
  )
    fail();
  const length = view.getUint32(12, true);
  if (length > bytes.byteLength - 20) fail();
  const value: unknown = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 20, length)));
  if (!isRecord(value) || !isRecord(value.asset) || value.asset.version !== "2.0") fail();
  const gltf = value as Record<string, unknown>;
  for (const key of ["buffers", "images"]) {
    const entries = gltf[key];
    if (
      !Array.isArray(entries) ||
      entries.length > 100 ||
      entries.some((entry: unknown) => !isRecord(entry) || "uri" in entry)
    )
      fail();
  }
  for (const key of ["extensionsUsed", "extensionsRequired"]) {
    const extensions = gltf[key];
    if (
      extensions !== undefined &&
      (!Array.isArray(extensions) ||
        extensions.some((entry: unknown) => entry !== "EXT_texture_webp"))
    )
      fail();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
