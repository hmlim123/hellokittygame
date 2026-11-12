import { WebSocket } from "ws";
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestWorker } from "./test-runtime.mjs";
const origin = "https://hmlim123.github.io",
  setupKey = "local-worker-fixture-private-owner-setup-key";
async function setup(t, options = {}) {
  const mf = await createTestWorker(options);
  t.after(() => mf.dispose());
  const request = async (path, input, token = "", requestOrigin = origin) => {
    const r = await mf.dispatchFetch("http://localhost" + path, {
      method: input ? "POST" : "GET",
      headers: {
        Origin: requestOrigin,
        ...(input ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: input ? JSON.stringify(input) : undefined,
    });
    return { status: r.status, body: await r.json() };
  };
  return { mf, request };
}
async function client(mf, hello) {
  const url = new URL("/visit", await mf.ready);
  const ws = new WebSocket(url.href.replace(/^http/, "ws"), { origin });
  await new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });
  const messages = [];
  ws.addEventListener("message", (e) => messages.push(JSON.parse(e.data)));
  const until = async (fn) => {
    const end = Date.now() + 4000;
    while (Date.now() < end) {
      const m = messages.find(fn);
      if (m) return m;
      await new Promise((r) => setTimeout(r, 5));
    }
    throw Error("No matching packet: " + JSON.stringify(messages));
  };
  ws.send(JSON.stringify(hello));
  return {
    ws,
    messages,
    until,
    send: (m) => ws.send(JSON.stringify(m)),
    clear: () => {
      messages.length = 0;
    },
  };
}
async function pair(t, options = {}, position) {
  const s = await setup(t, options);
  const n = (
    await s.request("/account/setup", {
      setupKey,
      password: "Nancy local password",
    })
  ).body;
  assert.equal(n.profile.id, "nancy");
  const invite = (await s.request("/account/invite", {}, n.token)).body.invite;
  const m = (
    await s.request("/account/register", {
      invite,
      password: "Melody local password",
    })
  ).body;
  const room = (await s.request("/rooms", { position }, n.token)).body;
  const host = await client(s.mf, {
    type: "hello",
    ...room,
    accountToken: n.token,
  });
  await host.until((m) => m.type === "welcome");
  const guest = await client(s.mf, {
    type: "join",
    roomId: room.roomId,
    invite: room.invite,
    accountToken: m.token,
    name: "Nancy",
  });
  const guestTicket = await guest.until((m) => m.type === "welcome");
  return { ...s, n, m, room, host, guest, guestTicket };
}
test("the actual Cloudflare runtime stores two invited, password-protected identities", async (t) => {
  const s = await pair(t);
  assert.equal(s.guestTicket.you.character, "melody");
  const state = await s.host.until(
    (m) => m.type === "state" && m.players.length === 2,
  );
  assert.deepEqual(
    state.players.map((p) => [p.profile, p.character]),
    [
      ["nancy", "kitty"],
      ["melody", "melody"],
    ],
  );
  assert.equal((await s.request("/rooms", {}, s.m.token)).status, 401);
  assert.equal(
    (
      await s.request("/account/login", {
        profile: "melody",
        password: "wrong password",
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await s.request("/account/register", {
        invite: s.room.invite,
        password: "Another password",
      })
    ).status,
    403,
  );
});
test("origins, owner setup keys, malformed payloads and anonymous sockets fail closed", async (t) => {
  const s = await setup(t);
  assert.equal(
    (await s.request("/account", undefined, "", "https://other.example"))
      .status,
    403,
  );
  assert.equal(
    (
      await s.request("/account/setup", {
        setupKey: "wrong",
        password: "Nancy local password",
      })
    ).status,
    403,
  );
  assert.equal((await s.request("/rooms", {})).status, 401);
  const r = await s.mf.dispatchFetch("http://localhost/rooms", {
    method: "POST",
    headers: { Origin: origin },
    body: "x".repeat(4097),
  });
  assert.equal(r.status, 413);
  const missing = await createTestWorker({ setupKey: "" });
  t.after(() => missing.dispose());
  assert.equal(
    (await missing.dispatchFetch("http://localhost/health")).status,
    503,
  );
});
test("login tokens cannot swap avatars, reuse the other role’s ticket or add a third guest", async (t) => {
  const s = await pair(t);
  const stolen = await client(s.mf, {
    type: "hello",
    ...s.room,
    accountToken: s.m.token,
  });
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(
    stolen.messages.some((m) => m.type === "welcome"),
    false,
  );
  const anonymous = await client(s.mf, { type: "hello", ...s.room });
  await anonymous.until((m) => m.type === "error");
  const extra = await client(s.mf, {
    type: "join",
    roomId: s.room.roomId,
    invite: s.room.invite,
    accountToken: s.m.token,
  });
  await extra.until((m) => m.type === "error");
  s.guest.send({
    type: "appearance",
    appearance: { outfit: "sailor", character: "kitty", profile: "nancy" },
  });
  const state = await s.host.until(
    (m) =>
      m.type === "state" &&
      m.players.some((p) => p.appearance.outfit === "sailor"),
  );
  assert.equal(
    state.players.find((p) => p.profile === "melody").character,
    "melody",
  );
});
test("the same authoritative rules synchronize motion, plain chat, gestures and reject teleporting", async (t) => {
  const s = await pair(t);
  s.guest.send({ type: "move", x: 999, z: 999, yaw: 0 });
  await s.guest.until((m) => m.type === "correction");
  s.guest.send({ type: "chat", text: "Hello Nancy ♡ <b>plain text</b>" });
  const chat = await s.host.until(
    (m) => m.type === "state" && m.chat.length === 1,
  );
  assert.equal(chat.chat[0].text, "Hello Nancy ♡ <b>plain text</b>");
  s.guest.send({ type: "gesture", kind: "dance" });
  await s.host.until(
    (m) =>
      m.type === "state" &&
      m.players.some(
        (p) => p.profile === "melody" && p.gesture.kind === "dance",
      ),
  );
  const p = s.guestTicket.you;
  s.guest.send({ type: "move", x: p.x + 0.1, z: p.z, yaw: 0.3 });
  await s.host.until(
    (m) =>
      m.type === "state" &&
      m.players.some((a) => a.profile === "melody" && a.x > p.x + 0.05),
  );
});
test("a nearby pair can complete one shared picnic and only Nancy can end it", async (t) => {
  const s = await pair(t, {}, { x: -5.5, z: 4.2 });
  for (const [client, slot] of [
    [s.host, 0],
    [s.guest, 1],
    [s.host, 2],
  ])
    client.send({ type: "picnic", slot });
  const state = await s.host.until(
    (m) => m.type === "state" && m.picnic.every(Boolean),
  );
  assert.deepEqual(state.picnic, [true, true, true]);
  s.guest.send({ type: "end" });
  await s.guest.until(
    (m) => m.type === "error" && m.message.includes("Only the host"),
  );
  s.host.send({ type: "end" });
  await s.guest.until((m) => m.type === "ended");
});
test("SQL persistence restores accounts and private tickets after a whole runtime restart", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "kitty-free-persist-"));
  const first = await pair(t, { persist: dir });
  first.host.ws.close(1000, "Reload");
  first.guest.ws.close(1000, "Reload");
  await new Promise((r) => setTimeout(r, 50));
  await first.mf.dispose();
  const second = await setup(t, { persist: dir });
  t.after(() => rm(dir, { recursive: true, force: true }));
  const login = await second.request("/account/login", {
    profile: "melody",
    password: "Melody local password",
  });
  assert.equal(login.status, 200);
  const guest = await client(second.mf, {
    type: "hello",
    roomId: first.room.roomId,
    token: first.guestTicket.token,
    accountToken: login.body.token,
  });
  const ready = await guest.until((m) => m.type === "welcome");
  assert.equal(ready.you.character, "melody");
  assert.equal((await second.request("/account")).body.melodyRegistered, true);
});
test("sign-out revokes an active socket and a replacement login revokes the old session", async (t) => {
  const s = await pair(t);
  await s.request("/account/logout", {}, s.m.token);
  assert.equal(
    (await s.request("/account", undefined, s.m.token)).body.profile,
    null,
  );
  const login = await s.request("/account/login", {
    profile: "nancy",
    password: "Nancy local password",
  });
  assert.equal(login.status, 200);
  assert.equal(
    (await s.request("/account", undefined, s.n.token)).body.profile,
    null,
  );
});

