import { DurableObject } from "cloudflare:workers";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { createAccountState } from "../server/account-state.mjs";
import { actor } from "../shared/visit-actors.mjs";
import { applyVisitAction } from "../shared/visit-actions.mjs";
import { villageWalkable } from "../shared/village-world.mjs";
const token = () => randomBytes(32).toString("base64url");
const hash = (value) =>
  createHash("sha256").update(String(value)).digest("hex");
const equal = (value, digest) =>
  typeof value === "string" &&
  value.length <= 512 &&
  typeof digest === "string" &&
  /^[a-f0-9]{64}$/.test(digest) &&
  timingSafeEqual(Buffer.from(hash(value), "hex"), Buffer.from(digest, "hex"));
const expires = 86400000;
const open = (ws) => ws?.readyState === 1;
const send = (ws, message) => {
  if (open(ws)) ws.send(JSON.stringify(message));
};
const allowed = (env, origin) =>
  (env.ALLOWED_ORIGINS || "https://hmlim123.github.io")
    .split(",")
    .map((s) => s.trim())
    .includes(origin);
function headers(origin) {
  return {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...(origin
      ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
      : {}),
  };
}
function json(status, body, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: headers(origin),
  });
}
async function body(request) {
  const reader = request.body?.getReader();
  if (!reader) return {};
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > 4096) {
        await reader.cancel();
        throw Object.assign(Error("That request is too large."), {
          status: 413,
        });
      }
      chunks.push(next.value);
    }
    const merged = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const value = JSON.parse(new TextDecoder().decode(merged) || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw Error("Invalid request");
    return value;
  } finally {
    reader.releaseLock();
  }
}
export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname,
      origin = request.headers.get("Origin");
    if (path === "/" && request.method === "GET")
      return new Response(
        "Nancy’s free private village service. Open the game to visit together.\n",
        {
          headers: {
            "Content-Type": "text/plain",
            "Cache-Control": "no-store",
          },
        },
      );
    if (path !== "/health" && !allowed(env, origin))
      return json(403, {
        error: "This game address is not connected to the visit service.",
      });
    if (request.method === "OPTIONS")
      return new Response(null, {
        status: 204,
        headers: {
          ...headers(origin),
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "600",
        },
      });
    if (
      typeof env.ACCOUNT_SETUP_KEY !== "string" ||
      env.ACCOUNT_SETUP_KEY.length < 32
    )
      return json(
        503,
        {
          error:
            "The gift’s creator needs to add the private ACCOUNT_SETUP_KEY secret in Cloudflare Settings before the first login.",
        },
        allowed(env, origin) ? origin : null,
      );
    return env.VILLAGE.get(env.VILLAGE.idFromName("nancy-and-melody")).fetch(
      request,
    );
  },
};
/** One SQLite-backed object for one couple: available on Workers Free. */
export class PrivateVillage extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
    this.sql = ctx.storage.sql;
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS village_data (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
    );
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS login_limits (key TEXT PRIMARY KEY, attempts TEXT NOT NULL, expires INTEGER NOT NULL)",
    );
    this.accounts = createAccountState({
      setupKey: env.ACCOUNT_SETUP_KEY,
      // OWASP's memory-bounded scrypt configuration fits a Worker's 128 MB isolate.
      scryptCost: { N: 32768, p: 3 },
      storage: {
        load: () => this.read("accounts"),
        save: (next) => this.write("accounts", next),
      },
    });
    this.room = this.read("room");
    if (this.room)
      for (const role of ["host", "guest"])
        if (this.room[role]) this.room[role].socket = null;
    this.connections = new Map();
    // Cloudflare restores accepted sockets and attachments after hibernation.
    for (const ws of ctx.getWebSockets()) {
      const c = ws.deserializeAttachment();
      if (
        !c ||
        c.roomId !== this.room?.id ||
        !this.accounts.authenticateDigest(c.accountHash)
      ) {
        ws.close(1008, "Sign-in expired");
        continue;
      }
      const player = this.room[c.role];
      if (
        !player ||
        player.profile !== this.accounts.authenticateDigest(c.accountHash).id
      ) {
        ws.close(1008, "Visit ended");
        continue;
      }
      if (c.player) Object.assign(player, c.player);
      player.socket = ws;
      this.connections.set(ws, c);
    }
  }
  read(key) {
    const row = this.sql
      .exec("SELECT value FROM village_data WHERE key = ?", key)
      .toArray()[0];
    return row ? JSON.parse(row.value) : null;
  }
  write(key, value) {
    const encoded = JSON.stringify(value);
    if (
      this.sql
        .exec("SELECT value FROM village_data WHERE key = ?", key)
        .toArray()[0]?.value === encoded
    )
      return;
    this.sql.exec(
      "INSERT INTO village_data (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      key,
      encoded,
    );
  }
  saveRoom() {
    const room = this.room;
    const pack = (p) => (p ? { ...p, socket: null } : null);
    this.write(
      "room",
      room ? { ...room, host: pack(room.host), guest: pack(room.guest) } : null,
    );
  }
  publicActor(p) {
    if (!p) return null;
    const {
      id,
      name,
      profile,
      character,
      appearance,
      x,
      z,
      yaw,
      speed,
      area,
      gesture,
    } = p;
    return {
      id,
      name,
      profile,
      character,
      appearance,
      x,
      z,
      yaw,
      speed,
      area,
      gesture,
      holding: p.holding || null,
      tool: p.tool || null,
      connected: open(p.socket),
    };
  }
  broadcast(room) {
    if (!room || room !== this.room) return;
    room.revision++;
    const snapshot = {
      type: "state",
      roomId: room.id,
      revision: room.revision,
      players: [room.host, room.guest]
        .filter(Boolean)
        .map((p) => this.publicActor(p)),
      chat: room.chat,
      picnic: room.picnic,
      garden: room.garden,
      together: room.together || null,
      serverNow: Date.now(),
      togetherAvailable: true,
    };
    for (const p of [room.host, room.guest]) {
      if (!p?.socket) continue;
      const c = this.connections.get(p.socket);
      if (c) {
        c.player = { ...p, socket: null };
        p.socket.serializeAttachment(c);
      }
      send(p.socket, snapshot);
    }
  }
  closeRoom() {
    const room = this.room;
    if (!room) return;
    this.room = null;
    for (const p of [room.host, room.guest])
      if (p?.socket) {
        this.connections.delete(p.socket);
        send(p.socket, { type: "ended" });
        p.socket.close(1000, "The visit has ended.");
      }
    this.saveRoom();
  }
  revokeSockets() {
    for (const [ws, c] of this.connections)
      if (!this.accounts.authenticateDigest(c.accountHash)) {
        const p = this.room?.[c.role];
        if (p?.socket === ws) {
          p.socket = null;
          p.speed = 0;
          p.disconnectedAt = Date.now();
        }
        this.connections.delete(ws);
        ws.close(1008, "Sign-in ended");
      }
    this.broadcast(this.room);
    this.saveRoom();
  }
  rateLimit(request) {
    const now = Date.now(),
      key = hash(request.headers.get("CF-Connecting-IP") || "local");
    this.sql.exec("DELETE FROM login_limits WHERE expires < ?", now);
    const rows = this.sql
      .exec("SELECT attempts FROM login_limits WHERE key = ?", key)
      .toArray();
    const recent = rows.length
      ? JSON.parse(rows[0].attempts).filter((t) => now - t < 600000)
      : [];
    if (recent.length >= 20)
      throw Object.assign(
        Error("Too many sign-in attempts. Please wait ten minutes."),
        { status: 429 },
      );
    if (
      !rows.length &&
      this.sql.exec("SELECT COUNT(*) AS count FROM login_limits").toArray()[0]
        .count >= 1000
    )
      throw Object.assign(Error("Please try again in a little while."), {
        status: 429,
      });
    recent.push(now);
    this.sql.exec(
      "INSERT INTO login_limits (key,attempts,expires) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET attempts=excluded.attempts, expires=excluded.expires",
      key,
      JSON.stringify(recent),
      now + 600000,
    );
    return key;
  }
  async fetch(request) {
    const path = new URL(request.url).pathname,
      origin = request.headers.get("Origin");
    if (path === "/health")
      return json(
        200,
        {
          ok: true,
          protocol: 1,
          privateAccounts: true,
          provider: "cloudflare",
          storage: "sqlite",
          freeTierCompatible: true,
        },
        allowed(this.env, origin) ? origin : null,
      );
    if (!allowed(this.env, origin))
      return json(403, {
        error: "This game address is not connected to the visit service.",
      });
    if (this.room && Date.now() - this.room.createdAt >= expires)
      this.closeRoom();
    const secret =
      request.headers.get("Authorization")?.replace(/^Bearer /, "") || "";
    try {
      if (
        path.startsWith("/account") &&
        (request.method === "POST" ||
          (path === "/account" && request.method === "GET"))
      ) {
        const input = await body(request),
          ip = request.method === "POST" ? this.rateLimit(request) : "";
        const result = await this.accounts.handle(path, secret, input, ip);
        if (path === "/account/logout" || path === "/account/login")
          this.revokeSockets();
        return json(200, { ...result, togetherAvailable: true }, origin);
      }
      if (path === "/meeting" && request.method === "GET") {
        const identity = this.accounts.authenticate(secret);
        if (identity?.id !== "melody")
          return json(401, { error: "Sign in as My Melody first." }, origin);
        const room = this.room;
        return room && open(room.host.socket)
          ? json(200, { roomId: room.id, invite: room.invite }, origin)
          : json(
              409,
              {
                error:
                  "Nancy hasn’t opened her village yet. Ask her to choose Meet together.",
              },
              origin,
            );
      }
      if (path === "/rooms" && request.method === "POST") {
        const input = await body(request),
          identity = this.accounts.authenticate(secret);
        if (identity?.id !== "nancy")
          return json(
            401,
            { error: "Sign in as Nancy to open her village." },
            origin,
          );
        // Authenticated creation only; one village and two identities per object.
        const roomToken = token();
        this.closeRoom();
        this.room = {
          id: randomBytes(8).toString("hex"),
          createdAt: Date.now(),
          hostHash: hash(roomToken),
          guestHash: null,
          invite: token(),
          host: {
            ...actor("host", "Nancy", input.appearance, input.position),
            profile: "nancy",
            character: "kitty",
          },
          guest: null,
          revision: 0,
          chat: [],
          picnic: [false, false, false],
          garden: [0, 1, 2].map((i) => input.garden?.[i] === true),
        };
        this.saveRoom();
        return json(
          201,
          {
            roomId: this.room.id,
            token: roomToken,
            role: "host",
            invite: this.room.invite,
          },
          origin,
        );
      }
      if (
        path === "/visit" &&
        request.headers.get("Upgrade")?.toLowerCase() === "websocket"
      ) {
        if (this.ctx.getWebSockets().length >= 8)
          return json(
            429,
            {
              error:
                "There are too many connections. Please try again shortly.",
            },
            origin,
          );
        const pair = new WebSocketPair(),
          [client, server] = Object.values(pair);
        this.ctx.acceptWebSocket(server);
        server.serializeAttachment({ pending: true, started: Date.now() });
        const deadline = Date.now() + 8000,
          alarm = await this.ctx.storage.getAlarm();
        if (alarm === null || alarm > deadline)
          await this.ctx.storage.setAlarm(deadline);
        return new Response(null, { status: 101, webSocket: client });
      }
      return json(404, { error: "Not found" }, origin);
    } catch (error) {
      return json(
        error.status || 400,
        {
          error: error.status
            ? error.message
            : "The request could not be completed. Please try again.",
        },
        origin,
      );
    }
  }
  async webSocketMessage(ws, payload) {
    const fail = (message) => send(ws, { type: "error", message });
    if (
      typeof payload !== "string" ||
      new TextEncoder().encode(payload).byteLength > 4096
    ) {
      ws.close(1008, "That message is too large.");
      return;
    }
    let m;
    try {
      m = JSON.parse(payload);
    } catch {
      ws.close(1008, "Invalid message.");
      return;
    }
    if (!m || typeof m !== "object" || Array.isArray(m)) {
      ws.close(1008, "Invalid message.");
      return;
    }
    let c = this.connections.get(ws);
    const now = Date.now(),
      room = this.room;
    if (!room || now - room.createdAt >= expires) {
      fail("This visit has ended. Ask for a fresh invitation.");
      ws.close(1008, "Visit ended");
      return;
    }
    if (!c) {
      const identity = this.accounts.authenticate(m.accountToken);
      if (!identity) {
        fail("Please sign in again to continue your private visit.");
        ws.close(1008, "Sign-in required");
        return;
      }
      if (!["hello", "join"].includes(m.type) || m.roomId !== room.id) {
        ws.close(1008, "Please use your invitation.");
        return;
      }
      let secret = m.token;
      if (m.type === "join") {
        if (identity.id !== "melody" || !equal(m.invite, hash(room.invite))) {
          ws.close(1008, "This invitation is not valid for your account.");
          return;
        }
        if (room.guest && open(room.guest.socket)) {
          fail(
            "This village already has a visitor. Try again when their visit ends.",
          );
          ws.close(1008, "Village full");
          return;
        }
        secret = token();
        room.guestHash = hash(secret);
        const offset = [
          [-1.5, 0],
          [1.5, 0],
          [0, 1.5],
          [0, -1.5],
          [0, 0],
        ].find(([x, z]) =>
          villageWalkable(room.host.x + x, room.host.z + z),
        ) || [0, 0];
        room.guest = {
          ...actor("guest", "My Melody", m.appearance, {
            x: room.host.x + offset[0],
            z: room.host.z + offset[1],
          }),
          profile: "melody",
          character: "melody",
        };
      }
      const player = equal(secret, room.hostHash)
        ? room.host
        : equal(secret, room.guestHash)
          ? room.guest
          : null;
      if (!player || player.profile !== identity.id) {
        ws.close(1008, "This visit ticket is not valid.");
        return;
      }
      if (player.socket && player.socket !== ws) {
        this.connections.delete(player.socket);
        player.socket.close(1000, "Your visit moved to another window.");
      }
      player.socket = ws;
      player.disconnectedAt = 0;
      player.lastMove = now;
      player.budget = 1.5;
      c = {
        role: player.id,
        roomId: room.id,
        accountHash: hash(m.accountToken),
        bucket: 25,
        lastBucket: now,
        chats: [],
        player: { ...player, socket: null },
      };
      this.connections.set(ws, c);
      ws.serializeAttachment(c);
      send(ws, {
        type: "welcome",
        roomId: room.id,
        token: secret,
        role: player.id,
        ...(player.id === "host" ? { invite: room.invite } : {}),
        you: this.publicActor(player),
      });
      this.broadcast(room);
      this.saveRoom();
      if (
        !this.ctx
          .getWebSockets()
          .some((s) => s.deserializeAttachment()?.pending)
      )
        await this.ctx.storage.deleteAlarm();
      return;
    }
    if (!this.accounts.authenticateDigest(c.accountHash)) {
      fail("Please sign in again to continue your private visit.");
      ws.close(1008, "Sign-in expired");
      return;
    }
    const player = room[c.role];
    if (!player || player.socket !== ws) return;
    c.bucket = Math.min(25, c.bucket + Math.max(0, now - c.lastBucket) * 0.02);
    c.lastBucket = now;
    if (c.bucket < 1) {
      ws.close(1008, "Too many messages.");
      return;
    }
    c.bucket--;
    applyVisitAction({
      room,
      player,
      m,
      now: () => Date.now(),
      connection: c,
      send,
      broadcast: (r) => this.broadcast(r),
      dirty: () => {
        if (m.type !== "move") this.saveRoom();
      },
      fail,
      ws,
      endRoom: () => {
        this.room = null;
      },
    });
    // Position updates live in hibernating socket attachments, not billed SQL writes.
    if (this.connections.has(ws)) {
      c.player = { ...player, socket: null };
      ws.serializeAttachment(c);
    }
  }
  webSocketClose(ws, code, reason, wasClean) {
    const c = this.connections.get(ws);
    this.connections.delete(ws);
    const p = c?.roomId === this.room?.id ? this.room?.[c.role] : null;
    if (p?.socket === ws) {
      p.socket = null;
      p.speed = 0;
      p.disconnectedAt = Date.now();
      this.broadcast(this.room);
      this.saveRoom();
    }
    if (ws.readyState === 2) ws.close(code === 1005 ? 1000 : code, reason);
  }
  async alarm() {
    let next = Infinity;
    for (const ws of this.ctx.getWebSockets()) {
      const c = ws.deserializeAttachment();
      if (!c?.pending) continue;
      if (Date.now() - c.started >= 8000)
        ws.close(1008, "Please join with an invitation.");
      else next = Math.min(next, c.started + 8000);
    }
    if (Number.isFinite(next)) await this.ctx.storage.setAlarm(next);
  }
  webSocketError(ws) {
    this.webSocketClose(ws, 1011, "Connection interrupted", false);
  }
}
