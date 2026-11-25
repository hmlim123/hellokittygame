import { test } from "node:test";
import assert from "node:assert/strict";
import { atClueStop, CLUE_STOPS, clueTrailView, newClueTrail, restoreClueTrail } from "./clue-trail.mjs";
import { newPetalMatch, petalMatchView, restorePetalMatch } from "./petal-match.mjs";
import { applyVisitAction } from "./visit-actions.mjs";
import { villagePath, VILLAGE_SPAWN } from "./village-world.mjs";

function visit() {
  const host = { id: "host", area: "village", x: 0, z: 0, socket: { readyState: 1 } };
  const guest = { ...host, id: "guest" };
  const room = { host, guest };
  const errors = [];
  function send(player, type, action, data = {}) {
    applyVisitAction({ room, player, m: { type, action, ...data }, broadcast() {}, dirty() {}, fail: (message) => errors.push(message) });
  }
  return { room, host, guest, errors, send };
}

test("each clue leaves two possible landmarks and the pair identifies a single walkable stop", () => {
  const views = CLUE_STOPS.map(({ id, x, z }) => {
    const trail = newClueTrail(id, 1, 1);
    assert.ok(villagePath(VILLAGE_SPAWN, { x: x - 0.55, z }).length);
    assert.ok(villagePath(VILLAGE_SPAWN, { x: x + 0.55, z }).length);
    return [clueTrailView(trail, "host").clue, clueTrailView(trail, "guest").clue];
  });
  assert.equal(new Set(views.map((pair) => pair.join(" "))).size, CLUE_STOPS.length);
  for (const pair of views) {
    assert.equal(views.filter(([host]) => host === pair[0]).length, 2);
    assert.equal(views.filter(([, guest]) => guest === pair[1]).length, 2);
  }
});

test("a clue trail shares clues on request, accepts new guesses, and needs two nearby searches", () => {
  const { room, host, guest, errors, send } = visit();
  const act = (player, action, data = { round: 1 }) => send(player, "clue-trail", action, data);
  act(host, "start", { round: 0 });
  act(guest, "start", { round: 0 });
  assert.equal(room.clueTrail.round, 1);
  const stop = CLUE_STOPS.find((place) => place.id === room.clueTrail.target);
  const wrong = CLUE_STOPS.find((place) => place.id !== stop.id).id;
  assert.equal(clueTrailView(room.clueTrail, "guest").partnerClue, null);
  assert.equal(clueTrailView(room.clueTrail, "guest").destination, null);
  act(host, "share");
  assert.ok(clueTrailView(room.clueTrail, "guest").partnerClue);
  assert.equal(clueTrailView(room.clueTrail, "host").partnerClue, null);
  act(host, "guess", { round: 1, stop: wrong });
  assert.equal(room.clueTrail.host.guess, null);
  act(guest, "share");
  act(host, "guess", { round: 1, stop: wrong });
  act(guest, "guess", { round: 1, stop: wrong });
  assert.equal(clueTrailView(room.clueTrail, "host").wrongGuess, true);
  assert.equal(clueTrailView(room.clueTrail, "guest").destination, null);
  act(guest, "guess", { round: 1, stop: stop.id });
  act(host, "guess", { round: 1, stop: stop.id });
  assert.equal(clueTrailView(room.clueTrail, "guest").destination, stop.id);
  Object.assign(host, { x: stop.x, z: stop.z });
  Object.assign(guest, { x: stop.x + 3, z: stop.z });
  assert.equal(atClueStop(host, stop), true);
  act(host, "search");
  assert.equal(room.clueTrail.host.searched, false);
  assert.match(errors.at(-1), /together/);
  Object.assign(guest, { x: stop.x, z: stop.z });
  act(host, "search");
  const revision = room.clueTrail.revision;
  act(host, "search");
  assert.equal(room.clueTrail.revision, revision);
  room.clueTrail = restoreClueTrail(JSON.parse(JSON.stringify(room.clueTrail)));
  assert.equal(clueTrailView(room.clueTrail, "guest").partnerSearched, true);
  act(guest, "search");
  act(guest, "start");
  assert.equal(room.clueTrail.round, 2);
  assert.notEqual(room.clueTrail.target, stop.id);
  act(host, "share");
  assert.equal(clueTrailView(room.clueTrail, "guest").partnerClue, null);
});

test("petal choices stay secret across checkpoint restore and count one match per round", () => {
  const { room, host, guest, send } = visit();
  const act = (player, action, round, choice) => send(player, "petal-match", action, { round, choice });
  act(guest, "start", 0);
  act(host, "pick", 1, "rose");
  act(host, "pick", 1, "lavender");
  room.petalMatch = restorePetalMatch(JSON.parse(JSON.stringify(room.petalMatch)));
  assert.equal(petalMatchView(room.petalMatch, "host").own, "rose");
  assert.equal(petalMatchView(room.petalMatch, "guest").partner, null);
  assert.equal(petalMatchView(room.petalMatch, "guest").partnerReady, true);
  act(guest, "pick", 1, "rose");
  act(guest, "pick", 1, "rose");
  assert.equal(petalMatchView(room.petalMatch, "guest").partner, "rose");
  assert.equal(petalMatchView(room.petalMatch, "host").matches, 1);
  act(guest, "start", 1);
  act(host, "pick", 1, "rose");
  assert.equal(petalMatchView(room.petalMatch, "host").own, null);
  act(host, "pick", 2, "daisy");
  act(guest, "pick", 2, "lavender");
  assert.equal(room.petalMatch.matches, 1);
  assert.deepEqual(restorePetalMatch(undefined), newPetalMatch());
});
