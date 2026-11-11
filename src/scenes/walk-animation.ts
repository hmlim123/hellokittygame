import * as THREE from "three";
interface WalkRig {
  feet: {
    pivot: THREE.Group;
    base: THREE.Vector3;
    plant: THREE.Vector3 | null;
    stance: boolean;
  }[];
  body: THREE.Group;
  bodyBase: THREE.Vector3;
  phase: number;
  amount: number;
  last: THREE.Vector3;
  initialized: boolean;
}
function pivotFor(object: THREE.Object3D) {
  if (object.parent?.name === "Walk_" + object.name)
    return object.parent as THREE.Group;
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
      last: new THREE.Vector3(),
      initialized: false,
      amount: 0,
      feet: ["CTRL_Foot_L", "CTRL_Foot_R"].map((name) => {
        const pivot = pivotFor(b.model.getObjectByName(name));
        return {
          pivot,
          base: pivot.position.clone(),
          plant: null,
          stance: false,
        };
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
  locked = false,
) {
  const rig = walkingRig(hero);
  dt = Number.isFinite(dt) ? Math.min(0.1, Math.max(0, dt)) : 0;
  speed = Number.isFinite(speed) ? Math.max(0, Math.min(4, speed)) : 0;
  const position = hero.getWorldPosition(new THREE.Vector3());
  const traveled = rig.initialized
    ? Math.hypot(position.x - rig.last.x, position.z - rig.last.z)
    : 0;
  rig.last.copy(position);
  rig.initialized = true;
  const scale = hero.userData.blender.normalize.getWorldScale(
    new THREE.Vector3(),
  ).x;
  const moving = !locked && (speed > 0.05 || traveled > 0.001),
    teleport = traveled > 0.5;
  const oldStep = Math.floor(rig.phase / Math.PI);
  rig.amount =
    reduced || locked
      ? 0
      : THREE.MathUtils.lerp(
          rig.amount,
          moving ? 1 : 0,
          1 - Math.exp(-dt * 14),
        );
  if (rig.amount < 0.001) rig.amount = 0;
  // Phase follows distance travelled, so shorter steps and slow turns retain
  // their footing instead of cycling at an unrelated animation speed.
  if (reduced) rig.phase = 0;
  else if (moving && !teleport)
    rig.phase += (traveled / (1.25 * Math.max(0.01, scale))) * Math.PI * 2;
  for (let i = 0; i < 2; i++) {
    const f = rig.feet[i],
      cycle = (((rig.phase / (Math.PI * 2) + i * 0.5) % 1) + 1) % 1,
      stance = cycle < 0.6;
    const u = stance ? cycle / 0.6 : (cycle - 0.6) / 0.4,
      smooth = u * u * (3 - 2 * u);
    const z = stance ? 0.375 - u * 0.75 : -0.375 + smooth * 0.75;
    const lift = stance ? 0 : Math.sin(u * Math.PI) * 0.24;
    f.pivot.position.copy(f.base);
    f.pivot.position.z += z * rig.amount;
    f.pivot.position.y += lift * rig.amount;
    f.pivot.rotation.x = stance ? 0 : Math.sin(u * Math.PI) * 0.18 * rig.amount;
    if (moving && stance && !reduced && !teleport) {
      if (!f.stance || !f.plant) {
        f.pivot.updateWorldMatrix(true, false);
        f.plant = f.pivot.getWorldPosition(new THREE.Vector3());
      } else {
        const local = f.pivot.parent!.worldToLocal(f.plant.clone());
        f.pivot.position.x = THREE.MathUtils.clamp(
          local.x,
          f.base.x - 0.7,
          f.base.x + 0.7,
        );
        f.pivot.position.z = THREE.MathUtils.clamp(
          local.z,
          f.base.z - 0.8,
          f.base.z + 0.8,
        );
      }
    } else f.plant = null;
    f.stance = stance;
    const held =
      hero.userData.blender.heldAttachment ||
      (hero.userData.equipment?.item &&
        hero.userData.equipment.item !== "none");
    hero.userData.blender.armIdle[i].rotation.x = held
      ? 0
      : -Math.sin(rig.phase + i * Math.PI) * 0.1 * rig.amount;
  }
  rig.body.position.copy(rig.bodyBase);
  rig.body.position.y += (1 - Math.cos(rig.phase * 2)) * 0.025 * rig.amount;
  rig.body.rotation.z = Math.sin(rig.phase) * 0.025 * rig.amount;
  return (
    !reduced &&
    moving &&
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
