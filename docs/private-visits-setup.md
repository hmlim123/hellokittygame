# Meet together without a paid server

**Nancy is Hello Kitty. You are My Melody.** Both have separate password logins.
Nancy opens her village and sends you a private invitation. You can walk, wave,
dance, chat and set a picnic together using the actual Blender characters.

The recommended hosting is now **Cloudflare Workers Free with a SQLite-backed
Durable Object**. It keeps the two accounts and private visit data without a
paid disk. The game itself continues to run on GitHub Pages.

This repository prepares the deployment; a Cloudflare account owner must deploy
it once. The owner has now provided a production address, recorded below. Account setup
and a real hosted visit still need confirmation; no credentials were shared.

## Your production service

The owner provided `https://hellokittygame.hmbest77.workers.dev` on 2026-11-12.
Use the production hostname. The wildcard preview address is for preview builds.

[Open Nancy’s game with the production service preset](https://hmlim123.github.io/hellokittygame/?v=gift-20&update=free-visits-38&visits=https%3A%2F%2Fhellokittygame.hmbest77.workers.dev).
The existing `visits` query parameter configures and remembers this public service
address without changing Nancy’s save or requiring another game build. Choose
**Visit the village → Private visits**. If the service is initialized, sign in.
For first setup, enter the owner setup key privately in the game and choose
Nancy’s password. Nancy can then invite My Melody to create the second account.

The owner reports deployment complete. This workspace could not independently
probe the service: the managed network rejected the HTTPS tunnel with a policy
403. This is not a response from the Worker and does not establish that the
service is unhealthy. The account-initialization and real hosted two-device
checks remain unverified until the game connects. The owner can check
[`/health`](https://hellokittygame.hmbest77.workers.dev/health); a ready service
returns `ok: true`, `privateAccounts: true` and `provider: "cloudflare"`. If the
response asks for `ACCOUNT_SETUP_KEY`, add the private secret in Cloudflare
**Settings → Variables and Secrets**, then deploy the change. Never put the key
or game passwords in a URL or chat.

## The easiest setup

1. Open [Deploy this village to Cloudflare](https://deploy.workers.cloudflare.com/?url=https://github.com/hmlim123/hellokittygame).
   Create or sign into a **free Cloudflare account**, then connect GitHub when
   asked. Cloudflare copies the public game repository into your GitHub account
   and prepares the Worker and its SQLite-backed Durable Object automatically.
   Use a new name such as `nancy-village-free` for the copied repository.
2. Keep the account on **Workers Free**. The worker is named
   `nancy-village-free`. There is no need to enable a paid Workers plan, buy a
   domain, attach a paid disk, or create a separate database account.
3. The setup page asks for **ACCOUNT_SETUP_KEY**. Choose a private random key of
   at least 32 characters. On a Mac, open Terminal and run
   `openssl rand -hex 32` to generate one. Copy it privately into the secret field
   and keep it safely for the first game setup. This key is not your everyday
   game password. Leave `ALLOWED_ORIGINS` as `https://hmlim123.github.io`.
4. Choose **Deploy**. After it finishes, open the Worker’s `https://…workers.dev`
   address and copy it. The address ending in `/health` should show
   `"ok":true`, `"privateAccounts":true` and `"provider":"cloudflare"`.
   If the setup key was not requested during import, add it in the Worker’s
   **Settings → Variables and Secrets → Add → Secret**, then deploy that change.
5. Open [Nancy’s game](https://hmlim123.github.io/hellokittygame/?v=gift-20&update=free-visits-38).
   Choose **Visit the village → Private visits → Connect the village service**.
   Paste the public `https://…workers.dev` address into **Village service
   address** and choose **Connect service**. Enter the setup key and choose
   Nancy’s password of at least 12 characters to create her first account.
   Do this with Nancy on her device, or share her chosen password privately.
6. As Nancy, choose **Open my village → Create My Melody’s account invitation**.
   Open that invitation on your own device. Choose your own password, then tap
   **Join Nancy’s village**. Your character is My Melody; hers is Hello Kitty.

Only the creator needs a Cloudflare/GitHub account. Nancy and My Melody use the
in-game passwords afterward. Send the public `https://…workers.dev` service
address to the developer to prepare a game link that presets the connection;
keep the setup key and passwords private.

The Deploy to Cloudflare button reads the root `wrangler.jsonc`, `.dev.vars.example`
and the binding descriptions in `package.json`. It detects the setup secret and
provisions the SQLite Durable Object using the `new_sqlite_classes` migration.
The default deploy command is `npm run deploy` (Wrangler). The game website is
still published by the existing GitHub Pages workflow.

## Meeting again

Nancy chooses **Nancy · Hello Kitty**, signs in, and chooses **Open my village**.
She sends you the ordinary private invitation. You choose **You · My Melody**,
sign in with your own password, and join. The invitation includes the service
address, so the visitor does not need to configure it separately.

The account-registration invitation can be used once and expires after 24 hours.
Creating another replaces the old registration link. Ordinary visit invitations
also expire after 24 hours and require My Melody’s account. Only Nancy can open
or close the village; you can leave freely. A new Nancy invitation replaces her
old village. A replacement login ends that account’s previous sign-in.

To preset the service for every player, set repository Actions variable
`KITTY_VISITS_URL` to the public Worker URL and run the Pages workflow again.
Alternatively, add `&visits=YOUR_HTTPS_WORKER_URL` to the game’s gift link once.
The service address is public configuration; passwords and the owner key are not.

## What “free” means

Use **Workers Free** and a **SQLite-backed Durable Object**. Cloudflare’s current
published limits include 100,000 Worker requests per day and 5 GB total Durable
Objects storage on Free. Durable Objects also have compute, request and SQL
operation limits. A small two-person village is designed to stay modest: it uses
one object, up to two signed-in avatars, a 20-line chat, and no paid storage service.

If a Free quota is exhausted, the affected operations fail until the quota resets;
Cloudflare does not silently charge Free overages. Limits are shared with other
Workers on the same account. This is not a promise of unlimited usage or uptime.
Keep the account on Free; choosing a paid plan changes the billing arrangement.

Movement is sent when it changes, including the final stop. Idle players send
only a quiet 15-second keepalive instead of ten packets per second. Movement
positions live in hibernating WebSocket attachments; account changes, shared
activities and disconnects are saved in SQLite. Idle sockets can hibernate while
staying connected, and no heartbeat timer keeps the server awake permanently.

Official references, checked 2026-11-12:

- [Durable Objects pricing and Free quota behavior](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [Durable Objects limits and Free SQLite storage](https://developers.cloudflare.com/durable-objects/platform/limits/)
- [Workers request limits](https://developers.cloudflare.com/workers/platform/limits/)
- [WebSocket hibernation](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)
- [Deploy buttons, secrets and automatic provisioning](https://developers.cloudflare.com/workers/platform/deploy-buttons/)

## Your progress and privacy

Nancy’s letter, outfits, inventory, home, stories and keepsakes stay on her device.
The server does not receive a full game save or the letter. Her shared flower
beds can gain blooms when you help; previous progress is never reset. The visitor’s
personal save is paused during a visit and restored when leaving. Single-player
remains usable independently of hosting and free-tier availability.

The server fixes the two character identities and validates tickets, sessions,
positions and nearby actions. Passwords use salted scrypt hashes, with the
memory-bounded `N=32768, r=8, p=3` configuration inside the Worker. Tokens are
hashed in account storage. Hibernating socket attachments retain only the account
session hash, role and temporary visit state. Signing out revokes the session;
login tokens never appear in links. Browser login tickets use session storage.

Keep your game passwords in a password manager. There are exactly two invited
accounts, no public registration and no password-reset emails. Do not delete or
rename the Durable Object namespace to troubleshoot a connection: that creates a
new account store. Changing the owner setup key does not reset existing passwords.
Use the game’s Settings to back up Nancy’s separate personal progress.

## Local development and verification

```sh
npm ci
npm run test:free-visits
npm run build
python3 tests/accounts-browser.py
```

The browser test starts the actual local Cloudflare runtime with temporary SQLite
storage and two independent phone-sized browser contexts. It covers signup,
Kitty/My Melody, chat, dance, movement, quiet idle traffic, refresh reconnection,
sign-out, incorrect passwords and preservation of the visitor’s original save.
Worker checks also exercise identity forgery, third-client rejection, shared
picnic rules, malformed input, revocation and full runtime restart recovery.
Physical iPhone/Android and Mac Safari verification remains separate.

For manual development, copy `.dev.vars.example` to ignored `.dev.vars`, choose
your own private setup key, then run:

```sh
npm run visits:dev -- --var ALLOWED_ORIGINS:http://127.0.0.1:8081
```

The optional Node service shares the same account and action rules and retains
its existing tests. `deploy/render-paid.example.yaml` is an explicit optional
paid hosting example; it is not the recommended setup. The root paid Render
blueprint was removed so the free setup is the default deployment path.

## Updating an existing village for v3.7

Update the existing Worker rather than pressing the new-service Deploy button.
The connected production service is `hellokittygame.hmbest77.workers.dev`.
Keep its existing `VILLAGE` SQLite binding, migration history, setup secret and
accounts. In Cloudflare's connected Git build, deploy the updated game repository
commit to that same Worker. If deploying from an authenticated local checkout:

```sh
npm ci
npx wrangler deploy --name hellokittygame
```

No new secret or account initialization is required. On the updated service,
an authenticated `GET /account` reports `togetherAvailable: true`. The game uses
this flag to enable **Meet together**; room snapshots enable shared reactions,
baking, weather and photos. Older services keep chat and invitations available.
A successful GitHub Pages deployment publishes only the client, not this Worker.
