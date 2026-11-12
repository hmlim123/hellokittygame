import { beginGuestSession, endGuestSession } from "./guest-session";
import { accountSession, useAccounts } from "./accounts";
import { create } from "zustand";
import { useEffect, useRef } from "react";
import { useGameStore } from "./store";
import { useVillageMotion } from "./village-motion";
import { villageWalkable, villagePath } from "./village";
import type { OutfitId, PlushId, Gesture, ItemId } from "./types";
export interface VisitPlayer {
  id: "host" | "guest";
  name: string;
  profile?: "nancy" | "melody";
  character?: "kitty" | "melody";
  x: number;
  z: number;
  yaw: number;
  speed: number;
  connected: boolean;
  area?: string;
  holding?: "parcel" | "cup" | null;
  tool?: "watering" | null;
  appearance: { outfit: OutfitId; plush: PlushId | null; item?: ItemId };
  gesture: { id: number; kind: Gesture };
}
interface Invitation {
  server: string;
  roomId: string;
  invite: string;
}
interface Ticket {
  server: string;
  roomId: string;
  token: string;
  role: "host" | "guest";
}
interface ChatLine {
  id: string;
  role: string;
  name: string;
  text: string;
}
interface Visits {
  status: "idle" | "connecting" | "online" | "reconnecting" | "ended" | "error";
  server: string;
  role: "host" | "guest" | null;
  roomId: string | null;
  invitation: Invitation | null;
  link: string;
  players: VisitPlayer[];
  chat: ChatLine[];
  picnic: boolean[];
  garden: boolean[];
  error: string;
  configure(url: string): boolean;
  host(name: string): Promise<void>;
  join(name: string, link?: string): void;
  leave(): void;
  sendChat(text: string): void;
  gesture(kind: Gesture): void;
  placePicnic(slot: number): void;
}
export function visitServerUrl(
  input: string,
  gameOrigin = typeof location === "undefined" ? "" : location.origin,
) {
  try {
    const u = new URL(input.trim()),
      game = new URL(gameOrigin || "https://hmlim123.github.io");
    if (
      u.username ||
      u.password ||
      u.search ||
      u.hash ||
      !["", "/"].includes(u.pathname)
    )
      return "";
    const configured = import.meta.env.VITE_VISITS_URL || "";
    const render =
      u.protocol === "https:" && u.hostname.endsWith(".onrender.com");
    const cloudflare =
      u.protocol === "https:" && u.hostname.endsWith(".workers.dev");
    const local =
      ["localhost", "127.0.0.1"].includes(game.hostname) &&
      ["localhost", "127.0.0.1"].includes(u.hostname) &&
      u.protocol === "http:";
    const custom =
      configured &&
      u.origin === new URL(configured).origin &&
      u.protocol === "https:";
    return render || cloudflare || local || custom ? u.origin : "";
  } catch {
    return "";
  }
}
export function parseVisitLink(
  value: string,
  gameOrigin?: string,
): Invitation | null {
  try {
    const hash = value.includes("#") ? new URL(value).hash : value;
    const encoded = hash.replace(/^#?visit=/, "");
    if (encoded.length > 2000) return null;
    const data = JSON.parse(
        atob(encoded.replace(/-/g, "+").replace(/_/g, "/")),
      ),
      server = visitServerUrl(data.server, gameOrigin);
    return server &&
      /^[0-9a-f]{16}$/.test(data.roomId) &&
      /^[A-Za-z0-9_-]{43}$/.test(data.invite)
      ? { server, roomId: data.roomId, invite: data.invite }
      : null;
  } catch {
    return null;
  }
}
function savedServer() {
  try {
    return visitServerUrl(
      import.meta.env.VITE_VISITS_URL ||
        localStorage.getItem("kitty-visits-server-v1") ||
        "",
    );
  } catch {
    return "";
  }
}
let socket: WebSocket | null = null,
  ticket: Ticket | null = null,
  generation = 0,
  retries = 0,
  timer: ReturnType<typeof setTimeout> | undefined,
  movement: ReturnType<typeof setInterval> | undefined;
function rememberTicket(value: Ticket | null) {
  ticket = value;
  try {
    if (value)
      sessionStorage.setItem("kitty-private-visit-v1", JSON.stringify(value));
    else sessionStorage.removeItem("kitty-private-visit-v1");
  } catch {}
}
const transmit = (value: object) => {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(value));
};
function restorePersonalSave() {
  endGuestSession((original) => useGameStore.setState(original));
}
function stopTransport() {
  generation++;
  clearTimeout(timer);
  clearInterval(movement);
  if (socket) {
    const old = socket;
    socket = null;
    old.close();
  }
}
export function invitationLink(
  invite: Invitation,
  pageAddress = location.href,
) {
  const base = new URL(import.meta.env.BASE_URL, pageAddress),
    url = new URL("adventure.html", base);
  url.hash =
    "visit=" +
    btoa(
      JSON.stringify({
        server: invite.server,
        roomId: invite.roomId,
        invite: invite.invite,
      }),
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return url.href;
}
function connect(server: string, hello: object) {
  stopTransport();
  const epoch = generation;
  const ws = new WebSocket(server.replace(/^http/, "ws") + "/visit");
  socket = ws;
  const handshake = setTimeout(() => {
    if (epoch === generation && useVisitsStore.getState().status !== "online")
      ws.close();
  }, 25000);
  ws.onopen = () => {
    if (epoch === generation)
      ws.send(
        JSON.stringify({
          ...hello,
          ...(accountSession(server)
            ? { accountToken: accountSession(server)!.token }
            : {}),
        }),
      );
  };
  ws.onmessage = (event) => {
    if (
      epoch !== generation ||
      typeof event.data !== "string" ||
      event.data.length > 30000
    )
      return;
    let m;
    try {
      m = JSON.parse(event.data);
    } catch {
      return;
    }
    if (m.type === "welcome") {
      if (
        !["host", "guest"].includes(m.role) ||
        !/^[A-Za-z0-9_-]{43}$/.test(m.token) ||
        !/^[0-9a-f]{16}$/.test(m.roomId) ||
        !villageWalkable(m.you?.x, m.you?.z) ||
        !Number.isFinite(m.you.yaw)
      )
        return;
      clearTimeout(handshake);
      retries = 0;
      rememberTicket({
        server,
        roomId: m.roomId,
        token: m.token,
        role: m.role,
      });
      useVisitsStore.setState({
        status: "online",
        server,
        role: m.role,
        roomId: m.roomId,
        error: "",
        link:
          m.role === "host" && m.invite
            ? invitationLink({ server, roomId: m.roomId, invite: m.invite })
            : "",
      });
      const game = useGameStore.getState();
      if (m.role === "guest") beginGuestSession(game);
      else restorePersonalSave();
      game.enterVillage();
      if (m.role === "host")
        game.saveVillagePosition(m.you.x, m.you.z, m.you.yaw);
      useVillageMotion.setState({
        position: { x: m.you.x, z: m.you.z },
        yaw: m.you.yaw,
        relocate: { x: m.you.x, z: m.you.z, yaw: m.you.yaw },
        guestVisit: m.role === "guest",
        guestName:
          typeof m.you.name === "string"
            ? m.you.name.slice(0, 24)
            : "Your friend",
        input: { x: 0, z: 0 },
        path: [],
        pending: null,
      });
      game.openPanel("visits");
      if (location.hash.startsWith("#visit="))
        history.replaceState({}, "", location.pathname + location.search);
      let lastMovementKey = "",
        lastMovementAt = 0;
      movement = setInterval(() => {
        if (epoch !== generation) return;
        const motion = useVillageMotion.getState(),
          g = useGameStore.getState();
        const packet = {
          type: "move",
          x: motion.position.x,
          z: motion.position.z,
          yaw: motion.yaw,
          area:
            g.mode === "village"
              ? "village"
              : g.mode === "room"
                ? "home"
                : "story",
          holding:
            g.cozy.cookie.packed || performance.now() < motion.givingUntil
              ? "parcel"
              : motion.picnic
                ? "cup"
                : null,
          tool: g.effect?.kind === "water" ? "watering" : null,
        };
        // A final stop is sent immediately, even when the final position did not
        // change. Idle players need only a quiet keepalive, allowing hibernation.
        const key = JSON.stringify([packet, motion.speed > 0.05]);
        if (key === lastMovementKey && Date.now() - lastMovementAt < 15000)
          return;
        lastMovementKey = key;
        lastMovementAt = Date.now();
        transmit(packet);
      }, 100);
    } else if (m.type === "state") {
      if (
        !Array.isArray(m.players) ||
        m.players.length > 2 ||
        new Set(m.players.map((p: VisitPlayer) => p?.id)).size !==
          m.players.length ||
        m.players.some(
          (p: VisitPlayer) =>
            !p ||
            !["host", "guest"].includes(p.id) ||
            !villageWalkable(p.x, p.z) ||
            ![p.yaw, p.speed].every(Number.isFinite) ||
            typeof p.name !== "string" ||
            p.name.length > 24 ||
            !p.appearance ||
            ![
              "classic",
              "sailor",
              "picnic",
              "moonlight",
              "berry",
              "blossom",
            ].includes(p.appearance.outfit) ||
            !p.gesture ||
            ![
              "wave",
              "dance",
              "softHappy",
              "bow",
              "sip",
              "handoff",
              "present",
            ].includes(p.gesture.kind),
        )
      )
        return;
      const wasReady = useVisitsStore.getState().picnic.every(Boolean),
        picnic = [0, 1, 2].map((i) => m.picnic?.[i] === true),
        garden = [0, 1, 2].map((i) => m.garden?.[i] === true);
      useVisitsStore.setState({
        players: m.players,
        chat: Array.isArray(m.chat)
          ? m.chat
              .slice(-20)
              .filter(
                (line: ChatLine) =>
                  line &&
                  typeof line.name === "string" &&
                  typeof line.text === "string" &&
                  typeof line.id === "string",
              )
              .map((line: ChatLine) => ({
                ...line,
                name: line.name.slice(0, 24),
                text: line.text.slice(0, 240),
              }))
          : [],
        picnic,
        garden,
      });
      if (useVisitsStore.getState().role === "host") {
        const game = useGameStore.getState(),
          v = game.cozy.village,
          flowers = v.flowers.map((value, i) => value || garden[i]);
        if (flowers.some((value, i) => value !== v.flowers[i]))
          useGameStore.setState({
            cozy: { ...game.cozy, village: { ...v, flowers } },
          });
      }
      if (!wasReady && picnic.every(Boolean))
        useGameStore
          .getState()
          .react(
            "softHappy",
            "Your picnic is ready. A little moment made together. ♡",
          );
    } else if (m.type === "correction" && villageWalkable(m.x, m.z)) {
      // A server correction settles the position, but a tapped destination
      // should still be reached. Replan from the accepted position instead of
      // silently cancelling the walk when packets straddle an obstacle corner.
      const motion = useVillageMotion.getState(),
        target = motion.path.at(-1),
        path = target ? villagePath({ x: m.x, z: m.z }, target) : [];
      useVillageMotion.setState({
        relocate: { x: m.x, z: m.z, yaw: m.yaw },
        input: { x: 0, z: 0 },
        path,
        pending: path.length ? motion.pending : null,
      });
    } else if (m.type === "error")
      useVisitsStore.setState({ error: String(m.message).slice(0, 250) });
    else if (m.type === "ended") {
      stopTransport();
      rememberTicket(null);
      restorePersonalSave();
      useVillageMotion.setState({ guestVisit: false });
      useVisitsStore.setState({
        status: "ended",
        players: [],
        link: "",
        invitation: null,
        role: null,
        roomId: null,
        error: "This visit has ended. Your own home and memories are safe.",
      });
      useGameStore
        .getState()
        .react(
          "wave",
          "This private visit has ended. Your own home and memories are safe. ♡",
        );
    }
  };
  ws.onerror = () => {};
  ws.onclose = (event) => {
    if (
      epoch === generation &&
      ["Sign-in ended", "Sign-in required", "Sign-in expired"].includes(
        event.reason,
      )
    ) {
      useAccounts.getState().expire();
      useVisitsStore.setState({
        error: "Your sign-in ended. Sign in again to meet together.",
      });
    }
    clearTimeout(handshake);
    if (epoch !== generation) return;
    clearInterval(movement);
    if (ticket && ![1000, 1008].includes(event.code) && retries < 7) {
      useVisitsStore.setState({ status: "reconnecting" });
      const current = ticket;
      timer = setTimeout(
        () => {
          retries++;
          connect(current.server, {
            type: "hello",
            roomId: current.roomId,
            token: current.token,
          });
        },
        Math.min(10000, 700 * 2 ** retries),
      );
    } else {
      rememberTicket(null);
      restorePersonalSave();
      useVillageMotion.setState({ guestVisit: false });
      useVisitsStore.setState({
        status: "ended",
        players: [],
        invitation: null,
        role: null,
        roomId: null,
        link: "",
        error:
          useVisitsStore.getState().error ||
          "This visit is closed. You can keep enjoying your village or open a fresh invitation.",
      });
    }
  };
}
export const useVisitsStore = create<Visits>((set, get) => ({
  status: "idle",
  server: savedServer(),
  role: null,
  roomId: null,
  invitation: null,
  link: "",
  players: [],
  chat: [],
  picnic: [false, false, false],
  garden: [false, false, false],
  error: "",
  configure(input) {
    const server = visitServerUrl(input);
    if (!server) {
      set({
        error:
          "Use your HTTPS village service address, for example https://nancy-village-free.your-name.workers.dev.",
      });
      return false;
    }
    try {
      localStorage.setItem("kitty-visits-server-v1", server);
    } catch {}
    set({ server, error: "" });
    return true;
  },
  async host(name) {
    const server = get().server;
    if (!server) {
      set({ error: "The private visit service needs to be connected first." });
      return;
    }
    stopTransport();
    rememberTicket(null);
    retries = 0;
    set({
      status: "connecting",
      error: "",
      link: "",
      players: [],
      chat: [],
      invitation: null,
    });
    const epoch = generation;
    const state = useGameStore.getState(),
      position = useVillageMotion.getState().position;
    const request = new AbortController(),
      deadline = setTimeout(() => request.abort(), 90000);
    try {
      const response = await fetch(server + "/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accountSession(server)
            ? { Authorization: "Bearer " + accountSession(server)!.token }
            : {}),
        },
        body: JSON.stringify({
          name: name.trim().slice(0, 24) || "Nancy",
          appearance: state.equipment,
          garden: state.cozy.village.flowers,
          position:
            state.mode === "village"
              ? { ...position, yaw: useVillageMotion.getState().yaw }
              : state.cozy.village,
        }),
        signal: request.signal,
      });
      const data = await response.json();
      if (epoch !== generation) return;
      if (!response.ok)
        throw Error(data.error || "The village could not be opened.");
      rememberTicket({
        server,
        roomId: data.roomId,
        token: data.token,
        role: "host",
      });
      connect(server, {
        type: "hello",
        roomId: data.roomId,
        token: data.token,
      });
    } catch (e) {
      if (epoch === generation)
        set({
          status: "error",
          error:
            e instanceof Error
              ? e.message
              : "The village could not connect. Please try again.",
        });
    } finally {
      clearTimeout(deadline);
    }
  },
  join(name, link) {
    const invite = link ? parseVisitLink(link) : get().invitation;
    if (!invite) {
      set({ error: "Paste the complete private invitation link." });
      return;
    }
    stopTransport();
    rememberTicket(null);
    retries = 0;
    set({
      status: "connecting",
      error: "",
      players: [],
      chat: [],
      link: "",
      server: invite.server,
    });
    connect(invite.server, {
      type: "join",
      roomId: invite.roomId,
      invite: invite.invite,
      name: name.trim().slice(0, 24) || "Your friend",
      appearance: useGameStore.getState().equipment,
    });
  },
  leave() {
    restorePersonalSave();
    useVillageMotion.setState({ guestVisit: false });
    transmit({ type: get().role === "host" ? "end" : "leave" });
    stopTransport();
    rememberTicket(null);
    set({
      status: "idle",
      role: null,
      roomId: null,
      players: [],
      chat: [],
      link: "",
      invitation: null,
      error: "",
    });
  },
  sendChat(line) {
    const value = line.trim();
    if (value && get().status === "online")
      transmit({ type: "chat", text: value.slice(0, 240) });
  },
  gesture(kind) {
    if (get().status === "online") useGameStore.getState().react(kind);
  },
  placePicnic(slot) {
    if (get().status === "online") transmit({ type: "picnic", slot });
  },
}));
export function useVisitLifecycle() {
  const started = useRef(false);
  useEffect(() => {
    if (!started.current) {
      started.current = true;
      const preset = new URL(location.href).searchParams.get("visits");
      if (preset && visitServerUrl(preset))
        useVisitsStore.getState().configure(preset);
      if (location.hash.startsWith("#account=")) {
        const accountInvite = parseAccountLink(location.href);
        if (accountInvite) {
          useVisitsStore.getState().configure(accountInvite.server);
          useAccounts.setState({ pendingInvite: accountInvite.invite });
          if (accountInvite.visit)
            useVisitsStore.setState({
              invitation: {
                server: accountInvite.server,
                ...accountInvite.visit,
              },
            });
          useGameStore.getState().enterVillage();
          useGameStore.getState().openPanel("visits");
        }
      }
      const invite = location.hash.startsWith("#visit=")
        ? parseVisitLink(location.href)
        : null;
      if (invite) {
        useVisitsStore.setState({ invitation: invite });
        useGameStore.getState().enterVillage();
        useGameStore.getState().openPanel("visits");
      } else if (!location.hash.startsWith("#account=")) {
        try {
          const saved = JSON.parse(
            sessionStorage.getItem("kitty-private-visit-v1") || "null",
          );
          if (
            saved &&
            visitServerUrl(saved.server) &&
            /^[0-9a-f]{16}$/.test(saved.roomId) &&
            /^[A-Za-z0-9_-]{43}$/.test(saved.token)
          ) {
            rememberTicket(saved);
            useVisitsStore.setState({
              status: "reconnecting",
              server: saved.server,
            });
            connect(saved.server, {
              type: "hello",
              roomId: saved.roomId,
              token: saved.token,
            });
          }
        } catch {}
      }
    }
    const off = useGameStore.subscribe((s, prev) => {
      if (useVisitsStore.getState().status !== "online") return;
      if (s.equipment !== prev.equipment)
        transmit({ type: "appearance", appearance: s.equipment });
      if (
        s.mode === "village" &&
        s.effect?.id !== prev.effect?.id &&
        s.effect?.kind === "water"
      )
        transmit({
          type: "water",
          index: Math.round((s.effect.at[0] - 4) / 2),
        });
      if (
        s.mode === "village" &&
        s.gesture.id !== prev.gesture.id &&
        [
          "wave",
          "dance",
          "softHappy",
          "bow",
          "sip",
          "handoff",
          "present",
        ].includes(s.gesture.kind)
      )
        transmit({ type: "gesture", kind: s.gesture.kind });
    });
    return off;
  }, []);
}

