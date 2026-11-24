import { test } from "node:test";
import assert from "node:assert/strict";
import { applyVisitAction, restoreTogetherMoment } from "./visit-actions.mjs";
import { LANTERN_PLAZA, newLanternEvening, normalizeLanternEvening } from "./lantern-evening.mjs";

test("both partners choose and light their own plaza lanterns before sunset", () => {
  const host = { ...LANTERN_PLAZA, id: "host", area: "village", socket: { readyState: 1 } };
  const guest = { ...host, id: "guest" };
  const room = {
    host,
    guest,
    together: { id: 3, action: "stir", at: 500, weather: "rain", baking: "decorate", pose: "still" },
  };
  const errors = [];
  function act(player, action, color, revision = room.lanternEvening?.revision ?? 0) {
    applyVisitAction({
      room,
      player,
      m: { type: "lantern-evening", action, color, revision },
      fail: (message) => errors.push(message),
      broadcast: () => {},
      dirty: () => {},
    });
  }
  act(host, "choose", "white");
  assert.equal(room.lanternEvening, undefined);
  act(host, "choose", "rose");
  act(host, "light");
  assert.equal(room.lanternEvening.host.lit, false);
  act(guest, "choose", "lavender");
  guest.x += 20;
  act(guest, "light");
  assert.match(errors.at(-1), /Meet your partner at the plaza/);
  assert.equal(room.lanternEvening.guest.lit, false);
  guest.x = LANTERN_PLAZA.x;
  act(guest, "light");
  act(guest, "choose", "mint");
  assert.deepEqual(room.lanternEvening.guest, { color: "lavender", lit: true });
  assert.equal(room.together.weather, "rain");
  act(host, "light", undefined, 1);
  assert.match(errors.at(-1), /lanterns changed/);
  act(host, "light");
  assert.deepEqual(room.lanternEvening.host, { color: "rose", lit: true });
  assert.deepEqual(restoreTogetherMoment(room.together), {
    id: 4, action: "stir", at: 500, weather: "sunset", baking: "decorate", pose: "still",
  });
  const finished = room.lanternEvening;
  act(guest, "reset");
  assert.equal(room.lanternEvening, finished);
  act(host, "reset");
  assert.deepEqual(room.lanternEvening, newLanternEvening(finished.revision + 1));
});

test("old and invalid lantern data restore without inventing an active light", () => {
  assert.deepEqual(normalizeLanternEvening(undefined), newLanternEvening());
  assert.deepEqual(
    normalizeLanternEvening({ revision: 2, host: { color: "unknown", lit: true }, guest: { color: "mint", lit: true } }),
    { revision: 2, host: { color: null, lit: false }, guest: { color: "mint", lit: true } },
  );
});
