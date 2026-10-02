import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { createAvatar, type AvatarRenderer } from "./renderer";
import { avatarInfo, type AvatarVariant } from "./catalog";
import { AvatarFailure } from "./failure";

export function Avatar({
  variant,
  rendererRef,
}: {
  variant: AvatarVariant;
  rendererRef: MutableRefObject<AvatarRenderer | null>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"preparing" | "ready" | "fallback">("preparing");
  const [failure, setFailure] = useState("");
  const photographic = variant === "mira-photo" || variant === "portrait";
  const human = variant === "mira" || photographic;
  useEffect(() => {
    if (!canvas.current) return;
    const controller = new AbortController();
    let instance: AvatarRenderer | null = null;
    rendererRef.current = null;
    setStatus("preparing");
    const fallback = (error: unknown) => {
      if (controller.signal.aborted) return;
      instance?.dispose();
      rendererRef.current = null;
      setFailure(
        error instanceof AvatarFailure
          ? error.message
          : "Character rendering failed. Your call still works; choose another character or refresh.",
      );
      setStatus("fallback");
    };
    void createAvatar(canvas.current, variant, controller.signal, fallback)
      .then((renderer) => {
        if (controller.signal.aborted) {
          renderer.dispose();
          return;
        }
        instance = renderer;
        rendererRef.current = renderer;
        setStatus("ready");
      })
      .catch(fallback);
    return () => {
      controller.abort();
      instance?.dispose();
      rendererRef.current = null;
    };
  }, [variant, rendererRef]);
  return (
    <>
      {human && (status !== "ready" || variant === "portrait") && (
        <img
          className={`avatar avatar-human avatar-poster ${photographic ? "avatar-photographic" : ""}`}
          src={photographic ? "/avatars/photo/poster.webp" : "/avatars/mira.png"}
          alt="Mira, a fictional human AI avatar"
        />
      )}
      <canvas
        key={variant}
        ref={canvas}
        className={`avatar ${human ? "avatar-human" : ""} ${photographic ? "avatar-photographic" : ""}`}
        hidden={status !== "ready" || variant === "portrait"}
        role="img"
        aria-label={`${avatarInfo[variant].name}, an animated AI character`}
        data-avatar={variant}
        data-ready={status === "ready"}
      />
      {status === "preparing" && (variant === "mira" || variant === "mira-photo") && (
        <span className="avatar-notice" role="status">
          {photographic ? "Preparing portrait motion…" : "Loading human avatar…"}
        </span>
      )}
      {(status === "fallback" || variant === "portrait") && (
        <span className="avatar-notice" role="status">
          {status === "fallback" ? failure : "Portrait mode · No animation"}
        </span>
      )}
    </>
  );
}
