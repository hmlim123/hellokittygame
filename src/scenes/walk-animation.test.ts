import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  makeBlenderKitty,
  reactBlender,
  updateBlender,
} from "../../dist/blender-kitty.js";
import * as THREE from "three";
import { updateWalking, walkingRig, turnToward } from "./walk-animation";
import { bloomAmount, bridgeAmount, wakeAmount } from "./effect-motion";
import type { DiscoveryEffect } from "../game/types";
const bytes = await readFile(
  new URL("../../dist/assets/hello-kitty.glb", import.meta.url),
);
const gltf = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
const full = new THREE.AnimationClip(
  "Performance",
  -1,
  gltf.animations.flatMap((a) => a.tracks),
);
const asset = {
  scene: gltf.scene,
  clips: { wave: THREE.AnimationUtils.subclip(full, "wave", 48, 96, 24) },
};
describe("walking on the Blender rig", () => {
  it("alternates actual feet, produces quiet step cues, and settles completely at rest", () => {
    const hero = makeBlenderKitty(asset),
      original = hero.userData.blender.model
        .getObjectByName("CTRL_Foot_L")
        .getWorldPosition(new THREE.Vector3());
    let steps = 0;
    for (let i = 0; i < 20; i++) {
      updateBlender(hero, 1 / 60);
      if (updateWalking(hero, 1 / 60, 2.8)) steps++;
    }
    const rig = walkingRig(hero);
    expect(
      rig.feet[0].pivot.rotation.x * rig.feet[1].pivot.rotation.x,
    ).toBeLessThan(0);
    hero.updateMatrixWorld(true);
    expect(
      hero.userData.blender.model
        .getObjectByName("CTRL_Foot_L")
        .getWorldPosition(new THREE.Vector3())
        .distanceTo(original),
    ).toBeGreaterThan(0.02);
    expect(steps).toBeGreaterThan(0);
    for (let i = 0; i < 120; i++) updateWalking(hero, 1 / 60, 0);
    expect(rig.amount).toBe(0);
    expect(rig.feet[0].pivot.position.equals(rig.feet[0].base)).toBe(true);
  });
  it("keeps reduced motion still and the original Blender wave usable after walking", () => {
    const hero = makeBlenderKitty(asset);
    updateWalking(hero, 0.1, 3, true);
    const rig = walkingRig(hero);
    expect(rig.feet.every((f) => f.pivot.rotation.x === 0)).toBe(true);
    const arm = hero.userData.blender.model.getObjectByName("CTRL_Arm_L"),
      rest = arm.quaternion.clone();
    reactBlender(hero, "wave");
    updateBlender(hero, 1.3);
    expect(arm.quaternion.angleTo(rest)).toBeGreaterThan(0.3);
  });
  it("turns along the shortest arc and converges smoothly across the angle boundary", () => {
    const a = turnToward(Math.PI - 0.05, -Math.PI + 0.05, 1 / 60);
    expect(a).toBeGreaterThan(Math.PI - 0.05);
    expect(a).toBeLessThan(Math.PI + 0.05);
    expect(turnToward(0, Math.PI / 2, 1 / 60)).toBeLessThan(Math.PI / 2);
    expect(turnToward(0, Math.PI / 2, 1 / 60, true)).toBe(Math.PI / 2);
  });
});
describe("discovery easing", () => {
  const effect = (kind: DiscoveryEffect["kind"]): DiscoveryEffect => ({
    id: 1,
    kind,
    map: "glade",
    at: [5, 5],
    startedAt: 1000,
    duration: 2.6,
  });
  it("pours before blooming, ties the bridge gradually, and wakes Pip without changing save flags", () => {
    expect(bloomAmount(true, effect("water"), false, 1100)).toBe(0);
    expect(bloomAmount(true, effect("water"), false, 2000)).toBeGreaterThan(0);
    expect(bloomAmount(true, effect("water"), false, 3600)).toBe(1);
    expect(bridgeAmount(true, effect("tie"), false, 1700)).toBeCloseTo(0.5);
    expect(wakeAmount(true, effect("wake"), false, 1600)).toBeCloseTo(0.5);
  });
  it("shows finished discoveries without replay on reload or when motion is reduced", () => {
    expect(bloomAmount(true, null, false)).toBe(1);
    expect(bridgeAmount(true, effect("tie"), true, 1000)).toBe(1);
    expect(wakeAmount(false, null, false)).toBe(0);
  });
});
