import { test } from "node:test";
import assert from "node:assert/strict";
import { applyVisitAction } from "./visit-actions.mjs";
import {
  nextPostcardStop,
  newPostcardWalk,
  normalizePostcardWalk,
  postcardStop,
} from "./postcard-walk.mjs";

function fixture() {
  const guest = { id: "guest", area: "village", socket: { readyState: 1 } };
  const host = { id: "host", area: "village", socket: { readyState: 1 } };
  const room = { host, guest };
  const errors = [];
  const updates = [];
  function play(player, action, stop, revision = room.postcardWalk?.revision ?? 0) {
    applyVisitAction({
      room,
      player,
      m: { type: "postcard-walk", action, stop, revision },
      now: () => 123456,
      broadcast: (state) => updates.push(state.postcardWalk),
      dirty: () => {},
      fail: (message) => errors.push(message),
    });
  }
  function arrive(stop) {
    const { x, z } = postcardStop(stop);
    Object.assign(host, { x, z });
    Object.assign(guest, { x, z });
  }
  return { room, host, guest, play, arrive, errors, updates };
}

test("each player chooses a different postcard stop and both must visit them in order", () => {
  const { room, host, guest, play, arrive, errors, updates } = fixture();
  play(host, "choose", "home");
  assert.equal(room.postcardWalk, undefined);
  play(guest, "choose", "garden");
  play(host, "choose", "garden", 0);
  assert.match(errors.at(-1), /different stop/);
  play(host, "choose", "plaza", 0);
  const first = room.postcardWalk;
  assert.equal(nextPostcardStop(first).id, "plaza");

  arrive("garden");
  play(host, "stamp", "garden");
  play(guest, "stamp", "plaza");
  assert.equal(room.postcardWalk, first);
  assert.match(errors.at(-1), /Walk to this stop together/);

  arrive("plaza");
  play(host, "stamp", "plaza");
  play(guest, "stamp", "plaza", first.revision);
  assert.match(errors.at(-1), /changed/);
  assert.equal(room.postcardWalk.stamps, 1);
  assert.equal(nextPostcardStop(room.postcardWalk).id, "garden");

  arrive("garden");
  guest.area = "home";
  play(host, "stamp", "garden");
  assert.equal(room.postcardWalk.stamps, 1);
  guest.area = "village";
  play(guest, "stamp", "garden");
  const complete = room.postcardWalk;
  assert.equal(complete.stamps, 2);
  assert.equal(complete.completedAt, 123456);
  assert.equal(nextPostcardStop(complete), undefined);
  play(guest, "reset");
  assert.equal(room.postcardWalk, complete);
  play(host, "reset");
  assert.deepEqual(room.postcardWalk, newPostcardWalk(complete.revision + 1));
  play(guest, "choose", "garden", complete.revision);
  assert.match(errors.at(-1), /postcard changed/);
  assert.equal(room.postcardWalk.guest, null);
  assert.equal(updates.length, 5);
});

test("older and invalid checkpoints load with an unstarted walk", () => {
  assert.deepEqual(normalizePostcardWalk(undefined), newPostcardWalk());
  assert.deepEqual(
    normalizePostcardWalk({ revision: -2, host: "garden", guest: "garden", stamps: 2, completedAt: 5 }),
    { revision: 0, roleRevisions: { host: 0, guest: 0 }, host: "garden", guest: null, stamps: 0, completedAt: null },
  );
});
