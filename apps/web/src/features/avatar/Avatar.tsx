import { useEffect, useRef, type MutableRefObject } from "react";
import { createCompanion, type AvatarRenderer } from "./renderer";

export function Avatar({
  variant,
  rendererRef,
}: {
  variant: "orbit" | "lumen";
  rendererRef: MutableRefObject<AvatarRenderer | null>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvas.current) return;
    const instance = createCompanion(canvas.current, variant);
    rendererRef.current = instance;
    return () => {
      instance.dispose();
      rendererRef.current = null;
    };
  }, [variant, rendererRef]);
  return (
    <canvas
      ref={canvas}
      className="avatar"
      role="img"
      aria-label={`${variant === "orbit" ? "Orbit" : "Lumen"}, an animated AI character`}
    />
  );
}