export function accountInvitationLink(
  server: string,
  invite: string,
  visit?: Invitation | null,
  base = location.href,
) {
  const url = new URL(import.meta.env.BASE_URL + "adventure.html", base);
  url.search = "";
  url.hash =
    "account=" +
    btoa(
      JSON.stringify({
        server,
        invite,
        ...(visit
          ? { visit: { roomId: visit.roomId, invite: visit.invite } }
          : {}),
      }),
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return url.href;
}
export function parseAccountLink(
  input: string,
  origin = location.origin,
): {
  server: string;
  invite: string;
  visit?: Omit<Invitation, "server">;
} | null {
  try {
    const part = new URL(input, origin).hash;
    if (!part.startsWith("#account=") || part.length > 2200) return null;
    const value = JSON.parse(
      atob(part.slice(9).replace(/-/g, "+").replace(/_/g, "/")),
    );
    const server = visitServerUrl(value.server, origin);
    if (!server || !/^[A-Za-z0-9_-]{43}$/.test(value.invite)) return null;
    if (
      value.visit &&
      (!/^[0-9a-f]{16}$/.test(value.visit.roomId) ||
        !/^[A-Za-z0-9_-]{43}$/.test(value.visit.invite))
    )
      return null;
    return {
      server,
      invite: value.invite,
      ...(value.visit
        ? { visit: { roomId: value.visit.roomId, invite: value.visit.invite } }
        : {}),
    };
  } catch {
    return null;
  }
}