test("rate limits persist when the free runtime restarts", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "kitty-free-rate-"));
  const first = await setup(t, { persist: dir });
  for (let i = 0; i < 20; i++)
    assert.equal((await first.request("/account/invite", {})).status, 401);
  await first.mf.dispose();
  const second = await setup(t, { persist: dir });
  t.after(() => rm(dir, { recursive: true, force: true }));
  assert.equal((await second.request("/account/invite", {})).status, 429);
});

test(
  "hibernation restores authenticated live sockets, gestures and positions without constant SQL writes",
  { timeout: 45000 },
  async (t) => {
    const s = await pair(t, { instrument: true });
    const details = async () =>
      (
        await s.mf.dispatchFetch("http://localhost/__test_runtime", {
          headers: { Origin: origin },
        })
      ).json();
    const before = await details();
    const p = s.guestTicket.you;
    s.guest.send({ type: "move", x: p.x + 0.12, z: p.z, yaw: 0 });
    await s.host.until(
      (m) =>
        m.type === "state" &&
        m.players.some((a) => a.profile === "melody" && a.x > p.x + 0.1),
    );
    assert.equal(
      (await details()).persistedX,
      p.x,
      "Movement must not write the room row on every packet",
    );
    // Force the actual Workerd hibernation path deterministically, retaining
    // live WebSockets while discarding the old JavaScript object instance.
    await s.mf.unsafeEvictDurableObject("nancy-village-free", "TestVillage", {
      name: "nancy-and-melody",
      webSockets: "hibernate",
    });
    const after = await details();
    assert.notEqual(
      after.instance,
      before.instance,
      "The test must exercise a real object eviction, not just idle sockets",
    );
    assert.equal(after.players.filter((p) => p.connected).length, 2);
    assert.equal(
      after.players.find((p) => p.profile === "melody").x,
      p.x + 0.12,
    );
    s.guest.clear();
    s.host.clear();
    s.guest.send({ type: "gesture", kind: "wave" });
    await s.host.until(
      (m) =>
        m.type === "state" &&
        m.players.some(
          (p) => p.profile === "melody" && p.gesture.kind === "wave",
        ),
    );
  },
);
