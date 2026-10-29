import * as THREE from "three";
interface WalkRig {
  feet: { pivot: THREE.Group; base: THREE.Vector3 }[];
  body: THREE.Group;
  bodyBase: THREE.Vector3;
  phase: number;
  amount: number;
}
function pivotFor(object: THREE.Object3D) {
  const pivot = new THREE.Group();
  pivot.name = "Walk_" + object.name;
  pivot.position.copy(object.position);
  object.parent!.add(pivot);
  pivot.add(object);
  object.position.set(0, 0, 0);
  return pivot;
}
export function walkingRig(hero: THREE.Group): WalkRig {
  const b = hero.userData.blender;
  if (!b.walkRig) {
    const body = pivotFor(b.model.getObjectByName("CTRL_Body"));
    b.walkRig = {
      body,
      bodyBase: body.position.clone(),
      phase: 0,
      amount: 0,
      feet: ["CTRL_Foot_L", "CTRL_Foot_R"].map((name) => {
        const pivot = pivotFor(b.model.getObjectByName(name));
        return { pivot, base: pivot.position.clone() };
      }),
    };
  }
  return b.walkRig;
}
/** Additive pivots leave Blender's original wave/dance controller tracks intact. */
export function updateWalking(
  hero: THREE.Group,
  dt: number,
  speed: number,
  reduced = false,
) {
  const rig = walkingRig(hero);
  dt = Number.isFinite(dt) ? Math.min(0.1, Math.max(0, dt)) : 0;
  speed = Number.isFinite(speed) ? Math.max(0, Math.min(4, speed)) : 0;
  const oldStep = Math.floor(rig.phase / Math.PI);
  rig.amount = reduced
    ? 0
    : THREE.MathUtils.lerp(
        rig.amount,
        speed > 0.05 ? 1 : 0,
        1 - Math.exp(-dt * 14),
      );
  if (rig.amount < 0.001) rig.amount = 0;
  if (reduced) rig.phase = 0;
  else if (speed > 0.05) rig.phase += (speed * dt * Math.PI * 2) / 1.35;
  for (let i = 0; i < 2; i++) {
    const f = rig.feet[i],
      swing = Math.sin(rig.phase + i * Math.PI) * rig.amount;
    f.pivot.position.copy(f.base);
    f.pivot.position.y += Math.max(0, swing) * 0.2;
    f.pivot.position.z += swing * 0.25;
    f.pivot.rotation.x = swing * 0.28;
    hero.userData.blender.armIdle[i].rotation.x = -swing * 0.13;
  }
  rig.body.position.copy(rig.bodyBase);
  rig.body.position.y += (1 - Math.cos(rig.phase * 2)) * 0.025 * rig.amount;
  rig.body.rotation.z = Math.sin(rig.phase) * 0.025 * rig.amount;
  return (
    !reduced &&
    speed > 0.05 &&
    rig.amount > 0.2 &&
    Math.floor(rig.phase / Math.PI) !== oldStep
  );
}
export function turnToward(
  current: number,
  target: number,
  dt: number,
  reduced = false,
) {
  const delta = Math.atan2(
    Math.sin(target - current),
    Math.cos(target - current),
  );
  return reduced
    ? current + delta
    : current + delta * (1 - Math.exp(-Math.max(0, dt) * 14));
}
