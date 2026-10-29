import { MAPS, walkable } from "./world-map";
import { chapterObjective } from "./chapter";
import type { Adventure, Direction, MapObject, QuestId } from "./types";
export interface Route {
  points: { x: number; z: number }[];
  first: Direction | null;
  steps: number;
}
export interface NavigationGoal {
  object: MapObject;
  label: string;
  route: Route | null;
  prerequisite?: boolean;
}
const STEPS: [Direction, number, number][] = [
  ["up", 0, -1],
  ["down", 0, 1],
  ["left", -1, 0],
  ["right", 1, 0],
];
const PORTALS = ["D", "E", "A", "V"];
export function routeTo(s: Adventure, target: MapObject): Route | null {
  const queue = [{ x: s.x, z: s.z, parent: -1, dir: null as Direction | null }],
    seen = new Set([`${s.x},${s.z}`]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (Math.abs(p.x - target.x) + Math.abs(p.z - target.z) <= 1) {
      const points: { x: number; z: number }[] = [];
      let j = i;
      while (j >= 0) {
        points.push({ x: queue[j].x, z: queue[j].z });
        j = queue[j].parent;
      }
      points.reverse();
      return {
        points,
        first:
          points.length > 1
            ? STEPS.find(
                ([, dx, dz]) =>
                  points[1].x - points[0].x === dx &&
                  points[1].z - points[0].z === dz,
              )![0]
            : null,
        steps: points.length - 1,
      };
    }
    for (const [dir, dx, dz] of STEPS) {
      const x = p.x + dx,
        z = p.z + dz,
        key = `${x},${z}`;
      if (
        !seen.has(key) &&
        walkable(s, x, z) &&
        !PORTALS.includes(MAPS[s.map].rows[z][x])
      ) {
        seen.add(key);
        queue.push({ x, z, parent: i, dir });
      }
    }
  }
  return null;
}
const NAMES: Record<string, string> = {
  D: "Dungeon entrance",
  E: "Village path",
  A: "Butterfly Glade entrance",
  V: "Garden path",
  M: "Momo",
  R: "Lost ribbon",
  B: "Picnic berries",
  T: "Garden lantern",
  S: "Moonflower shrine",
  C: "Moon charm chest",
  Q: "Cloud guardian",
  G: "Moon gate",
  L: "Butterflies",
  W: "Thirsty flowers",
  J: "Friendship bridge",
  Z: "Wishing stars",
  N: "Pip the bunny",
  K: "Nancy’s envelope",
  P: "Moonlit picnic",
};
function goal(
  s: Adventure,
  type: string,
  filter: (o: MapObject) => boolean = () => true,
): NavigationGoal | null {
  const list = MAPS[s.map].objects
    .filter((o) => o.type === type && filter(o))
    .map((object) => ({
      object,
      label:
        object.type === "C"
          ? `${object.id} charm chest`
          : NAMES[object.type] || "A little discovery",
      route: routeTo(s, object),
    }));
  return (
    list.sort((a, b) => (a.route?.steps ?? 999) - (b.route?.steps ?? 999))[0] ||
    null
  );
}
function gardenEntrance(s: Adventure) {
  return goal(s, s.map === "village" ? "D" : "V");
}
function villageEntrance(s: Adventure) {
  return goal(s, s.map === "garden" ? "E" : "V");
}
function moonflowerGoal(s: Adventure): NavigationGoal | null {
  if (s.complete) return null;
  if (s.map !== "garden")
    return s.map === "village" && !s.accepted
      ? goal(s, "M")
      : gardenEntrance(s);
  if (s.charms.length < 3)
    return goal(s, "C", (o) => !s.charms.includes(o.id || ""));
  return goal(s, !s.guardian ? "Q" : !s.gate ? "G" : "S");
}
export function navigationGoal(s: Adventure): NavigationGoal | null {
  const q = s.trackedQuest,
    c = s.chapter;
  if (q === "moonflower") return moonflowerGoal(s);
  if (q === "ribbons") {
    if (s.ribbonReturned) return null;
    if (s.map !== "village") return villageEntrance(s);
    return s.ribbons.length < 3
      ? goal(s, "R", (o) => !s.ribbons.includes(o.id || ""))
      : goal(s, "M");
  }
  if (q === "picnic") {
    if (s.picnicDelivered) return null;
    if (s.berries.length === 2)
      return s.map === "village" ? goal(s, "M") : villageEntrance(s);
    return s.map === "garden"
      ? goal(s, "B", (o) => !s.berries.includes(o.id || ""))
      : gardenEntrance(s);
  }
  if (q === "lanterns") {
    if (s.lanternsBlessed) return null;
    if (!s.complete) {
      const next = moonflowerGoal(s);
      return next ? { ...next, prerequisite: true } : null;
    }
    if (s.map !== "garden") return gardenEntrance(s);
    return s.litLanterns.length < 2
      ? goal(s, "T", (o) => !s.litLanterns.includes(o.id || ""))
      : goal(s, "S");
  }
  if (c.endingSeen) return null;
  if (c.letterFound && !s.complete) {
    const next = moonflowerGoal(s);
    return next ? { ...next, prerequisite: true } : null;
  }
  if (s.map !== "glade")
    return s.map === "garden" ? goal(s, "A") : goal(s, "D");
  if (c.butterflyStep < 3)
    return goal(s, "L", (o) => Number(o.id) === c.butterflyStep);
  return goal(
    s,
    !c.flowersRevived
      ? "W"
      : !c.bridgeFixed
        ? "J"
        : c.stars.length < 3
          ? "Z"
          : !c.friendAwake
            ? "N"
            : !c.letterFound
              ? "K"
              : "P",
  );
}
export function navigationDirection(s: Adventure): string {
  const next = navigationGoal(s);
  if (!next)
    return "A story to keep · choose another quest or revisit your memories.";
  const prefix = next.prerequisite ? "Moonflower first · " : "";
  if (!next.route) return `${prefix}${next.label} · follow the cream path`;
  if (!next.route.steps)
    return `${prefix}${next.label} · ${PORTALS.includes(next.object.type) ? "walk through or tap to enter" : "right beside you"}`;
  const arrow = { up: "↑", down: "↓", left: "←", right: "→" }[
    next.route.first!
  ];
  return `${arrow} ${prefix}${next.label} · ${next.route.steps} ${next.route.steps === 1 ? "step" : "steps"} away`;
}
export const QUEST_NAMES: Record<QuestId, string> = {
  moonflower: "Restore the moonflower",
  ribbons: "Momo’s lost ribbons",
  picnic: "A picnic for Momo",
  lanterns: "Lanterns for the garden",
  glade: "The Butterfly Glade promise",
};
export function journeyObjective(s: Adventure): string {
  const q = s.trackedQuest;
  if (q === "glade")
    return s.chapter.endingSeen
      ? "Your Butterfly Glade story is complete. Revisit it in your storybook. ♡"
      : s.map !== "glade" && !(s.chapter.letterFound && !s.complete)
        ? "Continue your Butterfly Glade story through the lilac arch in the garden’s southeast."
        : chapterObjective(s);
  if (q === "ribbons")
    return s.ribbonReturned
      ? "Momo’s ribbons are home. Your Berry sweetheart outfit is unlocked."
      : s.ribbons.length === 3
        ? "Bring the three lost ribbons back to Momo in Rosemilk Village."
        : `Find Momo’s ribbons in Rosemilk Village: ${s.ribbons.length} / 3.`;
  if (q === "picnic")
    return s.picnicDelivered
      ? "Your picnic with Momo is a memory to keep."
      : s.berries.length === 2
        ? "Bring the berries to Momo in the village. Share a strawberry picnic when nearby."
        : `Pick both southern garden berry bushes: ${s.berries.length} / 2.`;
  if (q === "lanterns")
    return s.lanternsBlessed
      ? "The garden lanterns shine together. Your moon lantern is waiting at home."
      : !s.complete
        ? "Restore the moonflower first, then light both northern garden lanterns."
        : s.litLanterns.length === 2
          ? "Return to the moonflower shrine with both lanterns glowing."
          : `Light the northern garden lanterns: ${s.litLanterns.length} / 2.`;
  if (s.complete)
    return s.chapter.endingSeen &&
      s.ribbonReturned &&
      s.picnicDelivered &&
      s.lanternsBlessed
      ? "All five quests complete. Nancy’s little world is glowing. ♡"
      : "Moonflower restored! More little quests await in Inventory → Quest.";
  if (!s.accepted)
    return "Meet Momo by the fountain, or enter the upper-right pink arch to begin.";
  if (s.map === "glade")
    return "Return to Moonflower Garden to continue the moonflower story.";
  if (s.map === "village")
    return "Enter Moonflower Garden through the upper-right pink arch.";
  if (s.charms.length < 3)
    return `Open the three treasure chests: ${s.charms.length} / 3 moon charms.`;
  return !s.guardian
    ? "Help the cloud guardian beside the moon gate."
    : !s.gate
      ? "Open the moon gate in the northern wall."
      : "Reach the moonflower shrine beyond the gate.";
}
