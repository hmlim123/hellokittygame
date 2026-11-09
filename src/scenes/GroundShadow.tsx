import { useMemo } from "react";
import { CanvasTexture } from "three";
let shared: CanvasTexture | undefined;
function shadowTexture() {
  if (shared) return shared;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d")!,
    gradient = context.createRadialGradient(32, 32, 3, 32, 32, 31);
  gradient.addColorStop(0, "rgba(75,57,61,.26)");
  gradient.addColorStop(0.45, "rgba(75,57,61,.12)");
  gradient.addColorStop(1, "rgba(75,57,61,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  shared = new CanvasTexture(canvas);
  return shared;
}
/** A tiny shared texture gives feet a soft contact cue on a phone GPU. */
export function GroundShadow({
  size = [1.5, 0.9],
}: {
  size?: [number, number];
}) {
  const map = useMemo(shadowTexture, []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
      <planeGeometry args={size} />
      <meshBasicMaterial
        map={map}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
