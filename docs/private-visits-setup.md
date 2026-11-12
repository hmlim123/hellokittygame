# Meet as Hello Kitty and My Melody

Nancy signs in as **Hello Kitty**. Her partner signs in as **My Melody**. Each
has a separate password. Nancy opens the village and sends a private invitation;
My Melody joins to walk, wave, dance, chat and set a picnic together. This uses the
actual Blender models, including My Melody’s refined smile and expression clips.

The GitHub Pages game works on its own. Online visits additionally need the
prepared Node 24/WebSocket service. The code and local two-client tests do not
mean a public server has already been connected. No Render account credentials
or deployed service address have been supplied to this workspace.

## One-time hosting setup

**The Render blueprint now uses a paid Starter service and a 1 GB persistent
disk.** The previous free service’s temporary filesystem cannot safely keep
password accounts through deploys. Review Render’s current price before applying
the blueprint. Preparing this repository has not created a service or incurred
charges. A hosting account owner must approve the deployment in Render.

1. Open [Deploy on Render](https://render.com/deploy?repo=https://github.com/hmlim123/hellokittygame).
   Sign in with GitHub and allow access to `hmlim123/hellokittygame`. In the
   blueprint preview, review **nancy-village-visits**, **Starter**, and
   **private-village-data**. Apply only when you approve that hosting plan.
2. Wait for **Live**, then copy the `https://…onrender.com` service address.
   Its `/health` page must include `"privateAccounts": true`. Keep
   `ALLOWED_ORIGINS=https://hmlim123.github.io`.
3. On the service’s **Environment** page, reveal the automatically generated
   `ACCOUNT_SETUP_KEY`. Keep this key private. It is for the creator’s first
   setup only; it is never included in a shared game link.
4. Open [the game](https://hmlim123.github.io/hellokittygame/?v=gift-20&update=together-37).
   Choose **Visit the village → Private visits → Connect the village service**.
   Paste the service address and choose **Connect service**. The two-account
   screen will appear. Enter the setup key and choose a password of at least
   12 characters to create Nancy’s account. Keep the password safely and share
   it with Nancy privately, or do this initial setup with her on her device.
5. As Nancy, choose **Open my village**, then **Create My Melody’s account
   invitation**. Send the account invitation privately to your partner. They
   open it on their own device, choose their own password, and select
   **Join Nancy’s village**. Creating another account invitation replaces the
   previous one. It expires after 24 hours and can be used only once.

After both accounts exist, Nancy signs in and chooses **Open my village** each
time you want to meet. Send the ordinary **private invitation** to My Melody,
who signs in with their own password and joins. The ordinary visit invitation
also expires after 24 hours; it grants no access without My Melody’s account.
Only Nancy’s account can open/close the village. My Melody can leave freely.
Opening the same account on another device ends its previous sign-in.

To make Nancy’s setup automatic, add repository Actions variable
`KITTY_VISITS_URL` containing the service URL, then run the Pages workflow again.
This is a public service address, not a password or setup key. Until then,
`adventure.html?visits=YOUR_HTTPS_SERVICE_ADDRESS` presets the service for a
new device. Invitations carry the address for the invited player automatically.
Nancy does not need a GitHub or Render account to play or sign in.

If upgrading an existing free Render service, change its plan and attach the
persistent disk before enabling `PRIVATE_ACCOUNTS=true`. Set the environment
variables below and redeploy. The server refuses anonymous Render mode. Existing
browser progress is retained; ephemeral old invitations can be replaced.

## What is shared and saved

- The server fixes Nancy’s identity to Hello Kitty and her partner’s to My Melody.
  Changing a nickname, outfit, packet, or visit ticket cannot switch identities.
- The shared village includes positions, gestures, up to 20 chat lines, flower
  beds and a three-part picnic. Actions validate position and proximity.
- Nancy’s flowers merge into her personal garden without resetting earlier blooms.
- Home ownership, inventories, outfits, stories, postcards and the personal letter
  stay on each device. Full game saves and letter contents never go to this server.
- A visit temporarily suspends writes to the visitor’s personal game save.
  Leaving restores the original local progress. Visitors cannot enter Nancy’s
  personal room. Her single-player game stays usable when the service is offline.

Accounts use salted scrypt password hashes. The server stores session hashes,
not raw login tokens, and checks identity on every WebSocket action. Tokens
expire after seven days and are revoked on sign-out or a replacement login.
The browser keeps its login and visit ticket in session storage; closing the
browser session may require signing in again. Login tokens travel in HTTPS
headers or the initial WSS message, never a URL. There are exactly two invited
accounts, with no public registration, email account, or password-reset emails.

The persistent disk contains `accounts.json` and `visits.json`. Back it up
privately before maintenance; never commit or share these files. Do not delete
it to troubleshoot a connection. The service setup key does not reset existing
passwords; keep your passwords in a password manager and retain a private disk
backup for recovery. Personal game save backups remain in the game’s Settings.

## Configuration

| Variable | Render value |
| --- | --- |
| `PRIVATE_ACCOUNTS` | `true` |
| `ACCOUNT_SETUP_KEY` | Auto-generated secret, at least 32 characters |
| `ACCOUNT_STORE_FILE` | `/var/data/accounts.json` |
| `VISIT_STORE_FILE` | `/var/data/visits.json` |
| `ALLOWED_ORIGINS` | `https://hmlim123.github.io` |
| `PORT` | Provided by Render |

The service runs as one instance with one disk. Do not scale it to multiple
instances: rooms and account mutations currently use a single-process authority.
A database/shared session layer is required before horizontal scaling.

## Local verification

```sh
npm --prefix server ci
npm --prefix server test
npm run build
python3 tests/accounts-browser.py
```

The browser check launches its own temporary authenticated server and two
independent phone-sized browser contexts. It tests setup, an invited signup,
actual Blender avatars, synchronized chat/dance, movement, refresh reconnection,
sign-out, incorrect passwords and visitor save isolation. Server checks also
cover account/ticket impersonation, expired sessions/invites, concurrent signup,
rate limits, corruption handling and durable account/room restart recovery.

For manual development, configure the five account variables above with files
in the ignored `server/.private-data/` directory and a generated setup key. Local service origins
include Vite and the 8081 preview. Without `PRIVATE_ACCOUNTS=true`, local-only
legacy protocol tests remain supported; Render deployment refuses that mode.
Physical iPhone/Android and Mac Safari verification remains outstanding.
