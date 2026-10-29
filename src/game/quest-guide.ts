import { navigationGoal, navigationDirection } from "./navigation";
import { journeyObjective } from "./navigation";
import { ITEMS } from "./domain";
import type { Adventure, Equipment, ItemId } from "./types";

const OBJECTIVES: Record<string, { title: string; instruction: string; tool?: ItemId }> = {
  L: { title: "Follow the glowing butterflies", instruction: "Walk beside the next butterflies, then use your butterfly lantern.", tool: "lantern" },
  W: { title: "Help the thirsty flowers", instruction: "Walk to the flower patch, then choose Use watering can.", tool: "watering" },
  J: { title: "Mend the friendship bridge", instruction: "Walk beside the broken bridge and choose Tie friendship ribbon.", tool: "ribbon" },
  Z: { title: "Make the wishing stars glow", instruction: "Visit the star stones. Their order is moon, flower, then heart." },
  N: { title: "Give Pip a gentle hello", instruction: "Walk beside the sleepy bunny and choose Offer cuddle teddy.", tool: "teddy" },
  K: { title: "Find your sealed envelope", instruction: "Walk beside the heart-sealed envelope to bring it home." },
  P: { title: "Enjoy a moonlit picnic", instruction: "Visit the picnic blanket at the north end of the glade." },
  D: { title: "Visit Moonflower Garden", instruction: "Walk through the pink arch in the village’s upper-right corner." },
  E: { title: "Return to Rosemilk Village", instruction: "Walk through the southern garden arch." },
  A: { title: "Find Butterfly Glade", instruction: "Walk through the lilac arch in the garden’s southeast corner." },
  V: { title: "Return to Moonflower Garden", instruction: "Follow the little path at the glade’s southwest corner." },
  C: { title: "Discover a moon charm", instruction: "Walk beside the next treasure chest. Kitty will open it for you." },
  Q: { title: "Help the cloud guardian", instruction: "Visit the guardian beside the moon gate and choose a gentle hello." },
  G: { title: "Open the moon gate", instruction: "Walk up to the northern gate with your three moon charms." },
  S: { title: "Visit the moonflower shrine", instruction: "Walk beside the shrine at the north end of the garden." },
  R: { title: "Find Momo’s lost ribbon", instruction: "Walk beside a pink ribbon in the village to pick it up." },
  B: { title: "Pick picnic berries", instruction: "Walk beside a berry bush in the southern garden." },
  T: { title: "Light a garden lantern", instruction: "Visit the next lantern in the northern garden." },
  M: { title: "Visit Momo", instruction: "Walk beside Momo by the village fountain." },
};
export function questGuide(s: Adventure, equipment: Equipment) {
  const goal = navigationGoal(s), entry = goal && OBJECTIVES[goal.object.type];
  const tool = entry?.tool && ITEMS.find((i) => i.id === entry.tool);
  return {
    key: `${s.trackedQuest}:${s.map}:${goal?.object.type || "done"}:${goal?.object.id || ""}:${goal?.prerequisite || false}`,
    title: entry?.title || "A story to keep",
    instruction: goal?.object.type === "L" && equipment.item === "lantern"
      ? "Keep your lantern close and walk beside the next glowing butterflies."
      : entry?.instruction || journeyObjective(s),
    hint: navigationDirection(s),
    tool: tool ? `${tool.name} · ${equipment.item === tool.id ? "in Kitty’s paws" : "the nearby action picks it up for you"}.` : null,
  };
}
