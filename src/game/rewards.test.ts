import { describe, it, expect } from "vitest";
import { createGameStore } from "./store";
import { OUTFITS } from "./domain";
function fixture(bloomed = false) {
  const values = new Map([["kitty-nancy-adventure-v1", JSON.stringify({map:"glade",x:5,z:6,trackedQuest:"glade",chapter:{butterflyStep:3,flowersRevived:bloomed}})]]);
  const s = createGameStore({ getItem:k=>values.get(k)||null, setItem:(k,v)=>{values.set(k,v);} });
  s.getState().setMode("adventure");s.getState().setSceneReady(true);return s;
}
describe("a discovery to bring home", () => {
  it("unlocks a wearable keepsake once, without forcing a costume change", () => {
    const s=fixture();s.getState().useNearbyItem();
    expect(s.getState().notice?.rewardOutfit).toBe("blossom");
    expect(s.getState().equipment.outfit).toBe("classic");
    expect(OUTFITS.find(o=>o.id==="blossom")!.unlock(s.getState().adventure)).toBe(true);
    s.getState().equip("outfit","blossom");s.getState().setMode("room");
    expect(s.getState().equipment.outfit).toBe("blossom");
    s.getState().setMode("adventure");s.getState().setSceneReady(true);s.getState().interact();
    expect(s.getState().notice?.rewardOutfit).toBeUndefined();
  });
  it("gives returning players the unlock through their existing flower progress", () => {
    const s=fixture(true);s.getState().equip("outfit","blossom");
    expect(s.getState().equipment.outfit).toBe("blossom");
    expect(s.getState().notice?.rewardOutfit).toBeUndefined();
  });
});
