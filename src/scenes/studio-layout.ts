import source from "../../dist/assets/studio-home.json";

interface StudioSource {
  anchors: Record<string, { position: number[]; yaw: number }>;
  floor: number[][];
  framing: number[][];
  shelf_scale: number;
}
export const STUDIO_LAYOUT = source as StudioSource;
/** All furniture and souvenir positions come from the actual Blender scene. */
export function studioAnchor(name: string): [number, number, number] {
  const p = STUDIO_LAYOUT.anchors[name]?.position;
  if (!p) throw new Error(`Studio anchor ${name} is missing`);
  return [p[0], p[1], p[2]];
}
export function studioYaw(name: string) {
  return STUDIO_LAYOUT.anchors[name]?.yaw || 0;
}
export const STUDIO_SLOTS = Array.from({ length: 6 }, (_, i) =>
  studioAnchor(`shelf_${i}`),
);
export const STUDIO_SHELF_SCALE = STUDIO_LAYOUT.shelf_scale;
export const STUDIO_KITTY = studioAnchor("kitty");
export const STUDIO_SHADOW = studioAnchor("kitty_shadow");
