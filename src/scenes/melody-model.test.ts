import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import {
  makeMelody,
  updateMelody,
  reactMelody,
  disposeMelody,
} from "./melody-model";
const bytes = await readFile(
  new URL("../../dist/assets/friends/melody.glb", import.meta.url),
);
const asset = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
describe("My Melody’s actual Blender model", () => {
  it("loads thirteen clips and keeps feet and arms in their authored rest positions", () => {
    expect(asset.animations).toHaveLength(13);
    const hero = makeMelody(asset),
      model = hero.userData.blender.model;
    hero.updateMatrixWorld(true);
    const before = [
      "CTRL_Arm_L",
      "CTRL_Arm_R",
      "CTRL_Foot_L",
      "CTRL_Foot_R",
    ].map((n) =>
      model.getObjectByName(n).getWorldPosition(new THREE.Vector3()),
    );
    updateMelody(hero, 0, 0);
    hero.updateMatrixWorld(true);
    const after = [
      "CTRL_Arm_L",
      "CTRL_Arm_R",
      "CTRL_Foot_L",
      "CTRL_Foot_R",
    ].map((n) =>
      model.getObjectByName(n).getWorldPosition(new THREE.Vector3()),
    );
    after.forEach((p, i) =>
      expect(p.distanceTo(before[i])).toBeLessThan(0.002),
    );
    const box = new THREE.Box3().setFromObject(hero);
    expect(box.min.y).toBeGreaterThan(-0.02);
    expect(box.min.y).toBeLessThan(0.02);
    disposeMelody(hero);
  });
  it("walks with planted feet, blends into a real dance, and settles when movement interrupts", () => {
    const hero = makeMelody(asset);
    for (let i = 0; i < 80; i++) {
      hero.position.z += 2.35 / 60;
      updateMelody(hero, 1 / 60, 2.35);
    }
    expect(hero.userData.blender.walkRig.amount).toBeGreaterThan(0.99);
    reactMelody(hero, "dance");
    const xs = [],
      ys = [];
    for (let i = 0; i < 240; i++) {
      updateMelody(hero, 1 / 60, 0);
      const root = hero.userData.blender.model.getObjectByName("CTRL_Root");
      xs.push(root.position.x);
      ys.push(root.position.y);
    }
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.25);
    expect(Math.max(...ys)).toBeGreaterThan(0.04);
    updateMelody(hero, 1 / 60, 2);
    expect(hero.userData.melody.active).toBe("idle");
    for (let i = 0; i < 120; i++) updateMelody(hero, 1 / 60, 0);
    expect(hero.userData.blender.walkRig.amount).toBe(0);
    disposeMelody(hero);
  });
  it("uses independent expression morphs and respects reduced motion", () => {
    const a = makeMelody(asset),
      b = makeMelody(asset);
    reactMelody(a, "shy");
    for (let i = 0; i < 75; i++) updateMelody(a, 1 / 60, 0);
    const faceA = a.userData.blender.model.getObjectByName("Embroidered_smile"),
      faceB = b.userData.blender.model.getObjectByName("Embroidered_smile");
    expect(
      faceA.morphTargetInfluences[faceA.morphTargetDictionary.Shy],
    ).toBeGreaterThan(0.5);
    expect(faceB.morphTargetInfluences[faceB.morphTargetDictionary.Shy]).toBe(
      0,
    );
    reactMelody(b, "dance", true);
    updateMelody(b, 1 / 60, 2, true);
    expect(b.userData.melody.active).toBe("idle");
    expect(b.userData.blender.walkRig.amount).toBe(0);
    disposeMelody(a);
    disposeMelody(b);
  });
});
