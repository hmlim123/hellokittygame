import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { makeBlenderKitty } from "../../dist/blender-kitty.js";
import { applyHeroEquipment } from "./AdventureTools";
const bytes = await readFile(
  new URL("../../dist/assets/hello-kitty.glb", import.meta.url),
);
const gltf = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
const asset = { scene: gltf.scene, clips: {} };
describe("adventure tools on the actual Blender rig", () => {
  it("equips exactly one tool, follows the bouquet controller, and restores the original flowers without changing the character geometry", () => {
    const hero = makeBlenderKitty(asset),
      b = hero.userData.blender,
      head = b.model.getObjectByName("Head"),
      geometry = head.geometry;
    for (const item of ["lantern", "watering", "ribbon"] as const) {
      applyHeroEquipment(hero, { version: 1, outfit: "classic", item });
      expect(b.chapterTools.get(item).parent.name).toBe("CTRL_Bouquet");
      expect(
        [...b.chapterTools.values()].filter((g: any) => g.visible),
      ).toHaveLength(1);
      expect(b.gifts.original.every((g: any) => !g.visible)).toBe(true);
      expect(head.geometry).toBe(geometry);
    }
    applyHeroEquipment(hero, { version: 1, outfit: "sailor", item: "flowers" });
    expect([...b.chapterTools.values()].every((g: any) => !g.visible)).toBe(
      true,
    );
    expect(b.gifts.original.every((g: any) => g.visible)).toBe(true);
    expect(hero.userData.equipment.item).toBe("flowers");
  });
  it("keeps two Kitty instances independent when changing a tool or choosing empty paws", () => {
    const a = makeBlenderKitty(asset),
      b = makeBlenderKitty(asset);
    applyHeroEquipment(a, { version: 1, outfit: "classic", item: "lantern" });
    applyHeroEquipment(b, { version: 1, outfit: "classic", item: "watering" });
    applyHeroEquipment(a, { version: 1, outfit: "classic", item: "none" });
    expect(b.userData.blender.chapterTools.get("watering").visible).toBe(true);
    expect(a.userData.blender.chapterTools.get("lantern").visible).toBe(false);
  });
});
