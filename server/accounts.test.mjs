import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAccounts } from "./accounts.mjs";
const setupKey = "a-secret-owner-setup-key-at-least-32-characters";
const nancyPassword = "Nancy private password ♡",
  melodyPassword = "Melody private password ♡";
async function setup(t) {
  const dir = await mkdtemp(join(tmpdir(), "nancy-accounts-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  let clock = Date.now();
  const options = {
    storeFile: join(dir, "accounts.json"),
    setupKey,
    now: () => clock,
  };
  const accounts = createAccounts(options);
  return { accounts, options, advance: (t) => (clock += t) };
}
test("owner setup is secret-gated, two accounts are invited once, hashes survive restart", async (t) => {
  const { accounts: a, options } = await setup(t);
  await assert.rejects(
    a.handle("/account/setup", "", {
      setupKey: "wrong",
      password: nancyPassword,
    }),
    { status: 403 },
  );
  await assert.rejects(
    a.handle("/account/register", "", { password: melodyPassword }),
    { status: 403 },
  );
  const nancy = await a.handle("/account/setup", "", {
    setupKey,
    password: nancyPassword,
  });
  assert.equal(nancy.profile.character, "kitty");
  await assert.rejects(
    a.handle("/account/setup", "", { setupKey, password: nancyPassword }),
    { status: 403 },
  );
  const { invite } = await a.handle("/account/invite", nancy.token);
  const registrations = await Promise.allSettled(
    [1, 2].map(() =>
      a.handle("/account/register", "", { invite, password: melodyPassword }),
    ),
  );
  assert.equal(registrations.filter((r) => r.status === "fulfilled").length, 1);
  const melody = registrations.find((r) => r.status === "fulfilled").value;
  assert.equal(melody.profile.character, "melody");
  assert.equal(melody.profile.role, "guest");
  await assert.rejects(a.handle("/account/invite", melody.token), {
    status: 401,
  });
  const disk = await readFile(options.storeFile, "utf8");
  for (const secret of [
    setupKey,
    nancyPassword,
    melodyPassword,
    nancy.token,
    melody.token,
    invite,
  ])
    assert.equal(disk.includes(secret), false);
  const restored = createAccounts(options);
  assert.equal(restored.authenticate(nancy.token).id, "nancy");
  const loggedIn = await restored.handle("/account/login", "", {
    profile: "melody",
    password: melodyPassword,
  });
  assert.equal(loggedIn.profile.id, "melody");
  assert.equal(restored.authenticate(melody.token), null);
});
test("wrong passwords, malformed sessions, logout and expiry fail closed", async (t) => {
  const { accounts: a, advance } = await setup(t);
  await assert.rejects(
    a.handle("/account/setup", "", { setupKey, password: "short" }),
    { status: 400 },
  );
  const n = await a.handle("/account/setup", "", {
    setupKey,
    password: nancyPassword,
  });
  await assert.rejects(
    a.handle("/account/login", "", {
      profile: "nancy",
      password: "not the password",
    }),
    { status: 401 },
  );
  await assert.rejects(
    a.handle("/account/login", "", {
      profile: "__proto__",
      password: nancyPassword,
    }),
    { status: 401 },
  );
  assert.equal(a.authenticate({}), null);
  assert.equal(a.authenticate("x".repeat(43)), null);
  await a.handle("/account/logout", n.token);
  assert.equal(a.authenticate(n.token), null);
  const again = await a.handle("/account/login", "", {
    profile: "nancy",
    password: nancyPassword,
  });
  advance(7 * 86400000 + 1);
  assert.equal(a.authenticate(again.token), null);
});
test("expired and replaced invitations cannot create an account; rate limits bound password work", async (t) => {
  const { accounts: a, advance } = await setup(t);
  const n = await a.handle("/account/setup", "", {
    setupKey,
    password: nancyPassword,
  });
  const first = await a.handle("/account/invite", n.token),
    second = await a.handle("/account/invite", n.token);
  await assert.rejects(
    a.handle("/account/register", "", {
      invite: first.invite,
      password: melodyPassword,
    }),
    { status: 403 },
  );
  advance(86400001);
  await assert.rejects(
    a.handle("/account/register", "", {
      invite: second.invite,
      password: melodyPassword,
    }),
    { status: 403 },
  );
  for (let i = 0; i < 20; i++)
    await assert.rejects(a.handle("/account/invite", "", {}, "attacker"), {
      status: 401,
    });
  await assert.rejects(a.handle("/account/invite", "", {}, "attacker"), {
    status: 429,
  });
});
test("corrupted account storage is never silently replaced with new accounts", async (t) => {
  const { options } = await setup(t);
  await writeFile(
    options.storeFile,
    '{"version":1,"users":{"nancy":{}},"sessions":[]}',
  );
  assert.throws(() => createAccounts(options), /cannot be read/);
  assert.throws(
    () => createAccounts({ storeFile: options.storeFile, setupKey: "short" }),
    /at least 32/,
  );
});
