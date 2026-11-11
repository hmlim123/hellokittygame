type Point = { x: number; z: number };
/** Finish the same small step whether a tap spans zero, one or several frames. */
export function thumbStepTarget(
  start: Point,
  current: Point,
  direction: Point,
  heldMs: number,
): Point | null {
  const strength = Math.hypot(direction.x, direction.z);
  if (heldMs < 0 || heldMs >= 180 || strength <= 0.13) return null;
  const target = {
    x: start.x + direction.x * 0.18,
    z: start.z + direction.z * 0.18,
  };
  if (
    Math.hypot(current.x - start.x, current.z - start.z) >= strength * 0.18 ||
    (target.x - current.x) * direction.x +
      (target.z - current.z) * direction.z <=
      0
  )
    return null;
  return target;
}
