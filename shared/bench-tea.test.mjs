import assert from "node:assert/strict";
import { test } from "node:test";
import { BENCH_TOAST_MS, newBenchTea, restoreBenchTea, teaBenchSeat } from "./bench-tea.mjs";
import { applyVisitAction } from "./visit-actions.mjs";
import { VILLAGE_SPAWN, villagePath } from "./village-world.mjs";

function visit() {
  let now = 10_000;
  const room = Object.fromEntries(["host", "guest"].map((id) => [id, {
    id, ...teaBenchSeat(id), area: "village", socket: { readyState: 1 }, lastMove: 9_000, budget: 1.5,
  }]));
  const errors = [], writes = [];
  function act(role, action, toastAt = room.benchTea?.toastAt ?? 0) {
    send(role, { type: "bench-tea", action, toastAt });
  }
  function send(role, m) {
    applyVisitAction({ room, player: room[role], m, now: () => now,
      broadcast() {}, dirty: (shared) => writes.push(shared), send() {}, fail: (message) => errors.push(message),
    });
  }
  return { room, act, send, errors, writes, advanceTo: (time) => { now = time; } };
}

test("seats are reachable and each player must reach their own spot before sharing a toast", () => {
  const { room, act, advanceTo } = visit();
  for (const role of ["host", "guest"])
    assert.ok(villagePath(VILLAGE_SPAWN, teaBenchSeat(role)).length);
  room.guest.x = room.host.x;
  act("guest", "sit");
  assert.equal(room.benchTea, undefined);
  act("host", "sit");
  act("host", "ready");
  assert.equal(room.benchTea.ready.host, false);
  Object.assign(room.guest, teaBenchSeat("guest"));
  act("guest", "sit");
  act("host", "ready");
  assert.deepEqual(room.benchTea.ready, { host: true, guest: false });
  const waiting = room.benchTea;
  act("host", "ready");
  assert.equal(room.benchTea, waiting);
  act("guest", "ready");
  assert.equal(room.benchTea.toastAt, 10_400);
  assert.deepEqual(room.benchTea.ready, { host: false, guest: false });
  advanceTo(10_400 + BENCH_TOAST_MS);
  act("guest", "ready", 0);
  assert.equal(room.benchTea.ready.guest, false);
  act("guest", "ready");
  assert.equal(room.benchTea.ready.guest, true);
});

test("moving away clears readiness and standing up cancels an active toast", () => {
  const { room, act, send, errors, writes, advanceTo } = visit();
  act("host", "sit");
  act("guest", "sit");
  act("host", "ready");
  room.benchTea = restoreBenchTea(JSON.parse(JSON.stringify(room.benchTea)));
  assert.equal(room.benchTea.ready.host, true);
  send("host", { type: "together", revision: 0, action: "celebrate" });
  assert.match(errors.at(-1), /Stand up/);
  send("host", { type: "together", revision: 0, action: "sunset" });
  assert.equal(room.together.weather, "sunset");
  send("guest", { type: "move", x: room.guest.x + 0.6, z: room.guest.z, yaw: 0, area: "village" });
  assert.deepEqual(room.benchTea.seated, { host: true, guest: false });
  assert.deepEqual(room.benchTea.ready, { host: false, guest: false });
  assert.equal(writes.at(-1), true);
  Object.assign(room.guest, teaBenchSeat("guest"));
  act("guest", "sit");
  act("guest", "ready");
  act("host", "ready");
  assert.ok(room.benchTea.toastAt > 0);
  advanceTo(room.benchTea.toastAt + BENCH_TOAST_MS / 2);
  act("host", "stand");
  assert.deepEqual(room.benchTea.seated, { host: false, guest: true });
  assert.equal(room.benchTea.toastAt, 0);
  act("guest", "stand");
  assert.deepEqual(room.benchTea.seated, { host: false, guest: false });
  assert.deepEqual(restoreBenchTea(undefined), newBenchTea());
});
