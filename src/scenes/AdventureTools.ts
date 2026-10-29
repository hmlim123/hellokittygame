import * as THREE from "three";
import { applyEquipment } from "../../dist/equipment-model.js";
import type { Equipment } from "../game/types";
import { TOOLS } from "../game/chapter";
const material = (color: string, glow = false) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.75,
    ...(glow ? { emissive: color, emissiveIntensity: 0.35 } : {}),
  });
function sphere(
  g: THREE.Group,
  m: THREE.Material,
  p: number[],
  scale: number[],
) {
  const o = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), m);
  o.position.set(p[0], p[1], p[2]);
  o.scale.set(scale[0], scale[1], scale[2]);
  g.add(o);
  return o;
}
function cylinder(
  g: THREE.Group,
  m: THREE.Material,
  r: number,
  h: number,
  p: number[],
) {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), m);
  o.position.set(p[0], p[1], p[2]);
  g.add(o);
  return o;
}
export function makeAdventureTool(id: string) {
  const g = new THREE.Group();
  g.name = "Adventure_tool_" + id;
  g.userData.interaction = "offer";
  const rose = material("#d785a9"),
    cream = material("#fff0d1"),
    mint = material("#a5c2b2"),
    gold = material("#e8c77e");
  if (id === "lantern") {
    cylinder(g, gold, 0.22, 0.07, [0, -0.12, 0]);
    cylinder(g, gold, 0.22, 0.07, [0, 0.38, 0]);
    cylinder(g, material("#ffe6ad", true), 0.15, 0.42, [0, 0.12, 0]);
    for (const x of [-0.18, 0.18])
      for (const z of [-0.12, 0.12])
        cylinder(g, rose, 0.022, 0.5, [x, 0.12, z]);
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.025, 8, 24, Math.PI),
      rose,
    );
    handle.position.y = 0.43;
    g.add(handle);
  }
  if (id === "watering") {
    cylinder(g, mint, 0.24, 0.36, [0, 0.06, 0]);
    cylinder(g, cream, 0.2, 0.025, [0, 0.25, 0]);
    const spout = cylinder(g, mint, 0.065, 0.45, [0.31, 0.12, 0]);
    spout.rotation.z = -0.85;
    const head = cylinder(g, cream, 0.11, 0.06, [0.48, 0.28, 0]);
    head.rotation.z = -0.85;
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.035, 8, 24),
      mint,
    );
    handle.position.set(-0.19, 0.12, 0);
    g.add(handle);
    sphere(g, rose, [0, 0.08, 0.23], [0.075, 0.075, 0.02]);
  }
  if (id === "ribbon") {
    for (const sign of [-1, 1]) {
      const loop = sphere(g, rose, [sign * 0.22, 0.18, 0], [0.25, 0.19, 0.1]);
      loop.rotation.z = sign * 0.25;
      const tail = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.35, 0.04),
        cream,
      );
      tail.position.set(sign * 0.13, -0.09, 0);
      tail.rotation.z = sign * 0.3;
      g.add(tail);
    }
    sphere(g, gold, [0, 0.18, 0.07], [0.11, 0.12, 0.09]);
  }
  return g;
}
export function applyHeroEquipment(hero: THREE.Group, equipment: Equipment) {
  const tool = TOOLS.some((t) => t.id === equipment.item);
  applyEquipment(hero, { ...equipment, item: tool ? "none" : equipment.item });
  const b = hero.userData.blender;
  const cache: Map<string, THREE.Group> = (b.chapterTools ??= new Map());
  cache.forEach((g) => (g.visible = false));
  if (tool) {
    let prop = cache.get(equipment.item);
    if (!prop) {
      prop = makeAdventureTool(equipment.item);
      b.model.getObjectByName("CTRL_Bouquet").add(prop);
      cache.set(equipment.item, prop);
    }
    prop.visible = true;
  }
  hero.userData.equipment = { ...equipment };
}
