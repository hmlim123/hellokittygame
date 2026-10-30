import { Vector3, type Camera, type Object3D } from "three";
const projected = new Vector3();
/** Keep a nearby friend's touch target inside the scene, below its tool row. */
export function npcLabelPosition(
  object: Object3D,
  camera: Camera,
  size: { width: number; height: number },
): [number, number] {
  projected.setFromMatrixPosition(object.matrixWorld).project(camera);
  const margin = Math.min(110, size.width / 2 - 8);
  const x = ((projected.x + 1) * size.width) / 2,
    y = ((1 - projected.y) * size.height) / 2;
  return [
    Math.max(margin, Math.min(size.width - margin, x)),
    Math.max(72, Math.min(size.height - 38, y)),
  ];
}
