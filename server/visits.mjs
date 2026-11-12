import { actor, appearance, text, yaw } from "../shared/visit-actors.mjs";
import { applyVisitAction } from "../shared/visit-actions.mjs";
import { createServer } from "node:http";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { dirname } from "node:path";
import { WebSocketServer, WebSocket } from "ws";
import {
  VILLAGE_SPAWN,
  VILLAGE_ACTIONS,
  villageWalkable,
  moveVillage,
  villagePath,
} from "../shared/village-world.mjs";

const token = () => randomBytes(32).toString("base64url");
const hash = (s) => createHash("sha256").update(String(s)).digest("hex");
const equal = (s, h) =>
  typeof s === "string" &&
  typeof h === "string" &&
  h.length === 64 &&
  timingSafeEqual(Buffer.from(hash(s), "hex"), Buffer.from(h, "hex"));
const expires = 24 * 60 * 60 * 1000;

/** Only shared visit state lives here. Letters, inventories and home saves never enter this protocol. */
export function createVisitService({
  origins = ["http://127.0.0.1:8081"],
  storeFile = null,
  maxRooms = 40,
  accounts = null,
  now = () => Date.now(),
} = {}) {
  const allowed = new Set(origins),
    rooms = new Map(),
    creationRates = new Map();
  let saveTimer;
  const publicActor = (a) =>
    a
      ? {
          id: a.id,
          name: a.name,
          ...(a.profile ? { profile: a.profile, character: a.character } : {}),
          appearance: a.appearance,
          x: a.x,
          z: a.z,
          yaw: a.yaw,
          speed: a.speed,
          area: a.area,
          holding: a.holding || null,
          tool: a.tool || null,
          gesture: a.gesture,
          connected: a.socket?.readyState === WebSocket.OPEN,
        }
      : null;
  const snapshot = (room) => ({
    type: "state",
    roomId: room.id,
    revision: room.revision,
    players: [room.host, room.guest].filter(Boolean).map(publicActor),
    chat: room.chat,
    picnic: room.picnic,
    garden: room.garden,
  });
  const send = (ws, message) => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
  };
  const broadcast = (room) => {
    room.revision++;
    const state = snapshot(room);
    for (const a of [room.host, room.guest]) if (a) send(a.socket, state);
  };
  function save() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (!storeFile) return;
    const serializeActor = (a) =>
      a ? { ...a, socket: null, speed: 0, budget: 1.5 } : null;
    const values = [...rooms.values()]
      .filter((r) => now() - r.createdAt < expires)
      .map((r) => ({
        ...r,
        host: serializeActor(r.host),
        guest: serializeActor(r.guest),
      }));
    mkdirSync(dirname(storeFile), { recursive: true, mode: 0o700 });
    writeFileSync(storeFile + ".tmp", JSON.stringify(values), { mode: 0o600 });
    renameSync(storeFile + ".tmp", storeFile);
  }
  function dirty() {
    if (!saveTimer)
      saveTimer = setTimeout(() => {
        try {
          save();
        } catch {
          console.error(
            "Visit checkpoint could not be saved. Personal game saves are stored in each browser.",
          );
        }
      }, 500);
  }
  if (storeFile) {
    try {
      const values = JSON.parse(readFileSync(storeFile, "utf8"));
      for (const r of Array.isArray(values) ? values.slice(0, maxRooms) : []) {
        if (
          !/^[0-9a-f]{16}$/.test(r.id) ||
          !r.host ||
          (accounts && r.host.profile !== "nancy") ||
          now() - r.createdAt > expires
        )
          continue;
        const restore = (a, role) =>
          a
            ? {
                ...actor(role, a.name, a.appearance, a),
                ...(accounts
                  ? {
                      profile: role === "host" ? "nancy" : "melody",
                      character: role === "host" ? "kitty" : "melody",
                      name: role === "host" ? "Nancy" : "My Melody",
                    }
                  : {}),
                gesture: { id: 0, kind: "wave" },
                disconnectedAt: 0,
              }
            : null;
        rooms.set(r.id, {
          id: r.id,
          createdAt: r.createdAt,
          hostHash: r.hostHash,
          guestHash: r.guestHash || null,
          invite: r.invite,
          host: restore(r.host, "host"),
          guest: restore(r.guest, "guest"),
          revision: 0,
          chat: Array.isArray(r.chat)
            ? r.chat.slice(-20).map((m) => ({
                id: text(m.id, 60),
                role: m.role === "guest" ? "guest" : "host",
                name: text(m.name, 24),
                text: text(m.text, 240),
              }))
            : [],
          picnic: [0, 1, 2].map((i) => r.picnic?.[i] === true),
          garden: [0, 1, 2].map((i) => r.garden?.[i] === true),
        });
      }
    } catch (e) {
      if (e.code !== "ENOENT")
        console.error(
          "A visit checkpoint could not be read; starting with fresh visits.",
        );
    }
  }
  function prune() {
    for (const [id, r] of rooms)
      if (now() - r.createdAt > expires) {
        for (const a of [r.host, r.guest])
          a?.socket?.close(1000, "This invitation has ended.");
        rooms.delete(id);
      }
  }
  function response(res, status, body, origin) {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      Vary: "Origin",
      ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
    });
    res.end(JSON.stringify(body));
  }
  const server = createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(
        "Nancy’s private village visit service is ready.\nPlay the game at https://hmlim123.github.io/hellokittygame/\n",
      );
      return;
    }
    if (req.method === "GET" && req.url === "/health") {
      response(
        res,
        200,
        {
          ok: true,
          protocol: 1,
          ...(accounts ? { privateAccounts: true } : {}),
        },
        allowed.has(origin) ? origin : null,
      );
      return;
    }
    if (!allowed.has(origin)) {
      response(res, 403, {
        error: "This game address is not connected to the visit service.",
      });
      return;
    }
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "600",
        Vary: "Origin",
      });
      res.end();
      return;
    }
    const accountToken = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : "";
    if (
      accounts &&
      req.url?.startsWith("/account") &&
      (req.method === "POST" ||
        (req.method === "GET" && req.url === "/account"))
    ) {
      try {
        let body = "",
          bytes = 0;
        for await (const part of req) {
          bytes += part.length;
          if (bytes > 4096)
            throw Object.assign(Error("That request is too large."), {
              status: 413,
            });
          body += part.toString();
        }
        const result = await accounts.handle(
          req.url,
          accountToken,
          JSON.parse(body || "{}"),
          req.socket.remoteAddress,
        );
        response(res, 200, result, origin);
        if (req.url === "/account/logout" || req.url === "/account/login")
          for (const ws of wss.clients)
            if (ws.accountSession && !accounts.authenticate(ws.accountSession))
              ws.close(1008, "Sign-in ended");
      } catch (error) {
        response(
          res,
          error.status || 400,
          {
            error: error.status
              ? error.message
              : "The account request could not be completed.",
          },
          origin,
        );
      }
      return;
    }
    const identity = accounts?.authenticate(accountToken);
    if (accounts && req.url === "/rooms" && identity?.id !== "nancy") {
      response(
        res,
        401,
        { error: "Sign in as Nancy to open her village." },
        origin,
      );
      return;
    }
    if (req.url !== "/rooms" || req.method !== "POST") {
      response(res, 404, { error: "Not found" }, origin);
      return;
    }
    prune();
    const ip = req.socket.remoteAddress || "unknown",
      rate = creationRates.get(ip) || [];
    const recent = rate.filter((t) => now() - t < 600000);
    creationRates.set(ip, recent);
    if (recent.length >= 5 || rooms.size >= maxRooms) {
      response(
        res,
        429,
        { error: "The village is busy. Please try again in a little while." },
        origin,
      );
      return;
    }
    let bytes = 0,
      body = "";
    try {
      for await (const part of req) {
        bytes += part.length;
        if (bytes > 4096) throw Error("large");
        body += part.toString();
      }
      const input = JSON.parse(body || "{}");
      const secret = token(),
        invite = token(),
        id = randomBytes(8).toString("hex");
      const room = {
        id,
        createdAt: now(),
        hostHash: hash(secret),
        guestHash: null,
        invite,
        host: {
          ...actor(
            "host",
            identity?.name || input.name,
            input.appearance,
            input.position,
          ),
          ...(identity
            ? { profile: identity.id, character: identity.character }
            : {}),
        },
        guest: null,
        revision: 0,
        chat: [],
        picnic: [false, false, false],
        garden: [0, 1, 2].map((i) => input.garden?.[i] === true),
      };
      if (accounts)
        for (const previous of rooms.values()) {
          if (previous.host.profile !== identity.id) continue;
          rooms.delete(previous.id);
          for (const a of [previous.host, previous.guest]) {
            send(a?.socket, { type: "ended" });
            a?.socket?.close(1000, "Nancy opened a new invitation.");
          }
        }
      rooms.set(id, room);
      recent.push(now());
      dirty();
      response(
        res,
        201,
        { roomId: id, token: secret, role: "host", invite },
        origin,
      );
    } catch {
      response(
        res,
        400,
        {
          error:
            bytes > 4096
              ? "That invitation request is too large."
              : "The invitation could not be created.",
        },
        origin,
      );
    }
  });
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 4096,
    perMessageDeflate: false,
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 15000;
  server.on("upgrade", (req, socket, head) => {
    if (req.url !== "/visit" || !allowed.has(req.headers.origin)) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) =>
      wss.emit("connection", ws, req),
    );
  });
  wss.on("connection", (ws) => {
    ws.alive = true;
    let room = null,
      player = null,
      bucket = 25,
      lastBucket = now(),
      connection = { chats: [] },
      accountSession = null;
    const helloTimer = setTimeout(() => {
      if (!player) ws.close(1008, "Please join with an invitation.");
    }, 8000);
    helloTimer.unref();
    ws.on("pong", () => {
      ws.alive = true;
    });
    const fail = (message) => send(ws, { type: "error", message });
    ws.on("message", (bytes, binary) => {
      if (binary) {
        ws.close(1003, "Text messages only.");
        return;
      }
      bucket = Math.min(25, bucket + Math.max(0, now() - lastBucket) * 0.02);
      lastBucket = now();
      if (bucket < 1) {
        ws.close(1008, "Too many messages.");
        return;
      }
      bucket--;
      let m;
      try {
        m = JSON.parse(bytes.toString());
      } catch {
        ws.close(1008, "That message could not be read.");
        return;
      }
      if (!m || typeof m !== "object" || Array.isArray(m)) {
        ws.close(1008, "Invalid message.");
        return;
      }
      if (accounts) {
        const identity = accounts.authenticate(
          player ? accountSession : m.accountToken,
        );
        if (!identity || (player && player.profile !== identity.id)) {
          fail("Please sign in again to continue your private visit.");
          ws.close(1008, "Sign-in required");
          return;
        }
        if (!player) accountSession = m.accountToken;
      }
      if (!player) {
        if (
          !["hello", "join"].includes(m.type) ||
          typeof m.roomId !== "string"
        ) {
          ws.close(1008, "Please use your invitation.");
          return;
        }
        prune();
        room = rooms.get(m.roomId);
        if (!room) {
          fail("This visit has ended. Ask for a fresh invitation.");
          ws.close(1008, "Visit ended");
          return;
        }
        const identity = accounts?.authenticate(accountSession);
        let secret = m.token;
        if (m.type === "join") {
          if (accounts && identity.id !== "melody") {
            ws.close(
              1008,
              "My Melody’s account is required for this invitation.",
            );
            return;
          }
          if (!equal(m.invite, hash(room.invite))) {
            ws.close(1008, "This invitation is not valid.");
            return;
          }
          if (
            room.guest &&
            (room.guest.socket ||
              (now() - room.guest.disconnectedAt < 90000 &&
                room.guest.disconnectedAt > 0))
          ) {
            fail(
              "This village already has a visitor. Try again when their visit ends.",
            );
            ws.close(1008, "Village full");
            return;
          }
          secret = token();
          room.guestHash = hash(secret);
          const offsets = [
            [-1.5, 0],
            [1.5, 0],
            [0, 1.5],
            [0, -1.5],
            [0, 0],
          ];
          const offset = offsets.find(([x, z]) =>
            villageWalkable(room.host.x + x, room.host.z + z),
          ) || [0, 0];
          room.guest = actor("guest", identity?.name || m.name, m.appearance, {
            x: room.host.x + offset[0],
            z: room.host.z + offset[1],
          });
          if (identity)
            Object.assign(room.guest, {
              profile: identity.id,
              character: identity.character,
            });
        }
        player = equal(secret, room.hostHash)
          ? room.host
          : equal(secret, room.guestHash)
            ? room.guest
            : null;
        if (!player || (accounts && player.profile !== identity.id)) {
          player = null;
          ws.close(1008, "This visit ticket is not valid.");
          return;
        }
        if (player.socket && player.socket !== ws)
          player.socket.close(1000, "Your visit moved to another window.");
        ws.accountSession = accountSession;
        player.socket = ws;
        player.disconnectedAt = 0;
        player.budget = 1.5;
        player.lastMove = now();
        clearTimeout(helloTimer);
        send(ws, {
          type: "welcome",
          roomId: room.id,
          token: secret,
          role: player.id,
          ...(player.id === "host" ? { invite: room.invite } : {}),
          you: publicActor(player),
        });
        broadcast(room);
        dirty();
        return;
      }
      if (player.socket !== ws) return;
      applyVisitAction({
        room,
        player,
        m,
        now,
        connection,
        send,
        broadcast,
        dirty,
        fail,
        ws,
        endRoom: (id) => rooms.delete(id),
      });
    });
    ws.on("error", () => {});
    ws.on("close", () => {
      clearTimeout(helloTimer);
      if (player && player.socket === ws) {
        player.socket = null;
        player.speed = 0;
        player.disconnectedAt = now();
        broadcast(room);
        dirty();
      }
    });
  });
  const heartbeat = setInterval(() => {
    prune();
    for (const ws of wss.clients) {
      if (
        accounts &&
        ws.accountSession &&
        !accounts.authenticate(ws.accountSession)
      ) {
        ws.close(1008, "Sign-in expired");
        continue;
      }
      if (!ws.alive) {
        ws.terminate();
        continue;
      }
      ws.alive = false;
      ws.ping();
    }
  }, 20000);
  heartbeat.unref();
  return {
    server,
    rooms,
    listen: (port = 0, host = "127.0.0.1") =>
      new Promise((resolve) =>
        server.listen(port, host, () => resolve(server.address())),
      ),
    async close() {
      clearInterval(heartbeat);
      clearTimeout(saveTimer);
      for (const ws of wss.clients) ws.terminate();
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (storeFile) save();
      await new Promise((resolve) => wss.close(() => server.close(resolve)));
    },
  };
}
