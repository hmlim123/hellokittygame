import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebSocket } from "ws";
import { createVisitService } from "./visits.mjs";
import { villagePath, VILLAGE_SPAWN } from "../shared/village-world.mjs";
const origin = "https://hmlim123.github.io";
async function setup(options = {}) {
  let clock = Date.now();
  const service = createVisitService({
      origins: [origin],
      now: () => clock,
      ...options,
    }),
    address = await service.listen();
  const base = "http://127.0.0.1:" + address.port;
  return {
    service,
    base,
    advance: (t) => {
      clock += t;
    },
    async room(body = {}) {
      const r = await fetch(base + "/rooms", {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      assert.equal(r.status, 201);
      return r.json();
    },
  };
}
async function client(base, hello) {
  const ws = new WebSocket(base.replace("http", "ws") + "/visit", { origin }),
    messages = [];
  let closed = null;
  ws.on("message", (b) => messages.push(JSON.parse(b.toString())));
  ws.on("close", (code) => {
    closed = code;
  });
  ws.on("error", () => {});
  const until = async (predicate, timeout = 2500) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      const m = messages.find(predicate);
      if (m) return m;
      await new Promise((r) => setTimeout(r, 5));
    }
    throw Error(
      "Timed out waiting for " +
        predicate +
        "; got " +
        JSON.stringify(messages),
    );
  };
  await new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });
  ws.send(JSON.stringify(hello));
  return {
    ws,
    messages,
    until,
    send: (m) => ws.send(JSON.stringify(m)),
    clear() {
      messages.length = 0;
    },
    closed: () => closed,
  };
}
async function pair(t, options = {}) {
  const s = await setup(options);
  t.after(() => s.service.close());
  const ticket = await s.room({ name: "Nancy" }),
    host = await client(s.base, { type: "hello", ...ticket }),
    welcome = await host.until((m) => m.type === "welcome");
  const guest = await client(s.base, {
      type: "join",
      roomId: ticket.roomId,
      invite: ticket.invite,
      name: "Her friend",
    }),
    joined = await guest.until((m) => m.type === "welcome");
  await host.until(
    (m) =>
      m.type === "state" && m.players.filter((p) => p.connected).length === 2,
  );
  return {
    ...s,
    ticket,
    host,
    guest,
    hostWelcome: welcome,
    guestWelcome: joined,
  };
}
test("health, origin checks and malformed invitation requests work without exposing rooms", async (t) => {
  const s = await setup();
  t.after(() => s.service.close());
  assert.deepEqual(await (await fetch(s.base + "/health")).json(), {
    ok: true,
    protocol: 1,
  });
  assert.equal(
    (
      await fetch(s.base + "/rooms", {
        method: "POST",
        headers: { Origin: "https://other.example" },
        body: "{}",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(s.base + "/rooms", {
        method: "POST",
        headers: { Origin: origin },
        body: "not json",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await fetch(s.base + "/rooms", {
        method: "POST",
        headers: { Origin: origin },
        body: "a".repeat(5000),
      })
    ).status,
    400,
  );
});
test("two independent clients receive distinct roles and a shared state; host secret is private", async (t) => {
  const s = await pair(t);
  assert.equal(s.hostWelcome.role, "host");
  assert.equal(s.guestWelcome.role, "guest");
  assert.notEqual(s.hostWelcome.token, s.guestWelcome.token);
  assert.ok(!("invite" in s.guestWelcome));
  const state = await s.guest.until(
    (m) =>
      m.type === "state" && m.players.filter((p) => p.connected).length === 2,
  );
  assert.equal(state.players.length, 2);
  assert.ok(!JSON.stringify(state).includes(s.ticket.token));
  assert.ok(!JSON.stringify(state).includes(s.ticket.invite));
});
test("invalid tickets and an additional visitor cannot take over a two-person visit", async (t) => {
  const s = await pair(t);
  const bad = await client(s.base, {
    type: "hello",
    roomId: s.ticket.roomId,
    token: "wrong",
    role: "host",
  });
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(bad.closed(), 1008);
  const extra = await client(s.base, {
    type: "join",
    roomId: s.ticket.roomId,
    invite: s.ticket.invite,
    name: "Extra",
  });
  const error = await extra.until((m) => m.type === "error");
  assert.match(error.message, /already has a visitor/);
  assert.equal(s.service.rooms.get(s.ticket.roomId).guest.name, "Her friend");
});
test("movement is synchronized; teleports and extreme values are rejected before collision work", async (t) => {
  const s = await pair(t);
  s.guest.clear();
  s.host.send({
    type: "move",
    x: VILLAGE_SPAWN.x - 0.25,
    z: VILLAGE_SPAWN.z,
    yaw: -1,
  });
  const updated = await s.guest.until(
    (m) =>
      m.type === "state" &&
      m.players.some(
        (p) =>
          p.id === "host" && Math.abs(p.x - (VILLAGE_SPAWN.x - 0.25)) < 0.01,
      ),
  );
  assert.equal(updated.players[0].yaw, -1);
  s.host.clear();
  s.host.send({ type: "move", x: 1e300, z: 1e300, yaw: 0 });
  await s.host.until((m) => m.type === "correction");
  assert.ok(
    Math.abs(
      s.service.rooms.get(s.ticket.roomId).host.x - (VILLAGE_SPAWN.x - 0.25),
    ) < 1e-8,
  );
});
test("chat remains plain text, bounded and rate limited; dance is a synchronized expression", async (t) => {
  const s = await pair(t);
  s.guest.clear();
  s.host.send({ type: "chat", text: "  Hi Nancy ♡ <b>hello</b>\u0000  " });
  const state = await s.guest.until(
    (m) => m.type === "state" && m.chat.length === 1,
  );
  assert.equal(state.chat[0].text, "Hi Nancy ♡ <b>hello</b>");
  s.host.send({ type: "gesture", kind: "dance" });
  await s.guest.until(
    (m) => m.type === "state" && m.players[0].gesture.kind === "dance",
  );
  for (let i = 0; i < 4; i++)
    s.host.send({ type: "chat", text: "Another " + i });
  await s.host.until((m) => m.type === "error" && m.message.includes("pause"));
});
async function walk(s, c, target) {
  let player = s.service.rooms.get(s.ticket.roomId)[
    c === s.host ? "host" : "guest"
  ];
  const route = villagePath(player, target);
  assert.ok(route.length);
  for (const p of route) {
    while (Math.hypot(player.x - p.x, player.z - p.z) > 0.02) {
      const dx = p.x - player.x,
        dz = p.z - player.z,
        d = Math.hypot(dx, dz),
        step = Math.min(0.25, d),
        x = player.x + (dx / d) * step,
        z = player.z + (dz / d) * step;
      s.advance(130);
      c.clear();
      c.send({ type: "move", x, z, yaw: Math.atan2(dx, dz) });
      await c.until(
        (m) =>
          m.type === "state" &&
          m.players.some(
            (q) => q.id === player.id && Math.hypot(q.x - x, q.z - z) < 0.13,
          ),
      );
      player = s.service.rooms.get(s.ticket.roomId)[player.id];
    }
  }
}
test("the shared picnic requires arriving, accepts concurrent contributions once and completes together", async (t) => {
  const s = await pair(t);
  s.host.send({ type: "picnic", slot: 0 });
  await s.host.until(
    (m) => m.type === "error" && m.message.includes("Walk over"),
  );
  await walk(s, s.host, { x: -5.5, z: 4.2 });
  await walk(s, s.guest, { x: -4, z: 4.2 });
  s.host.clear();
  s.guest.clear();
  s.host.send({ type: "picnic", slot: 0 });
  s.guest.send({ type: "picnic", slot: 0 });
  s.host.send({ type: "picnic", slot: 1 });
  s.guest.send({ type: "picnic", slot: 2 });
  const ready = await s.host.until(
    (m) => m.type === "state" && m.picnic.every(Boolean),
  );
  assert.deepEqual(ready.picnic, [true, true, true]);
  assert.ok(ready.players.every((p) => p.gesture.kind === "softHappy"));
});
test("a disconnected visitor can resume their own ticket and cannot end the host’s visit", async (t) => {
  const s = await pair(t);
  s.guest.ws.close();
  await new Promise((r) => setTimeout(r, 25));
  const resumed = await client(s.base, {
    type: "hello",
    roomId: s.ticket.roomId,
    token: s.guestWelcome.token,
  });
  assert.equal(
    (await resumed.until((m) => m.type === "welcome")).role,
    "guest",
  );
  resumed.send({ type: "end" });
  await resumed.until(
    (m) => m.type === "error" && m.message.includes("Only the host"),
  );
  assert.ok(s.service.rooms.has(s.ticket.roomId));
  s.host.send({ type: "end" });
  await resumed.until((m) => m.type === "ended");
  assert.ok(!s.service.rooms.has(s.ticket.roomId));
});
test("a checkpoint restores the same private tickets and shared state across a server restart", async () => {
  const directory = await mkdtemp(join(tmpdir(), "nancy-visits-"));
  let a, b;
  try {
    const file = join(directory, "visits.json");
    a = await setup({ storeFile: file });
    const ticket = await a.room({ name: "Nancy" }),
      host = await client(a.base, { type: "hello", ...ticket });
    await host.until((m) => m.type === "welcome");
    host.send({ type: "chat", text: "A little memory" });
    await host.until((m) => m.type === "state" && m.chat.length === 1);
    await a.service.close();
    a = null;
    b = await setup({ storeFile: file });
    const resumed = await client(b.base, { type: "hello", ...ticket });
    assert.equal(
      (await resumed.until((m) => m.type === "welcome")).role,
      "host",
    );
    assert.equal(
      (await resumed.until((m) => m.type === "state")).chat[0].text,
      "A little memory",
    );
  } finally {
    await a?.service.close();
    await b?.service.close();
    await rm(directory, { recursive: true, force: true });
  }
});
test("visitors can help the shared garden only from a nearby bed and cannot reset its bloom", async (t) => {
  const s = await pair(t);
  s.guest.send({ type: "water", index: 0 });
  await s.guest.until(
    (m) => m.type === "error" && m.message.includes("flower bed"),
  );
  await walk(s, s.guest, { x: 6, z: 3.95 });
  s.host.clear();
  s.guest.send({ type: "water", index: 1 });
  await s.host.until((m) => m.type === "state" && m.garden[1]);
  s.guest.send({
    type: "save",
    garden: [false, false, false],
    home: { placed: {} },
  });
  s.guest.send({ type: "water", index: 1 });
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(s.service.rooms.get(s.ticket.roomId).garden, [
    false,
    true,
    false,
  ]);
});

test("leaving deliberately frees the visitor place without exposing the old ticket", async (t) => {
  const s = await pair(t);
  s.guest.send({ type: "leave" });
  await s.guest.until((m) => m.type === "ended");
  assert.equal(s.service.rooms.get(s.ticket.roomId).guest, null);
  const next = await client(s.base, {
    type: "join",
    roomId: s.ticket.roomId,
    invite: s.ticket.invite,
    name: "Returning friend",
  });
  const welcome = await next.until((m) => m.type === "welcome");
  assert.equal(welcome.role, "guest");
  assert.notEqual(welcome.token, s.guestWelcome.token);
  const old = await client(s.base, {
    type: "hello",
    roomId: s.ticket.roomId,
    token: s.guestWelcome.token,
  });
  await new Promise((r) => setTimeout(r, 25));
  assert.equal(old.closed(), 1008);
  assert.match(
    await (await fetch(s.base + "/")).text(),
    /visit service is ready/,
  );
});

test("a movement packet can span a corner without rejecting a real walk or permitting wall shortcuts", async (t) => {
  const s = await pair(t);
  const before = { x: 3.7705860137939453, z: 2.4816415309906006 };
  const after = { x: 2.661547899246216, z: 2.0297515392303467 };
  await walk(s, s.guest, before);
  s.advance(1000);
  s.guest.clear();
  s.guest.send({ type: "move", ...after, yaw: -1.6 });
  await s.guest.until(
    (m) =>
      m.type === "state" &&
      m.players.some(
        (p) =>
          p.id === "guest" && Math.hypot(p.x - after.x, p.z - after.z) < 0.01,
      ),
  );
  assert.equal(
    s.guest.messages.some((m) => m.type === "correction"),
    false,
  );
  const player = s.service.rooms.get(s.ticket.roomId).guest;
  assert.ok(
    player.budget < 1.8 - Math.hypot(after.x - before.x, after.z - before.z),
    "charge the longer route around Pip, not its straight chord",
  );
  await walk(s, s.guest, { x: 3.6, z: 3.2 });
  s.advance(1000);
  s.guest.clear();
  s.guest.send({ type: "move", x: 2.4, z: 2.1, yaw: 1 });
  await s.guest.until((m) => m.type === "correction");
  assert.ok(
    s.service.rooms.get(s.ticket.roomId).guest.x > 3.5,
    "a wall shortcut exceeds the route budget",
  );
});

test("authenticated visits bind Nancy and My Melody to their own accounts, tickets and Blender identities", async (t) => {
  const { createAccounts } = await import("./accounts.mjs");
  const dir = await mkdtemp(join(tmpdir(), "private-pair-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const setupKey = "private-pair-owner-key-with-32-characters";
  const accounts = createAccounts({
    storeFile: join(dir, "accounts.json"),
    setupKey,
  });
  const s = await setup({ accounts });
  t.after(() => s.service.close());
  const post = async (path, body = {}, token = "") => {
    const response = await fetch(s.base + path, {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };
  assert.equal((await post("/rooms")).status, 401);
  const nancy = (
    await post("/account/setup", {
      setupKey,
      password: "Nancy secret password",
    })
  ).body;
  const invite = (await post("/account/invite", {}, nancy.token)).body.invite;
  const melody = (
    await post("/account/register", {
      invite,
      password: "Melody secret password",
    })
  ).body;
  assert.equal((await post("/rooms", {}, melody.token)).status, 401);
  const room = (
    await post(
      "/rooms",
      { name: "Forged name", appearance: { character: "melody" } },
      nancy.token,
    )
  ).body;
  const anonymous = await client(s.base, { type: "hello", ...room });
  await anonymous.until((m) => m.type === "error");
  assert.equal(
    anonymous.messages.some((m) => m.type === "welcome"),
    false,
  );
  const stolen = await client(s.base, {
    type: "hello",
    ...room,
    accountToken: melody.token,
  });
  await new Promise((resolve) => stolen.ws.once("close", resolve));
  assert.equal(
    stolen.messages.some((m) => m.type === "welcome"),
    false,
  );
  const host = await client(s.base, {
    type: "hello",
    ...room,
    accountToken: nancy.token,
  });
  const welcome = await host.until((m) => m.type === "welcome");
  assert.equal(welcome.you.name, "Nancy");
  assert.equal(welcome.you.character, "kitty");
  const guest = await client(s.base, {
    type: "join",
    roomId: room.roomId,
    invite: room.invite,
    name: "Nancy",
    character: "kitty",
    accountToken: melody.token,
  });
  const joined = await guest.until((m) => m.type === "welcome");
  assert.equal(joined.you.name, "My Melody");
  assert.equal(joined.you.character, "melody");
  assert.equal(joined.you.profile, "melody");
  guest.send({
    type: "appearance",
    appearance: { outfit: "berry", character: "kitty", profile: "nancy" },
  });
  const snapshot = await host.until(
    (m) =>
      m.type === "state" &&
      m.players.some(
        (p) => p.id === "guest" && p.appearance.outfit === "berry",
      ),
  );
  assert.equal(
    snapshot.players.find((p) => p.id === "guest").character,
    "melody",
  );
  await post("/account/logout", {}, melody.token);
  const end = Date.now() + 2000;
  while (guest.closed() === null && Date.now() < end)
    await new Promise((r) => setTimeout(r, 5));
  assert.equal(guest.closed(), 1008);
  assert.equal(host.closed(), null);
  const fresh = await post("/rooms", {}, nancy.token);
  assert.equal(fresh.status, 201);
  await host.until((m) => m.type === "ended");
  assert.equal(
    s.service.rooms.size,
    1,
    "Nancy has one clear village invitation at a time",
  );
});

test("authenticated room checkpoints keep both identities on restart and require the matching account to resume", async (t) => {
  const { createAccounts } = await import("./accounts.mjs");
  const dir = await mkdtemp(join(tmpdir(), "private-resume-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const accountOptions = {
    storeFile: join(dir, "accounts.json"),
    setupKey: "private-owner-resume-key-with-32-characters",
  };
  const accounts = createAccounts(accountOptions);
  const n = await accounts.handle("/account/setup", "", {
    setupKey: accountOptions.setupKey,
    password: "Nancy private password",
  });
  const invite = await accounts.handle("/account/invite", n.token);
  const m = await accounts.handle("/account/register", "", {
    invite: invite.invite,
    password: "Melody private password",
  });
  const storeFile = join(dir, "rooms.json"),
    first = await setup({ accounts, storeFile });
  const r = await fetch(first.base + "/rooms", {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      Authorization: "Bearer " + n.token,
    },
    body: "{}",
  });
  const room = await r.json();
  const h = await client(first.base, {
    type: "hello",
    ...room,
    accountToken: n.token,
  });
  await h.until((v) => v.type === "welcome");
  const g = await client(first.base, {
    type: "join",
    roomId: room.roomId,
    invite: room.invite,
    accountToken: m.token,
  });
  const guest = await g.until((v) => v.type === "welcome");
  await first.service.close();
  const second = await setup({
    accounts: createAccounts(accountOptions),
    storeFile,
  });
  t.after(() => second.service.close());
  const resumed = await client(second.base, {
    type: "hello",
    roomId: room.roomId,
    token: guest.token,
    accountToken: m.token,
  });
  const ready = await resumed.until((v) => v.type === "welcome");
  assert.equal(ready.you.character, "melody");
  assert.equal(ready.you.profile, "melody");
  const host = await client(second.base, {
    type: "hello",
    ...room,
    accountToken: n.token,
  });
  assert.equal(
    (await host.until((v) => v.type === "welcome")).you.character,
    "kitty",
  );
});
