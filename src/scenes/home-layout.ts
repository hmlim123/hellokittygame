import { Vector3, type OrthographicCamera } from "three";
import { STUDIO_LAYOUT, studioAnchor } from "./studio-layout";

export const HOME_TARGET = new Vector3(0, 1.65, 0.15);
export const HOME_PLAY_TARGET = new Vector3(-0.12, 1.65, 0.9);
export const HOME_OFFSET = new Vector3(10, 11, 15)
  .normalize()
  .multiplyScalar(18);
const HOME_FRAMING_POINTS = STUDIO_LAYOUT.framing;
export const HOME_FLOOR = STUDIO_LAYOUT.floor;
export const HOME_DOOR = studioAnchor("door");

/** Frame the house as a whole on portrait phones and wide screens. */
export function frameHome(
  camera: OrthographicCamera,
  width: number,
  height: number,
) {
  camera.position.copy(HOME_TARGET).add(HOME_OFFSET);
  camera.lookAt(HOME_TARGET);
  camera.updateMatrixWorld(true);
  let horizontal = 0,
    vertical = 0;
  const corner = new Vector3();
  for (const point of HOME_FRAMING_POINTS) {
    corner
      .set(point[0], point[1], point[2])
      .applyMatrix4(camera.matrixWorldInverse);
    horizontal = Math.max(horizontal, Math.abs(corner.x));
    vertical = Math.max(vertical, Math.abs(corner.y));
  }
  const zoom = Math.min(
    Math.max(1, width - (width < 640 ? 28 : 56)) / (2 * horizontal),
    Math.max(1, height - 88) / (2 * vertical),
  );
  camera.zoom = zoom;
  camera.updateProjectionMatrix();
  return zoom;
}

/** Existing little games need spaced touch targets while the home stays wide by default. */
export function frameHomePlay(
  camera: OrthographicCamera,
  width: number,
  height: number,
) {
  const target = HOME_PLAY_TARGET;
  camera.position.copy(target).add(new Vector3(2.2, 1.65, 6));
  camera.lookAt(target);
  camera.zoom = Math.min(
    Math.max(1, width - 28) / 6.8,
    Math.max(1, height - 64) / 5,
  );
  camera.updateProjectionMatrix();
  return { zoom: camera.zoom, target };
}
