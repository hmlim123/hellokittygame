import { describe, it, expect } from "vitest";
import RAPIER from "@dimforge/rapier3d-compat";
import { TileMotor, PHYSICS_STEP } from "./tile-motor";
await RAPIER.init();
function fixture(wall = false) {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 }),
    body = world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(7, 0, 8),
    );
  world.createCollider(
    RAPIER.ColliderDesc.capsule(0.18, 0.18).setTranslation(0, 0.39, 0),
    body,
  );
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(10, 0.1, 10).setTranslation(7, -0.12, 8),
  );
  if (wall)
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.48, 0.7, 0.48).setTranslation(8, 0.7, 8),
    );
  const controller = world.createCharacterController(0.015);
  world.timestep = PHYSICS_STEP;
  world.step();
  return { world, body, motor: new TileMotor(world, body, controller) };
}
describe("refresh-independent adventure movement", () => {
  for (const fps of [20, 30, 60, 120, 144, 240])
    it(`finishes a smooth tile at ${fps} display frames per second without timing out or snapping back`, () => {
      const { world, body, motor } = fixture();
      motor.begin({ x: 8, z: 8 });
      let acc = 0,
        result: string | null = null,
        steps = 0,
        previous = 7;
      for (let frame = 0; frame < fps * 2 && !result; frame++) {
        acc += 1 / fps;
        while (acc + 1e-9 >= PHYSICS_STEP && !result) {
          motor.beforeStep();
          world.step();
          steps++;
          const x = body.translation().x;
          expect(x).toBeGreaterThanOrEqual(previous - 1e-6);
          expect(x - previous).toBeLessThan(0.054);
          previous = x;
          result = motor.afterStep();
          acc -= PHYSICS_STEP;
        }
      }
      expect(result).toBe("arrived");
      expect(body.translation().x).toBeCloseTo(8, 5);
      expect(steps).toBeLessThan(35);
      world.free();
    });
  it("blocks a wall before leaving the tile, avoiding the old lunge and rollback", () => {
    const { world, body, motor } = fixture(true);
    motor.begin({ x: 8, z: 8 });
    motor.beforeStep();
    world.step();
    expect(motor.afterStep()).toBe("blocked");
    expect(body.translation().x).toBeCloseTo(7, 6);
    world.free();
  });
  it("continues held movement through multiple tiles without stopping at each boundary", () => {
    const { world, body, motor } = fixture();
    motor.begin({ x: 8, z: 8 }, true, true);
    let completed = 0,
      previous = 7;
    const boundarySpeeds: number[] = [];
    for (let i = 0; i < 100 && completed < 3; i++) {
      motor.beforeStep(PHYSICS_STEP, true);
      world.step();
      const x = body.translation().x;
      expect(x - previous).toBeGreaterThan(0);
      previous = x;
      const result = motor.afterStep();
      if (result) {
        expect(result).toBe("arrived");
        boundarySpeeds.push(motor.speed);
        completed++;
        if (completed < 3) motor.begin({ x: 8 + completed, z: 8 }, true, true);
      }
    }
    expect(completed).toBe(3);
    expect(body.translation().x).toBeCloseTo(10, 5);
    expect(boundarySpeeds.every((speed) => speed > 0.5)).toBe(true);
    world.free();
  });
});
