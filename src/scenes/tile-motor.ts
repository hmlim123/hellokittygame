import type {
  World,
  RigidBody,
  KinematicCharacterController,
} from "@dimforge/rapier3d-compat";
export const PHYSICS_STEP = 1 / 60;
interface Point {
  x: number;
  z: number;
}
interface Target {
  start: Point;
  end: Point;
  elapsed: number;
  stalled: number;
  checked: boolean;
  canEnter: boolean;
  returning: boolean;
  initialSpeed: number;
}
/** Kinematic movement advances on physics ticks, never on display frames. */
export class TileMotor {
  private target: Target | null = null;
  private pending: "arrived" | "blocked" | null = null;
  speed = 0;
  constructor(
    private world: World,
    private body: RigidBody,
    private controller: KinematicCharacterController,
  ) {}
  begin(end: Point, canEnter = true, continuous = false) {
    const p = this.body.translation();
    this.target = {
      start: { x: p.x, z: p.z },
      end,
      elapsed: 0,
      stalled: 0,
      checked: false,
      canEnter,
      returning: false,
      initialSpeed: continuous ? this.speed : 0,
    };
    this.pending = null;
  }
  beforeStep(dt = PHYSICS_STEP, continuous = false) {
    const t = this.target;
    if (!t) {
      this.speed = 0;
      return;
    }
    const p = this.body.translation();
    if (!t.checked) {
      // Test the whole tile before leaving its center; walls no longer cause a lunge and snap-back.
      this.world.propagateModifiedBodyPositionsToColliders();
      const desired = { x: t.end.x - p.x, y: 0, z: t.end.z - p.z };
      this.controller.computeColliderMovement(this.body.collider(0), desired);
      const m = this.controller.computedMovement();
      t.checked = true;
      if (!t.canEnter || Math.hypot(m.x - desired.x, m.z - desired.z) > 0.025) {
        this.pending = "blocked";
        this.body.setNextKinematicTranslation({ x: p.x, y: 0, z: p.z });
        return;
      }
    }
    if (this.pending) return;
    const end = t.returning ? t.start : t.end,
      distance = Math.hypot(end.x - p.x, end.z - p.z);
    t.elapsed += dt;
    if (distance < 0.0001) {
      this.pending = t.returning ? "blocked" : "arrived";
      this.body.setNextKinematicTranslation({ x: end.x, y: 0, z: end.z });
      this.speed = 0;
      return;
    }
    const step =
      distance < 0.025
        ? distance
        : Math.min(
            distance,
            dt *
              Math.min(
                t.initialSpeed + (3.2 * t.elapsed) / 0.09,
                3.2,
                continuous && !t.returning ? Infinity : distance * 12,
              ),
          );
    this.controller.computeColliderMovement(this.body.collider(0), {
      x: ((end.x - p.x) / distance) * step,
      y: 0,
      z: ((end.z - p.z) / distance) * step,
    });
    const m = this.controller.computedMovement();
    this.body.setNextKinematicTranslation({ x: p.x + m.x, y: 0, z: p.z + m.z });
    this.speed = Math.hypot(m.x, m.z) / dt;
    t.stalled = this.speed < 0.02 ? t.stalled + dt : 0;
    if (!t.returning && (t.stalled > 0.15 || t.elapsed > 2)) {
      t.returning = true;
      t.elapsed = 0;
      t.stalled = 0;
    }
  }
  afterStep(): "arrived" | "blocked" | null {
    const t = this.target;
    if (!t) return null;
    const p = this.body.translation(),
      end = t.returning ? t.start : t.end;
    const result =
      this.pending ||
      (Math.hypot(p.x - end.x, p.z - end.z) < 0.0001
        ? t.returning
          ? "blocked"
          : "arrived"
        : null);
    if (result) {
      this.target = null;
      this.pending = null;
      if (result === "blocked") this.speed = 0;
    }
    return result;
  }
}
