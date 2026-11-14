import { test } from "node:test";
import assert from "node:assert/strict";
import { applyVisitAction } from "./visit-actions.mjs";
function fixture() {
  const host = { id: "host", socket: { readyState: 1 } },
    guest = { id: "guest", socket: { readyState: 1 } };
  const room = { host, guest, picnic: [false, false, false] };
  let time = 10000,
    errors = [];
  const action = (player, kind, revision = room.together?.id || 0) =>
    applyVisitAction({
      room,
      player,
      m: { type: "together", action: kind, revision },
      now: () => time,
      fail: (e) => errors.push(e),
      broadcast: () => {},
      dirty: () => {},
    });
  return { room, host, guest, action, errors, advance: () => (time += 5000) };
}
test("baking enforces player roles, ordered steps and once-only contributions", () => {
  const f = fixture();
  f.action(f.guest, "stir");
  assert.equal(f.room.together, undefined);
  f.action(f.host, "stir");
  assert.equal(f.room.together.baking, "decorate");
  f.action(f.guest, "decorate");
  assert.equal(f.room.together.action, "stir");
  f.advance();
  f.action(f.guest, "decorate");
  assert.equal(f.room.together.baking, "ready");
  f.advance();
  f.action(f.guest, "present");
  assert.equal(f.room.picnic[1], false);
  f.action(f.host, "present");
  assert.equal(f.room.picnic[1], true);
  assert.equal(f.room.together.baking, "mix");
});
test("stale concurrent actions and disconnected players cannot overwrite a shared moment", () => {
  const f = fixture();
  f.action(f.host, "highfive");
  const first = structuredClone(f.room.together);
  f.action(f.guest, "wave", 0);
  assert.deepEqual(f.room.together, first);
  f.guest.socket = null;
  f.advance();
  f.action(f.host, "photo");
  assert.deepEqual(f.room.together, first);
});
test("weather preserves baking and reaction time; cancelling retains cooperative progress", () => {
  const f = fixture();
  f.action(f.host, "stir");
  const at = f.room.together.at;
  f.action(f.guest, "rain");
  assert.equal(f.room.together.at, at);
  assert.equal(f.room.together.weather, "rain");
  assert.equal(f.room.together.baking, "decorate");
  f.action(f.host, "cancel");
  assert.equal(f.room.together.action, "cancel");
  assert.equal(f.room.together.baking, "decorate");
});

test("cancelling frees the shared moment for an immediate new reaction", () => {
  const f = fixture();
  f.action(f.host, "highfive");
  f.action(f.guest, "cancel");
  f.action(f.host, "wave");
  assert.equal(f.room.together.action, "wave");
  assert.deepEqual(f.errors, []);
});

test("a new gesture supersedes stale walking speed without moving the player", () => {
  const player = { id: "guest", x: 1, z: -3, speed: 2.8, gesture: { id: 0, kind: "wave" } };
  applyVisitAction({ room: {}, player, m: { type: "gesture", kind: "dance" }, broadcast: () => {} });
  assert.equal(player.speed, 0);
  assert.deepEqual(player.gesture, { id: 1, kind: "dance" });
  assert.deepEqual([player.x, player.z], [1, -3]);
});
