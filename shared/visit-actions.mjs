import { randomBytes } from "node:crypto";
import {
  VILLAGE_ACTIONS,
  VILLAGE_PICNIC,
  villageWalkable,
  moveVillage,
  villagePath,
} from "./village-world.mjs";
import { text, appearance, yaw } from "./visit-actors.mjs";
import {
  atPostcardStop,
  nextPostcardStop,
  newPostcardWalk,
  postcardStop,
} from "./postcard-walk.mjs";
import { atLanternPlaza, lanternColor, newLanternEvening } from "./lantern-evening.mjs";

const newTogetherMoment = () => ({
  id: 0,
  action: "wave",
  at: 0,
  weather: "sunshine",
  baking: "mix",
  pose: "wave",
});

const togetherActions = [
  "wave", "highfive", "celebrate", "stir", "decorate", "present",
  "photo", "cancel", "sunshine", "sunset", "rain",
];
export function restoreTogetherMoment(value) {
  if (
    !value ||
    !Number.isSafeInteger(value.id) ||
    value.id < 0 ||
    !Number.isFinite(value.at) ||
    !togetherActions.includes(value.action) ||
    !["sunshine", "sunset", "rain"].includes(value.weather) ||
    !["mix", "decorate", "ready"].includes(value.baking) ||
    !["wave", "lean", "still"].includes(value.pose)
  )
    return null;
  const { id, action, at, weather, baking, pose } = value;
  return { id, action, at, weather, baking, pose };
}

function bothInVillage(room) {
  return room.host?.socket?.readyState === 1 &&
    room.guest?.socket?.readyState === 1 &&
    room.host.area === "village" &&
    room.guest.area === "village";
}

