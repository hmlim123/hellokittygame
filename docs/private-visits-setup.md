# Nancy’s private village visits

The browser game stays on GitHub Pages. A small Node 24/WebSocket service hosts
private visits for two people. `render.yaml` prepares a free Render web service.
The village interface is delivered with the village redesign; the backend can
be deployed first.

## Connect Render

1. Open [Deploy on Render](https://render.com/deploy?repo=https://github.com/hmlim123/hellokittygame).
2. Sign in to your Render account and connect this repository. Review the
   `nancy-village-visits` service from the blueprint; it specifies the free plan.
3. Deploy the service. Its health check is `/health`. Keep `ALLOWED_ORIGINS`
   set to `https://hmlim123.github.io`, the origin of Nancy’s game.
4. Copy the service’s `https://…onrender.com` address. Once the village update
   is available, open **Private visits → Connect the village service**, paste
   that address and choose **Connect service**. A host only needs to do this once.
   The address can also be set as the game build’s `VITE_VISITS_URL` so it is
   ready for Nancy automatically.
5. Choose **Open my village**, copy the private invitation, and send it to your
   friend. The invited player enters a name and chooses **Join the village**.
   They do not need to configure a server or have a GitHub/Render account.

An account owner must connect Render; this project does not contain Render
credentials or assume an external service has already been created.

## What a visit shares

- Two real Blender avatars, selected clothes/items, movement and expressions.
- A short private chat and a three-part picnic by the village table.
- The host’s flower beds; a nearby visitor can help them bloom. Blooms merge
  into the host’s garden without resetting earlier progress.

Each browser keeps its own outfits, letter, story progress and home decorations.
The server never receives a full save or the letter. Visitors can wave at the
host’s doorstep; the personal room is separate from the shared village visit.

Invitations expire after 24 hours. Host and visitor tickets are separate; the
host ticket is never part of a shared link. A disconnected visitor can resume
their ticket. A host can close the visit; a guest can leave it. Online actions
are validated on the server, including positions and proximity to the garden
or picnic table. Repeating an action does not duplicate a contribution.

## Free hosting and storage

The free service may sleep between visits, so the first connection can take a
moment. Its temporary filesystem can be replaced on a service restart; a fresh
invitation may then be needed. This never removes either browser’s personal
progress. The server supports atomic checkpoints through `VISIT_STORE_FILE`;
the blueprint uses `/tmp/nancy-village-visits.json`. A persistent volume can be
configured separately if longer-lived visit recovery is desired.

## Local development

```sh
npm --prefix server ci
npm --prefix server test
node server/index.mjs
```

The default local service listens on port 8787 and accepts the local Vite and
8081 preview origins. Set `PORT` and a comma-separated `ALLOWED_ORIGINS` when
using another preview. Only loopback games accept an HTTP loopback service;
the published game uses HTTPS/WSS. `/health` returns protocol readiness.

The server checks cover two clients, private roles, a third-visitor rejection,
movement/teleport validation, plain-text chat, expressions, shared picnic and
garden actions, reconnecting and checkpoint restoration. Browser visit checks
exercise the same protocol with two separate browser contexts and actual 3D
avatars. Physical phone/Safari verification remains a separate acceptance check.
