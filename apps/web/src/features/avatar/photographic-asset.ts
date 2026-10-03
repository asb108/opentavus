import mira from "../../../../../assets/stock/photographic/manifest.json";
import einstein from "../../../../../assets/stock/einstein/manifest.json";
import type { VisemeSpan } from "@opentavus/contracts";
import type { AvatarVariant } from "./catalog";
import type { Delivery } from "./behavior";
import { AvatarFailure } from "./failure";

export const photographicShapes: VisemeSpan["shape"][] = [
  "rest",
  "closed",
  "open",
  "wide",
  "round",
  "pucker",
  "teeth",
  "tongue",
];
const fileIds = ["neutral", "warm", "attentive", "thoughtful", "poster"] as const;
type FileId = (typeof fileIds)[number];
type Region = readonly [number, number, number, number];
export type PhotographicBank = {
  id: string;
  root: "/avatars/photo" | "/avatars/einstein";
  manifest: unknown;
};
type PreparedManifest = {
  tile: 512;
  grid: 6;
  poses: 4;
  regions: { mouth: Region; eyes: Region };
  files: { id: Delivery | "poster"; bytes: number; sha256: string }[];
};

/** Trusted bundled choices only; configuration never supplies executable code or URLs. */
export function photographicBank(variant: AvatarVariant): PhotographicBank | undefined {
  if (variant === "einstein" || variant === "einstein-portrait")
    return { id: "stock.einstein.photographic.v1", root: "/avatars/einstein", manifest: einstein };
  if (variant === "mira-photo" || variant === "portrait")
    return { id: "stock.mira.photographic.v2", root: "/avatars/photo", manifest: mira };
  return undefined;
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
function region(value: unknown): value is Region {
  if (
    !Array.isArray(value) ||
    value.length !== 4 ||
    value.some((v) => typeof v !== "number" || !Number.isFinite(v))
  )
    return false;
  const [x, y, width, height] = value as number[];
  return (
    width >= 0.02 &&
    height >= 0.02 &&
    width <= 0.35 &&
    height <= 0.35 &&
    x - width >= 0 &&
    x + width <= 1 &&
    y - height >= 0 &&
    y + height <= 1
  );
}

/** Validate geometry, identity and file boundaries before allocating decoded sheets. */
export function validatePhotographicManifest(value: unknown, expectedId: string): PreparedManifest {
  const invalid = () =>
    new AvatarFailure(
      "asset_unavailable",
      "Photographic assets are not prepared. Choose another character and rebuild the app.",
    );
  if (
    !record(value) ||
    value.schema_version !== 1 ||
    value.id !== expectedId ||
    value.eligibility !== "reviewed_permissive" ||
    value.license !== "CC0-1.0" ||
    value.tile !== 512 ||
    value.grid !== 6 ||
    value.poses !== 4 ||
    JSON.stringify(value.visemes) !== JSON.stringify(photographicShapes) ||
    JSON.stringify(value.blink_indices) !== JSON.stringify([32, 33, 34, 35]) ||
    !record(value.regions) ||
    !region(value.regions.mouth) ||
    !region(value.regions.eyes) ||
    !Array.isArray(value.files) ||
    value.files.length !== fileIds.length
  )
    throw invalid();
  const files: PreparedManifest["files"] = [];
  const seen = new Set<string>();
  for (const file of value.files) {
    if (
      !record(file) ||
      typeof file.id !== "string" ||
      !fileIds.includes(file.id as FileId) ||
      seen.has(file.id) ||
      typeof file.bytes !== "number" ||
      !Number.isSafeInteger(file.bytes) ||
      file.bytes < 1 ||
      file.bytes > 4 * 1024 * 1024 ||
      typeof file.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(file.sha256)
    )
      throw invalid();
    seen.add(file.id);
    files.push({ id: file.id as FileId, bytes: file.bytes, sha256: file.sha256 });
  }
  return {
    tile: 512,
    grid: 6,
    poses: 4,
    files,
    regions: { mouth: value.regions.mouth, eyes: value.regions.eyes },
  };
}