/** One authoritative action implementation for both Node and free Cloudflare hosting. */
export function applyVisitAction({
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
  endRoom,
}) {
  if (m.type === "together") {
    const both =
      room.host?.socket?.readyState === 1 &&
      room.guest?.socket?.readyState === 1;
    if (!both) {
      fail("Wait until you are both here before starting together.");
      return;
    }
    if (!togetherActions.includes(m.action)) return;
    const previous = room.together ?? newTogetherMoment();
    if (m.revision !== previous.id) {
      fail("Your shared activity changed. Try again.");
      return;
    }
    if (["stir", "decorate", "present"].includes(m.action)) {
      const expected = {
        stir: ["host", "mix"],
        decorate: ["guest", "decorate"],
        present: ["host", "ready"],
      }[m.action];
      if (player.id !== expected[0] || previous.baking !== expected[1]) {
        fail("Follow your partner’s baking step first.");
        return;
      }
    }
    if (
      previous.action !== "cancel" &&
      now() <
        previous.at +
          (previous.action === "stir" || previous.action === "decorate"
            ? 4000
            : 3000) &&
      !["cancel", "sunshine", "sunset", "rain"].includes(m.action)
    ) {
      fail("Let this little moment finish first.");
      return;
    }
    const weather = ["sunshine", "sunset", "rain"].includes(m.action);
    room.together = {
      ...previous,
      id: previous.id + 1,
      action: weather ? previous.action : m.action,
      at: weather ? previous.at : now() + 400,
      weather: weather ? m.action : previous.weather,
      baking:
        m.action === "stir"
          ? "decorate"
          : m.action === "decorate"
            ? "ready"
            : m.action === "present"
              ? "mix"
              : previous.baking,
      pose:
        m.action === "photo" && ["wave", "lean", "still"].includes(m.pose)
          ? m.pose
          : previous.pose,
    };
    if (m.action === "present") room.picnic[1] = true;
    broadcast(room);
    dirty();
  } else if (m.type === "postcard-walk") {
    if (!bothInVillage(room)) {
      fail("Come back to the village together to continue your postcard.");
      return;
    }
    const walk = room.postcardWalk ?? newPostcardWalk();
    if (m.revision !== walk.revision) {
      fail("Your postcard changed. Check the current stop and try again.");
      return;
    }
    const role = player.id;
    if (role !== "host" && role !== "guest") return;

    let next;
    if (m.action === "choose") {
      const stop = postcardStop(m.stop);
      if (!stop || (walk.host && walk.guest)) return;
      const partner = role === "host" ? walk.guest : walk.host;
      if (stop.id === partner) {
        fail("Choose a different stop so your postcard has two stamps.");
        return;
      }
      if (stop.id === walk[role]) return;
      next = { ...walk, [role]: stop.id };
    } else if (m.action === "stamp") {
      const stop = nextPostcardStop(walk);
      if (!stop || stop.id !== m.stop) return;
      if (![room.host, room.guest].every((actor) => atPostcardStop(actor, stop))) {
        fail("Walk to this stop together before adding its stamp.");
        return;
      }
      const stamps = walk.stamps + 1;
      next = { ...walk, stamps, completedAt: stamps === 2 ? now() : null };
    } else if (m.action === "reset") {
      if (role !== "host" || walk.stamps !== 2) return;
      next = newPostcardWalk();
    } else return;

    room.postcardWalk = { ...next, revision: walk.revision + 1 };
    broadcast(room);
    dirty();
  } else if (m.type === "lantern-evening") {
    if (!bothInVillage(room)) {
      fail("Come back to the village together to light your lanterns.");
      return;
    }
    const evening = room.lanternEvening ?? newLanternEvening();
    if (m.revision !== evening.revision) {
      fail("Your lanterns changed. Check the plaza and try again.");
      return;
    }
    const role = player.id;
    if (role !== "host" && role !== "guest") return;
    const lantern = evening[role];
    let next;

    if (m.action === "choose") {
      const color = lanternColor(m.color);
      if (!color || lantern.lit || color === lantern.color) return;
      next = { ...evening, [role]: { color, lit: false } };
    } else if (m.action === "light") {
      if (lantern.lit || !evening.host.color || !evening.guest.color) return;
      if (![room.host, room.guest].every(atLanternPlaza)) {
        fail("Meet your partner at the plaza before lighting the lanterns.");
        return;
      }
      next = { ...evening, [role]: { ...lantern, lit: true } };
      if (next.host.lit && next.guest.lit) {
        const previous = room.together ?? newTogetherMoment();
        room.together = { ...previous, id: previous.id + 1, weather: "sunset" };
      }
    } else if (m.action === "reset") {
      if (role !== "host" || !evening.host.lit || !evening.guest.lit) return;
      next = newLanternEvening();
    } else return;

    room.lanternEvening = { ...next, revision: evening.revision + 1 };
    broadcast(room);
    dirty();
  } else if (m.type === "move") {
    if (
      ![m.x, m.z, m.yaw].every(
        (v) => typeof v === "number" && Number.isFinite(v),
      )
    ) {
      fail("That step could not be followed.");
      return;
    }
    const t = now(),
      elapsed = Math.max(0, t - player.lastMove) / 1000;
    player.budget = Math.min(1.8, player.budget + elapsed * 3.4);
    player.lastMove = t;
    const distance = Math.hypot(m.x - player.x, m.z - player.z);
    if (distance > player.budget + 0.03 || !villageWalkable(m.x, m.z)) {
      send(ws, {
        type: "correction",
        x: player.x,
        z: player.z,
        yaw: player.yaw,
      });
      return;
    }
    let next = moveVillage(player, m.x - player.x, m.z - player.z),
      travelled = distance;
    if (Math.hypot(next.x - m.x, next.z - m.z) > 0.12) {
      // A packet can span a turn around a friend or a building corner.
      // Validate the reachable route, charging its full walking distance,
      // rather than treating the straight chord as a walk through a wall.
      const route = villagePath(player, m);
      let from = player;
      travelled = 0;
      for (const point of route) {
        travelled += Math.hypot(point.x - from.x, point.z - from.z);
        from = point;
      }
      if (!route.length || travelled > player.budget + 0.03) {
        send(ws, {
          type: "correction",
          x: player.x,
          z: player.z,
          yaw: player.yaw,
        });
        return;
      }
      next = { x: m.x, z: m.z };
    }
    player.budget = Math.max(0, player.budget - travelled);
    player.area = ["village", "home", "story"].includes(m.area)
      ? m.area
      : "village";
    player.holding = ["parcel", "cup"].includes(m.holding) ? m.holding : null;
    player.tool = m.tool === "watering" ? "watering" : null;
    player.speed =
      distance > 0.015 && player.area === "village"
        ? Math.min(2.8, travelled / Math.max(0.05, elapsed))
        : 0;
    player.x = next.x;
    player.z = next.z;
    player.yaw = yaw(m.yaw);
    broadcast(room);
    if (distance > 0.01) dirty();
  } else if (m.type === "appearance") {
    player.appearance = appearance(m.appearance);
    broadcast(room);
    dirty();
  } else if (m.type === "chat") {
    const line = text(m.text, 240);
    connection.chats = connection.chats.filter((t) => now() - t < 10000);
    if (!line) return;
    if (connection.chats.length >= 4) {
      fail("A little pause between messages, please.");
      return;
    }
    connection.chats.push(now());
    room.chat.push({
      id: randomBytes(8).toString("hex"),
      role: player.id,
      name: player.name,
      text: line,
    });
    room.chat = room.chat.slice(-20);
    broadcast(room);
    dirty();
  } else if (m.type === "gesture") {
    if (
      ![
        "wave",
        "dance",
        "softHappy",
        "bow",
        "sip",
        "handoff",
        "present",
      ].includes(m.kind)
    )
      return;
    // A new performance supersedes a stale inferred speed. Fresh movement
    // packets still interrupt it when the player actually walks away.
    player.speed = 0;
    player.gesture = { id: player.gesture.id + 1, kind: m.kind };
    broadcast(room);
  } else if (m.type === "water") {
    const bed = VILLAGE_ACTIONS.find((o) => o.id === "flowers" + m.index);
    if (
      !Number.isInteger(m.index) ||
      !bed ||
      player.area !== "village" ||
      Math.hypot(player.x - bed.x, player.z - bed.z) > 2.3
    ) {
      fail("Walk over to the flower bed first.");
      return;
    }
    if (!room.garden[m.index]) {
      room.garden[m.index] = true;
      broadcast(room);
      dirty();
    }
  } else if (m.type === "picnic") {
    if (!Number.isInteger(m.slot) || m.slot < 0 || m.slot > 2) return;
    if (!room.host.socket || !room.guest?.socket) {
      fail("Invite your friend before setting the picnic together.");
      return;
    }
    if (
      player.area !== "village" ||
      Math.hypot(player.x - VILLAGE_PICNIC.x, player.z - VILLAGE_PICNIC.z) > 2.5
    ) {
      fail("Walk over to the picnic table first.");
      return;
    }
    if (room.picnic[m.slot]) return;
    room.picnic[m.slot] = true;
    if (room.picnic.every(Boolean))
      for (const a of [room.host, room.guest])
        a.gesture = { id: a.gesture.id + 1, kind: "softHappy" };
    broadcast(room);
    dirty();
  } else if (m.type === "leave") {
    if (player.id !== "guest") return;
    room.guest = null;
    room.guestHash = null;
    send(ws, { type: "ended" });
    ws.close(1000, "You left the visit.");
    broadcast(room);
    dirty();
  } else if (m.type === "end") {
    if (player.id !== "host") {
      fail("Only the host can close this village visit.");
      return;
    }
    endRoom(room.id);
    for (const a of [room.host, room.guest]) {
      send(a?.socket, { type: "ended" });
      a?.socket?.close(1000, "The visit has ended.");
    }
    dirty();
  }
}
