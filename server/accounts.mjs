import {
  randomBytes,
  createHash,
  timingSafeEqual,
  scrypt as derive,
} from "node:crypto";
import { promisify } from "node:util";
import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { dirname } from "node:path";

const scrypt = promisify(derive);
const token = () => randomBytes(32).toString("base64url");
const digest = (value) => createHash("sha256").update(value).digest("hex");
const matches = (value, hash) =>
  typeof value === "string" &&
  value.length <= 512 &&
  typeof hash === "string" &&
  /^[a-f0-9]{64}$/.test(hash) &&
  timingSafeEqual(Buffer.from(digest(value), "hex"), Buffer.from(hash, "hex"));
export const PROFILES = Object.freeze({
  nancy: { id: "nancy", name: "Nancy", character: "kitty", role: "host" },
  melody: {
    id: "melody",
    name: "My Melody",
    character: "melody",
    role: "guest",
  },
});
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
const lifetime = 7 * 86400000;

/** Exactly two invited accounts. Only salted password hashes and session hashes reach disk. */
export function createAccounts({ storeFile, setupKey, now = Date.now } = {}) {
  if (!storeFile || typeof setupKey !== "string" || setupKey.length < 32)
    throw Error(
      "Private accounts require a persistent ACCOUNT_STORE_FILE and an ACCOUNT_SETUP_KEY of at least 32 characters.",
    );
  let data = { version: 1, users: {}, sessions: [], invite: null };
  try {
    data = JSON.parse(readFileSync(storeFile, "utf8"));
    if (
      data.version !== 1 ||
      !data.users ||
      !Array.isArray(data.sessions) ||
      data.sessions.length > 2 ||
      new Set(data.sessions.map((s) => s.profile)).size !==
        data.sessions.length ||
      (data.invite !== null &&
        (!data.invite ||
          !/^[a-f0-9]{64}$/.test(data.invite.hash) ||
          !Number.isFinite(data.invite.expires))) ||
      (!data.users.nancy &&
        (data.users.melody || data.sessions.length || data.invite)) ||
      Object.keys(data.users).some((id) => !Object.hasOwn(PROFILES, id)) ||
      Object.values(data.users).some(
        (u) =>
          !/^[a-f0-9]{32}$/.test(u.salt) || !/^[a-f0-9]{128}$/.test(u.hash),
      ) ||
      data.sessions.some(
        (s) =>
          !Object.hasOwn(PROFILES, s.profile) ||
          !/^[a-f0-9]{64}$/.test(s.hash) ||
          !Number.isFinite(s.expires),
      )
    )
      throw Error("Invalid account data");
  } catch (error) {
    if (error.code !== "ENOENT")
      throw Error(
        "The private account store cannot be read. Restore its backup before starting the service.",
      );
  }
  function persist(next) {
    mkdirSync(dirname(storeFile), { recursive: true, mode: 0o700 });
    writeFileSync(storeFile + ".tmp", JSON.stringify(next), { mode: 0o600 });
    renameSync(storeFile + ".tmp", storeFile);
    data = next;
  }
  // Check that this location is writable before accepting any signups.
  persist(data);
  const rates = new Map();
  let queue = Promise.resolve();
  function limited(ip) {
    for (const [key, values] of rates)
      if (now() - values.at(-1) >= 600000) rates.delete(key);
    const recent = (rates.get(ip) || []).filter((t) => now() - t < 600000);
    if (recent.length >= 20)
      fail(429, "Too many sign-in attempts. Please wait ten minutes.");
    if (!rates.has(ip) && rates.size >= 1000)
      fail(429, "Please try again in a little while.");
    recent.push(now());
    rates.set(ip, recent);
  }
  function authenticate(secret) {
    if (typeof secret !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(secret))
      return null;
    const session = data.sessions.find(
      (s) => s.expires > now() && matches(secret, s.hash),
    );
    return session && data.users[session.profile]
      ? PROFILES[session.profile]
      : null;
  }
  function session(next, id) {
    const secret = token();
    next.sessions = next.sessions.filter(
      (s) => s.expires > now() && s.profile !== id,
    );
    next.sessions.push({
      hash: digest(secret),
      profile: id,
      expires: now() + lifetime,
    });
    persist(next);
    return { profile: PROFILES[id], token: secret, expires: now() + lifetime };
  }
  async function password(value) {
    if (typeof value !== "string" || value.length < 12 || value.length > 128)
      fail(400, "Choose a password with 12–128 characters.");
    const salt = randomBytes(16).toString("hex");
    const hash = (
      await scrypt(value, salt, 64, {
        N: 131072,
        r: 8,
        p: 1,
        maxmem: 256 * 1024 * 1024,
      })
    ).toString("hex");
    return { salt, hash };
  }
  async function handle(path, secret, input = {}, ip = "local") {
    if (path === "/account")
      return {
        privateAccounts: true,
        initialized: !!data.users.nancy,
        melodyRegistered: !!data.users.melody,
        profile: authenticate(secret),
      };
    limited(ip);
    // Serialize credential changes to prevent concurrent setup/invite consumption.
    const work = queue.then(async () => {
      const next = structuredClone(data),
        profile = authenticate(secret);
      if (path === "/account/setup") {
        if (next.users.nancy || !matches(input.setupKey, digest(setupKey)))
          fail(403, "The setup key is not valid or setup is already complete.");
        next.users.nancy = await password(input.password);
        return session(next, "nancy");
      }
      if (path === "/account/login") {
        const id = Object.hasOwn(PROFILES, input.profile) ? input.profile : "",
          user = next.users[id];
        const value =
          typeof input.password === "string" && input.password.length <= 128
            ? input.password
            : "";
        // Derive even for an unknown account so the response does not reveal a password check shortcut.
        const actual = await scrypt(value, user?.salt || "0".repeat(32), 64, {
          N: 131072,
          r: 8,
          p: 1,
          maxmem: 256 * 1024 * 1024,
        });
        if (!user || !timingSafeEqual(actual, Buffer.from(user.hash, "hex")))
          fail(401, "That account or password did not match.");
        return session(next, id);
      }
      if (path === "/account/invite") {
        if (profile?.id !== "nancy")
          fail(401, "Nancy needs to sign in to invite My Melody.");
        if (next.users.melody)
          fail(
            409,
            "My Melody already has an account. Use the sign-in screen.",
          );
        const invite = token();
        next.invite = { hash: digest(invite), expires: now() + 86400000 };
        persist(next);
        return { invite, expires: next.invite.expires };
      }
      if (path === "/account/register") {
        if (
          next.users.melody ||
          !next.invite ||
          next.invite.expires <= now() ||
          !matches(input.invite, next.invite.hash)
        )
          fail(
            403,
            "This account invitation has expired or has already been used. Ask Nancy for a new one.",
          );
        next.users.melody = await password(input.password);
        next.invite = null;
        return session(next, "melody");
      }
      if (path === "/account/logout") {
        next.sessions = next.sessions.filter((s) => !matches(secret, s.hash));
        persist(next);
        return { ok: true };
      }
      fail(404, "Not found");
    });
    queue = work.catch(() => {});
    return work;
  }
  return { authenticate, handle };
}
