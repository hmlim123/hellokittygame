import { describe, expect, it } from "vitest";
import { normalizeAdventure } from "./domain";
import { questGuide } from "./quest-guide";
const equipment = { version: 1, outfit: "classic" as const, item: "flowers" as const };
describe("one clear next goal", () => {
  it("guides a fresh glade visit to the first tool without requiring inventory", () => {
    const a = normalizeAdventure({ map: "glade", trackedQuest: "glade", x: 2, z: 10 });
    expect(questGuide(a, equipment)).toMatchObject({ title: "Follow the glowing butterflies" });
    expect(questGuide(a, equipment).tool).toContain("nearby action picks it up");
  });
  it("changes from the butterfly trail to watering, then the bridge", () => {
    const a = normalizeAdventure({ map: "glade", trackedQuest: "glade", chapter: { butterflyStep: 3 } });
    expect(questGuide(a, equipment).title).toBe("Help the thirsty flowers");
    expect(questGuide(a, { ...equipment, item: "watering" }).tool).toContain("in Kitty’s paws");
    a.chapter.flowersRevived = true;
    expect(questGuide(a, equipment).title).toBe("Mend the friendship bridge");
  });
  it("keeps a tracked cross-area goal and a completed story understandable", () => {
    const a = normalizeAdventure({ map: "village", trackedQuest: "glade" });
    expect(questGuide(a, equipment).title).toBe("Visit Moonflower Garden");
    a.trackedQuest = "ribbons"; a.ribbonReturned = true;
    expect(questGuide(a, equipment).title).toBe("A story to keep");
  });
});
