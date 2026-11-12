import { create } from "zustand";
export interface AccountProfile {
  id: "nancy" | "melody";
  name: string;
  character: "kitty" | "melody";
  role: "host" | "guest";
}
interface Session {
  server: string;
  profile: AccountProfile;
  token: string;
  expires: number;
}
const key = "kitty-private-account-v1";
function saved(): Session | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || "null");
    if (
      value &&
      ["nancy", "melody"].includes(value.profile?.id) &&
      /^[A-Za-z0-9_-]{43}$/.test(value.token) &&
      value.expires > Date.now() &&
      typeof value.server === "string"
    )
      return value;
  } catch {}
  return null;
}
function remember(value: Session | null) {
  try {
    if (value) sessionStorage.setItem(key, JSON.stringify(value));
    else sessionStorage.removeItem(key);
  } catch {}
}
interface Accounts {
  session: Session | null;
  server: string;
  privateAccounts: boolean | null;
  initialized: boolean;
  melodyRegistered: boolean;
  pendingInvite: string;
  busy: boolean;
  error: string;
  inspect(server: string): Promise<void>;
  signIn(
    server: string,
    path: "setup" | "login" | "register",
    input: Record<string, string>,
  ): Promise<boolean>;
  invite(server: string): Promise<string>;
  logout(): Promise<void>;
  expire(): void;
}
let generation = 0;
export function accountSession(server: string): Session | null {
  const s = useAccounts.getState().session;
  return s && s.server === server && s.expires > Date.now() ? s : null;
}
interface AccountResponse {
  error?: string;
  privateAccounts?: boolean;
  initialized?: boolean;
  melodyRegistered?: boolean;
  profile?: AccountProfile | null;
  token?: string;
  expires?: number;
  invite?: string;
}
async function request(
  server: string,
  path: string,
  input?: Record<string, string>,
): Promise<AccountResponse> {
  const session = accountSession(server);
  const response = await fetch(server + "/account" + path, {
    method: input ? "POST" : "GET",
    headers: {
      ...(input ? { "Content-Type": "application/json" } : {}),
      ...(session ? { Authorization: "Bearer " + session.token } : {}),
    },
    body: input ? JSON.stringify(input) : undefined,
    signal: AbortSignal.timeout(90000),
    cache: "no-store",
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  const data: AccountResponse = await response.json();
  if (!data || typeof data !== "object")
    throw Error("The account response could not be verified.");
  if (!response.ok)
    throw Object.assign(
      Error(data.error || "The sign-in service could not connect."),
      { status: response.status },
    );
  return data;
}
export const useAccounts = create<Accounts>((set, get) => ({
  session: saved(),
  server: "",
  privateAccounts: null,
  initialized: false,
  melodyRegistered: false,
  pendingInvite: "",
  busy: false,
  error: "",
  async inspect(server) {
    const epoch = ++generation;
    set({ server, privateAccounts: null, error: "" });
    try {
      const data = await request(server, "");
      if (epoch !== generation) return;
      const session = accountSession(server);
      if (session && !data.profile) {
        remember(null);
        set({ session: null });
      }
      set({
        privateAccounts: data.privateAccounts === true,
        initialized: data.initialized === true,
        melodyRegistered: data.melodyRegistered === true,
      });
    } catch (e) {
      if (epoch !== generation) return;
      // Older ephemeral visit services stay compatible; production uses authenticated accounts.
      if (e instanceof Error && "status" in e && e.status === 404)
        set({ privateAccounts: false });
      else
        set({
          error:
            "The private service is waking up or unavailable. Try connecting again in a moment.",
        });
    }
  },
  async signIn(server, path, input) {
    if (get().busy) return false;
    set({ busy: true, error: "" });
    try {
      const data = await request(server, "/" + path, input);
      if (
        !data.profile ||
        !["nancy", "melody"].includes(data.profile.id) ||
        typeof data.token !== "string" ||
        !/^[A-Za-z0-9_-]{43}$/.test(data.token) ||
        typeof data.expires !== "number" ||
        !Number.isFinite(data.expires)
      )
        throw Error("The account response could not be verified.");
      const session = {
        server,
        profile: data.profile,
        token: data.token,
        expires: data.expires,
      };
      remember(session);
      set({
        session,
        initialized: true,
        pendingInvite: "",
        melodyRegistered: path === "register" || get().melodyRegistered,
      });
      if (location.hash.startsWith("#account="))
        history.replaceState({}, "", location.pathname + location.search);
      return true;
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Please try signing in again.",
      });
      return false;
    } finally {
      set({ busy: false });
    }
  },
  async invite(server) {
    if (get().busy) return "";
    set({ busy: true, error: "" });
    try {
      const data = await request(server, "/invite", {});
      if (
        typeof data.invite !== "string" ||
        !/^[A-Za-z0-9_-]{43}$/.test(data.invite)
      )
        throw Error("The invitation could not be verified.");
      return data.invite;
    } catch (e) {
      set({
        error:
          e instanceof Error ? e.message : "The invitation could not be made.",
      });
      return "";
    } finally {
      set({ busy: false });
    }
  },
  async logout() {
    if (get().busy) return;
    const session = get().session;
    set({ busy: true, error: "" });
    try {
      if (session) await request(session.server, "/logout", {});
      get().expire();
    } catch {
      set({
        error:
          "Sign-out could not reach the server. Please reconnect and try again.",
      });
    } finally {
      set({ busy: false });
    }
  },
  expire() {
    remember(null);
    set({ session: null });
  },
}));
