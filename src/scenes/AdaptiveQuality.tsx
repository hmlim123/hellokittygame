import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGameStore } from "../game/store";
import { qualityCap, QualityController } from "../game/render-quality";
export function AdaptiveQuality({
  enabled = true,
  onDprChange,
}: {
  enabled?: boolean;
  onDprChange: (dpr: number) => void;
}) {
  const quality = useGameStore((s) => s.preferences.quality),
    { size, gl } = useThree();
  const cap = Math.min(
      qualityCap(quality, size.width < 640),
      Math.max(1, window.devicePixelRatio || 1),
    ),
    controller = useMemo(() => new QualityController(cap), [cap, quality]);
  useEffect(() => {
    if (enabled) onDprChange(cap);
  }, [cap, enabled, onDprChange]);
  useFrame((_, dt) => {
    if (enabled && quality === "auto" && !document.hidden) {
      const target = controller.sample(dt);
      if (target !== null) onDprChange(target);
    }
    gl.domElement.dataset.visualDetail = quality;
    gl.domElement.dataset.pixelRatio = String(gl.getPixelRatio());
  });
  return null;
}
