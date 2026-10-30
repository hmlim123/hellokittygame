import { CozyLights, COZY_EXPOSURE } from "./CozyLights";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { ACESFilmicToneMapping } from "three";
import { Kitty } from "./Kitty";
import { Dialog } from "../ui/Dialog";
import { useGameStore } from "../game/store";
import { OUTFITS, MAPS } from "../game/domain";
export type PhotoPose = "still" | "wave" | "cuddle" | "wink";
const BACKGROUNDS = [
  { id: "rose", name: "Rose milk", color: "#f3d6e2" },
  { id: "garden", name: "Garden morning", color: "#dce8d0" },
  { id: "moon", name: "Moonlit lavender", color: "#ded2ed" },
];
function Capture({
  capture,
}: {
  capture: React.RefObject<(() => string) | null>;
}) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    capture.current = () => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL("image/png");
    };
    return () => {
      capture.current = null;
    };
  }, [gl, scene, camera, capture]);
  return null;
}
async function postcard(imageUrl: string, caption: string): Promise<Blob> {
  const photo = new Image();
  photo.src = imageUrl;
  await photo.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 1000;
  canvas.height = 1200;
  const c = canvas.getContext("2d");
  if (!c) throw Error("Postcards are unavailable in this browser.");
  c.fillStyle = "#fff6e9";
  c.fillRect(0, 0, 1000, 1200);
  c.fillStyle = "#ead0dd";
  c.fillRect(28, 28, 944, 948);
  const crop = Math.min(photo.naturalWidth, photo.naturalHeight);
  c.drawImage(
    photo,
    (photo.naturalWidth - crop) / 2,
    (photo.naturalHeight - crop) / 2,
    crop,
    crop,
    44,
    44,
    912,
    916,
  );
  c.textAlign = "center";
  c.fillStyle = "#935d7b";
  c.font = "italic 66px Georgia, serif";
  c.fillText("For Nancy ♡", 500, 1062);
  c.fillStyle = "#937f86";
  c.font = "25px sans-serif";
  c.fillText(caption, 500, 1120, 880);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(Error("Could not make your postcard.")),
      "image/png",
    ),
  );
}
async function thumbnail(blob: Blob) {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 150;
    canvas.height = 180;
    const c = canvas.getContext("2d");
    if (!c) throw Error("Could not keep this postcard.");
    c.drawImage(image, 0, 0, 150, 180);
    return canvas.toDataURL("image/jpeg", 0.65);
  } finally {
    URL.revokeObjectURL(url);
  }
}
export default function PhotoCorner() {
  const equipment = useGameStore((s) => s.equipment),
    friend = useGameStore((s) => s.room.selected),
    close = useGameStore((s) => s.closePanel),
    [pose, setPose] = useState<PhotoPose>("still"),
    [background, setBackground] = useState("rose"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(
      "Choose an outfit in Inventory, then pick a pose and drag to look around.",
    );
  const capture = useRef<(() => string) | null>(null),
    ready = useRef(false),
    bg = BACKGROUNDS.find((b) => b.id === background)!,
    camera = useMemo(
      () => ({
        position: [0, 1.45, 5] as [number, number, number],
        fov: 36,
        near: 0.1,
        far: 30,
      }),
      [],
    );
  const save = async () => {
    if (!capture.current || !ready.current) {
      setMessage("Kitty is getting ready. Try again in a moment.");
      return;
    }
    setBusy(true);
    try {
      const blob = await postcard(
        capture.current(),
        `${OUTFITS.find((o) => o.id === equipment.outfit)?.name} · ${bg.name}`,
      );
      const image = await thumbnail(blob),
        s = useGameStore.getState();
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "For-Nancy-Hello-Kitty.png";
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      useGameStore.getState().savePostcard();
      s.keepPostcard({
        id: crypto.randomUUID(),
        image,
        outfit: equipment.outfit,
        background: bg.name,
        pose,
        place:
          s.mode === "adventure" ? MAPS[s.adventure.map].title : "Kitty’s room",
        createdAt: new Date().toISOString(),
      });
      setMessage(
        "Your postcard is ready. If your browser asks, choose Save. Its little frame is waiting on your keepsake wall at home. ♡",
      );
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Your postcard could not save. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      title="Nancy’s photo corner"
      onClose={close}
      className="photo-dialog"
    >
      <span className="eyebrow">A LITTLE MOMENT TO KEEP</span>
      <h2>Nancy’s photo corner</h2>
      <div className="photo-preview">
        <Canvas
          camera={camera}
          dpr={1.5}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
          onCreated={({ gl }) => {
            gl.toneMapping = ACESFilmicToneMapping;
            gl.toneMappingExposure = COZY_EXPOSURE;
            gl.domElement.setAttribute(
              "aria-label",
              "Kitty postcard preview. Drag to rotate.",
            );
          }}
        >
          <color attach="background" args={[bg.color]} />
          <CozyLights />
          <Suspense fallback={null}>
            <Kitty id={friend} equipment={equipment} photoPose={pose} />
            <PhotoReady ready={ready} />
          </Suspense>
          <Capture capture={capture} />
          <OrbitControls
            makeDefault
            target={[0, 1.14, 0]}
            enablePan={false}
            enableZoom={false}
            minPolarAngle={0.5}
            maxPolarAngle={2}
          />
        </Canvas>
        <span>For Nancy ♡</span>
      </div>
      <fieldset>
        <legend>A little pose</legend>
        <div className="photo-options">
          {(["still", "wave", "cuddle", "wink"] as PhotoPose[]).map((p) => (
            <button
              key={p}
              aria-pressed={pose === p}
              onClick={() => setPose(p)}
            >
              {
                {
                  still: "Sweet & still",
                  wave: "A little wave",
                  cuddle: "Cuddle",
                  wink: "Wink ♡",
                }[p]
              }
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>A little atmosphere</legend>
        <div className="photo-options">
          {BACKGROUNDS.map((b) => (
            <button
              key={b.id}
              aria-pressed={background === b.id}
              onClick={() => setBackground(b.id)}
            >
              {b.name}
            </button>
          ))}
        </div>
      </fieldset>
      <p role="status" className="small-note">
        {message}
      </p>
      <p className="small-note">
        Your six most recent postcards stay on the keepsake wall. Downloaded
        PNGs are yours to keep.
      </p>
      <div className="memory-actions">
        <button onClick={() => useGameStore.getState().openPanel("inventory")}>
          Change outfit
        </button>
        <button className="primary" disabled={busy} onClick={() => void save()}>
          {busy ? "Making your postcard…" : "Save postcard PNG ♡"}
        </button>
      </div>
    </Dialog>
  );
}
function PhotoReady({ ready }: { ready: React.RefObject<boolean> }) {
  useEffect(() => {
    ready.current = true;
    return () => {
      ready.current = false;
    };
  }, [ready]);
  return null;
}
