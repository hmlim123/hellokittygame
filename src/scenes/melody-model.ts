import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { assetUrl } from "../game/assets";
import { updateWalking, walkingRig } from "./walk-animation";
import type { Gesture } from "../game/types";
interface Asset {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}
interface Resource {
  promise: Promise<unknown>;
  value?: Asset;
  error?: Error;
}
let resource: Resource | undefined;
export function readMelodyAsset(): Asset {
  if (!resource) {
    const entry = {} as Resource;
    entry.promise = new GLTFLoader()
      .loadAsync(assetUrl("assets/friends/melody.glb"))
      .then(
        (gltf) => {
          entry.value = gltf;
        },
        (error) => {
          entry.error = error;
        },
      );
    resource = entry;
  }
  if (resource.error) throw resource.error;
  if (!resource.value) throw resource.promise;
  return resource.value;
}
function armPivot(model: THREE.Group, name: string) {
  const arm = model.getObjectByName(name)!;
  const pivot = new THREE.Group();
  pivot.name = "Idle_" + name;
  pivot.position.copy(arm.position);
  arm.parent!.add(pivot);
  pivot.add(arm);
  arm.position.set(0, 0, 0);
  return pivot;
}
export function makeMelody(asset: Asset) {
  const hero = new THREE.Group(),
    model = clone(asset.scene) as THREE.Group;
  const normalize = new THREE.Group();
  normalize.scale.setScalar(2.27 / 3.1542203426361084);
  normalize.add(model);
  hero.add(normalize);
  model.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.material = Array.isArray(o.material)
        ? o.material.map((m) => m.clone())
        : o.material.clone();
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  const mixer = new THREE.AnimationMixer(model);
  const rest = new Map(
    ["CTRL_Arm_L", "CTRL_Arm_R", "CTRL_Foot_L", "CTRL_Foot_R"].map((name) => [
      name,
      model.getObjectByName(name)!.position.clone(),
    ]),
  );
  // Additive pivots own each controller’s rest offset. Keep authored translation
  // keys relative to that offset so arms and feet do not jump away from the body.
  const clips = asset.animations.map((source) => {
    const clip = source.clone();
    for (const track of clip.tracks) {
      const [name, property] = track.name.split(".");
      const origin = rest.get(name);
      if (origin && property === "position")
        for (let i = 0; i < track.values.length; i += 3) {
          track.values[i] -= origin.x;
          track.values[i + 1] -= origin.y;
          track.values[i + 2] -= origin.z;
        }
    }
    return clip;
  });
  const actions = Object.fromEntries(
    clips.map((clip) => [clip.name, mixer.clipAction(clip)]),
  );
  const armIdle = [
    armPivot(model, "CTRL_Arm_L"),
    armPivot(model, "CTRL_Arm_R"),
  ];
  hero.userData.blender = { model, normalize, modelHeight: 2.27, armIdle };
  walkingRig(hero);
  actions.idle.play();
  const animation = {
    mixer,
    actions,
    active: "idle",
    remaining: 0,
    elapsed: 0,
  };
  hero.userData.melody = animation;
  return hero;
}
const gestureClips: Partial<Record<Gesture, string>> = {
  wave: "wave",
  dance: "dance",
  softHappy: "happy",
  celebrate: "celebrate",
  bow: "bow",
  hug: "cuddle",
  sip: "happy",
  present: "celebrate",
  handoff: "bow",
  shy: "shy",
  surprised: "surprised",
  curious: "curious",
  sleepy: "sleepy",
  tilt: "curious",
};
export function reactMelody(
  hero: THREE.Group,
  gesture: Gesture,
  reduced = false,
) {
  const b = hero.userData.melody,
    name = gestureClips[gesture] || "happy";
  if (reduced) return;
  const next = b.actions[name] as THREE.AnimationAction;
  if (!next) return;
  b.actions[b.active]?.fadeOut(0.2);
  next.reset().setLoop(THREE.LoopOnce, 1);
  next.clampWhenFinished = true;
  next.fadeIn(0.2).play();
  b.active = name;
  b.remaining = next.getClip().duration;
}
export function updateMelody(
  hero: THREE.Group,
  dt: number,
  speed: number,
  reduced = false,
) {
  const b = hero.userData.melody;
  dt = Math.max(0, Math.min(0.1, dt));
  b.remaining -= dt;
  b.elapsed += dt;
  // Walking interrupts a gesture and settles gently back into the authored idle.
  if (b.active !== "idle" && (b.remaining <= 0.2 || speed > 0.08 || reduced)) {
    b.actions[b.active].fadeOut(0.18);
    b.actions.idle.reset().fadeIn(0.18).play();
    b.active = "idle";
  }
  b.mixer.update(reduced ? 0 : dt);
  updateWalking(hero, dt, speed, reduced, b.active === "dance");
  // Brief blink, independent of the small embroidered smile and expression morphs.
  const blink =
    !reduced && b.active === "idle" && b.elapsed % 5.3 < 0.16
      ? Math.sin(((b.elapsed % 5.3) / 0.16) * Math.PI)
      : 0;
  for (const name of ["Eye_left", "Eye_right"]) {
    const eye = hero.userData.blender.model.getObjectByName(name) as THREE.Mesh;
    if (eye?.morphTargetDictionary && eye.morphTargetInfluences)
      eye.morphTargetInfluences[eye.morphTargetDictionary.Blink] = blink;
  }
}
export function disposeMelody(hero: THREE.Group) {
  const b = hero.userData.melody;
  b.mixer.stopAllAction();
  b.mixer.uncacheRoot(hero.userData.blender.model);
  hero.traverse((o) => {
    if (o instanceof THREE.Mesh)
      for (const material of Array.isArray(o.material)
        ? o.material
        : [o.material])
        material.dispose();
  });
}
