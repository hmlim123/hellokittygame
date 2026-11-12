import { VILLAGE_SPAWN, villageWalkable } from "./village-world.mjs";
export const text = (s, max) =>
  typeof s === "string"
    ? s
        .replace(/[\x00-\x1f\x7f]/g, "")
        .trim()
        .slice(0, max)
    : "";
export const appearance = (value) => ({
  outfit: [
    "classic",
    "sailor",
    "picnic",
    "moonlight",
    "berry",
    "blossom",
  ].includes(value?.outfit)
    ? value.outfit
    : "classic",
  plush: ["cloud", "witch", "baby", "kitten", "bunny"].includes(value?.plush)
    ? value.plush
    : null,
  item: [
    "none",
    "flowers",
    "teddy",
    "strawberry",
    "letter",
    "lantern",
    "watering",
    "ribbon",
  ].includes(value?.item)
    ? value.item
    : "none",
});
export const point = (p) =>
  p && villageWalkable(p.x, p.z) ? { x: p.x, z: p.z } : VILLAGE_SPAWN;
export const yaw = (v) =>
  Number.isFinite(v) ? Math.atan2(Math.sin(v), Math.cos(v)) : 0;
export const actor = (role, name, look, position) => ({
  id: role,
  name: text(name, 24) || (role === "host" ? "Nancy" : "Your friend"),
  appearance: appearance(look),
  ...point(position),
  yaw: yaw(position?.yaw),
  area: "village",
  speed: 0,
  gesture: { id: 0, kind: "wave" },
  socket: null,
  lastMove: Date.now(),
  budget: 1.5,
  disconnectedAt: 0,
});
