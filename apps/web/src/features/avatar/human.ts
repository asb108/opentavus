import {
  ACESFilmicToneMapping,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  Scene,
  SkinnedMesh,
  Texture,
  Vector3,
  WebGLRenderer,
  type Object3D,
  type Material,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import manifest from "../../../../../assets/stock/mira/manifest.json";
import { validateStockGlb } from "./asset";
import { AvatarFailure } from "./failure";
import type { AvatarRenderer } from "./renderer";

/** Only the curated stock human is accepted. Custom GLB import is a separate task. */
export async function createHuman(
  canvas: HTMLCanvasElement,
  signal: AbortSignal,
  unavailable: (failure: AvatarFailure) => void,
): Promise<AvatarRenderer> {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
  } catch {
    throw new AvatarFailure(
      "unsupported_graphics",
      "WebGL 2 is unavailable. Portrait mode works; choose another character or enable browser graphics and refresh.",
    );
  }
  renderer.setPixelRatio(1);
  renderer.setSize(384, 384, false);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.01, 10);
  scene.add(new HemisphereLight(0xfff4e8, 0x8eacdd, 2.2));
  const key = new DirectionalLight(0xffffff, 3.0);
  key.position.set(-1, 2, 2);
  scene.add(key);
  const fill = new DirectionalLight(0xb8d1ff, 1.4);
  fill.position.set(1, 1, 1);
  scene.add(fill);
  let model: Object3D | null = null;
  let frame = 0;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    canvas.removeEventListener("webglcontextlost", lost);
    signal.removeEventListener("abort", dispose);
    if (model) releaseModel(model);
    renderer.dispose();
    renderer.forceContextLoss();
  };
  const lost = (event: Event) => {
    event.preventDefault();
    dispose();
    unavailable(
      new AvatarFailure(
        "context_lost",
        "Browser graphics stopped. Portrait mode works; refresh to retry 3D.",
      ),
    );
  };
  canvas.addEventListener("webglcontextlost", lost);
  signal.addEventListener("abort", dispose, { once: true });
  try {
    signal.throwIfAborted();
    const response = await fetch("/avatars/mira.glb", {
      signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]),
    });
    if (!response.ok || Number(response.headers.get("Content-Length")) > 8 * 1024 * 1024)
      throw new Error("Human avatar loading failed.");
    const bytes = await response.arrayBuffer();
    validateStockGlb(bytes);
    const digest = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    if (digest !== manifest.prepared.sha256)
      throw new Error("The human avatar checksum is invalid.");
    const gltf = await new GLTFLoader().parseAsync(bytes, "");
    if (disposed || signal.aborted) {
      releaseModel(gltf.scene);
      throw new Error("Human avatar preparation was cancelled.");
    }
    model = gltf.scene;
    scene.add(model);
    model.updateMatrixWorld(true);
    const head = model.getObjectByName("Head");
    const meshes: Mesh[] = [];
    model.traverse((object) => {
      if (object instanceof Mesh && object.morphTargetDictionary && object.morphTargetInfluences)
        meshes.push(object);
    });
    if (!head || !meshes.some((mesh) => mesh.morphTargetDictionary?.jawOpen !== undefined))
      throw new Error("The human avatar is missing its reviewed face rig.");
    const eyes = head.getWorldPosition(new Vector3());
    camera.position.set(eyes.x, eyes.y + 0.12, eyes.z + 0.88);
    camera.lookAt(eyes.x, eyes.y + 0.055, eyes.z);
    const neutral = head.rotation.clone();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let mouth = 0;
    let listening = false;
    let lastFrame = -Infinity;
    const shape = (name: string, value: number) => {
      for (const mesh of meshes) {
        const index = mesh.morphTargetDictionary?.[name];
        if (index !== undefined && mesh.morphTargetInfluences)
          mesh.morphTargetInfluences[index] = value;
      }
    };
    const draw = (now: number) => {
      if (disposed) return;
      frame = requestAnimationFrame(draw);
      if (document.hidden || now - lastFrame < 1000 / 30 - 0.5) return;
      lastFrame = now;
      const blink =
        !reduced && now % 5200 > 5000 ? Math.sin((((now % 5200) - 5000) / 200) * Math.PI) : 0;
      shape("eyeBlinkLeft", blink);
      shape("eyeBlinkRight", blink);
      head.rotation.y =
        neutral.y + (reduced ? 0 : Math.sin(now / 2400) * (listening ? 0.025 : 0.012));
      head.rotation.z = neutral.z + (reduced ? 0 : Math.sin(now / 3200) * 0.012);
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(draw);
    return {
      setLevel(level) {
        if (disposed) return;
        const previous = mouth;
        mouth = Number.isFinite(level) ? Math.min(0.85, Math.max(0, level * 5)) : 0;
        shape("jawOpen", mouth);
        // Closing is immediate; there is no smoothing tail or independent speech queue.
        if (previous > 0 && mouth === 0 && !document.hidden) renderer.render(scene, camera);
      },
      setListening(value) {
        listening = value;
      },
      dispose,
    };
  } catch (error) {
    dispose();
    if (signal.aborted) throw error;
    throw new AvatarFailure(
      "asset_unavailable",
      "The human asset could not load. Portrait mode works; rebuild the local app and refresh.",
    );
  }
}

function releaseModel(model: Object3D): void {
  const textures = new Set<Texture>();
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    if (object instanceof SkinnedMesh) object.skeleton.dispose();
    const materials: Material[] = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) {
      for (const value of Object.values(material))
        if (value instanceof Texture) textures.add(value);
      material.dispose();
    }
  });
  for (const texture of textures) {
    const image: unknown = texture.source.data;
    if (image instanceof ImageBitmap) image.close();
    texture.dispose();
  }
}
