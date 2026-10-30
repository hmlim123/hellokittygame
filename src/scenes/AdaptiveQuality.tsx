import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGameStore } from "../game/store";
import { qualityCap, QualityController } from "../game/render-quality";
export function AdaptiveQuality() {
  const quality = useGameStore((s) => s.preferences.quality),
    { size, setDpr, gl } = useThree();
  const cap = Math.min(
      qualityCap(quality, size.width < 640),
      Math.max(1, window.devicePixelRatio || 1),
    ),
    controller = useMemo(() => new QualityController(cap), [cap, quality]);
  useEffect(() => {
    setDpr(cap);
  }, [cap, setDpr]);
  useFrame((_, dt) => {
    if (quality === "auto" && !document.hidden) {
      const next = controller.sample(dt);
      if (next !== null) setDpr(next);
    }
    // Canvas reconfiguration (menus, resizing or rotation) can restore its
    // initial pixel ratio. Reconcile it with the selected/adapted detail.
    const target = quality === "auto" ? controller.dpr : cap;
    if (Math.abs(gl.getPixelRatio() - target) > 0.01) setDpr(target);
    gl.domElement.dataset.visualDetail = quality;
    gl.domElement.dataset.pixelRatio = String(gl.getPixelRatio());
  });
  return null;
}
