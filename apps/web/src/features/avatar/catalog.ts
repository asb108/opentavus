import type { Settings } from "../../api";

export type AvatarVariant = Settings["avatar"];

export const avatarInfo = {
  einstein: {
    name: "Einstein",
    label: "AI portrayal · Synthetic voice",
    description: "Albert Einstein · Historical photograph with prepared speech motion",
  },
  "einstein-portrait": {
    name: "Einstein",
    label: "AI portrayal · Synthetic voice",
    description: "Albert Einstein · Static historical portrait · Least graphics work",
  },
  "mira-photo": {
    name: "Mira",
    label: "AI · Photographic preview",
    description: "Photographic face · Prepared expressions and speech movement",
  },
  mira: {
    name: "Mira",
    label: "AI · 3D human",
    description: "Human 3D preview · Browser graphics",
  },
  portrait: {
    name: "Mira",
    label: "AI · Static portrait",
    description: "Static human portrait · Least graphics work",
  },
  orbit: { name: "Orbit", label: "Cartoon preview", description: "Blue cartoon preview" },
  lumen: { name: "Lumen", label: "Cartoon preview", description: "Green cartoon preview" },
} satisfies Record<AvatarVariant, { name: string; label: string; description: string }>;
