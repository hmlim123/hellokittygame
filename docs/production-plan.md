# Nancy's game: production plan

Agreed with the user on 2026-10-29. This document preserves the plan between
sessions. Deliver and verify one milestone at a time, with a focused release
and a short explanation of what changed. The roadmap is not a claim that every
stage has already shipped.

## Future direction: Nancy’s cozy village

Agreed direction on 2026-11-09: evolve the game toward a Hello Kitty life
simulation inspired by Animal Crossing: New Horizons. The user finds the current
adventure concept confusing and wants an inviting village with NPCs, comfortable
phone controls and everyday activities. This is a future roadmap, not a claim
that the village redesign or multiplayer has shipped. Completeness and polish
take priority over adding a large feature catalogue.

The central loop is: leave home → meet a friend → choose a small activity →
bring home a keepsake → decorate or enjoy it with Kitty. Progress should feel
like making a home and getting to know friends. Use an original village layout
and the existing Blender characters, outfits, baking, gardening and room items.

### Village design

- An open, connected neighbourhood with visible landmarks: Nancy’s home, a
  central plaza, a café and a garden. Replace maze-like navigation and hidden
  arch/portal requirements with broad paths and clearly marked entrances.
- Momo and Pip have understandable places to visit, greetings, short requests
  and reactions to gifts. Introduce gentle wandering after stationary
  conversations and interaction selection work reliably.
- Offer one nearby contextual action and one optional current goal. Nancy can
  explore or spend time with friends without advancing a quest checklist.
- Design for phones first: responsive movement, forgiving tap targets, optional
  touch steering, a stable follow camera, readable dialogue and few open panels.
  Prototype tap-to-walk on navigable ground with obstacle avoidance and compare
  it against the existing steering controls before making it the default.
- Preserve Nancy’s progress, letter, outfits, earned friends and souvenirs when
  introducing the village. Existing dungeon stories can remain optional trips.

### Next milestone: one complete village visit

Build one small, polished single-player village loop first: walk from home to
the plaza, greet Momo, choose a café or garden activity, receive one keepsake,
and return home to place it. Reuse existing activities and rewards. The village
must be understandable from its landmarks and nearby prompts, without requiring
the old dungeon route or an expanded menu system.

Acceptance: a new player can complete that loop on a phone-sized screen without
route instructions from the developer; touches select the intended NPC/action;
movement, camera and entrances behave consistently; rewards are granted once;
returning home and reloading retain progress. Review actual phone/Safari play
before claiming physical-device acceptance. Keep the room’s three main buttons.

### Later milestone: private visits together

The user wants to join Nancy in the same village in the future. Plan private,
invite-only sessions for two people, each with a distinct avatar. Start with
seeing each other walk and wave, simple in-game chat, and one shared activity
such as baking or a picnic. Shared decorating and additional visitors can follow
after the two-person visit is dependable.

This needs a realtime backend and durable shared session state alongside the
React/Three.js client. GitHub Pages can continue serving the game, but cannot
provide the multiplayer server by itself. Select a managed realtime service or
a small WebSocket server when implementing this milestone; do not imply a
provider, hosting or account flow has already been configured.

Define ownership before sharing rewards: Nancy keeps her home and personal
progress; a visitor cannot reset or overwrite them. The server validates shared
actions and grants rewards once. Test two independent clients, joining/leaving,
reconnection, simultaneous interactions and restoration after a disconnect.
Single-player play must continue to work when a friend is offline.

Suggested delivery order: clear village navigation and mobile controls → NPC
life and one complete home/activity/reward loop → polished decorating and visits
within the village → private two-person online visits. Validate each milestone
before increasing the map, activity count or multiplayer scope.

## Earlier adventure target journey

Enter Butterfly Glade → follow the butterflies → revive the flowers → earn a
cosmetic reward → return to Kitty's room → equip the reward → revisit the memory.

Aim for a comfortable 5–10 minute first journey. Measure this with a first-time
playthrough during Stage 2; automated test runtime does not measure playtime.
Reuse existing quests, equipment, souvenirs, and storybook pages where possible.

## Guardrails

- Preserve the three main room buttons, existing saves, and the actual Blender model.
- Prioritize completeness and polish over adding more features, as requested on 2026-11-04.
- Keep interactions gentle, with no penalties, grain, or mandatory sound.
- Keep the current React + TypeScript, React Three Fiber, Zustand, Rapier and Drei stack.
- The user authorized an assistant-written letter in v1.6.1. Keep it editable and do not fabricate shared memories or the author's name.
- Never equate phone emulation with a physical device test.

## Milestones

| Stage                           | Status                             | Scope                                                                                                                  | Acceptance                                                                                                                                           |
| ------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Polished controls            | Delivered (browser verified)       | Keyboard/touch reliability, turning, camera, obstacles, focus loss and area transitions.                               | Quick taps are retained, holds are smooth, newer turns survive walls, and release/cancel/focus loss stop safely in desktop and phone browser checks. |
| 2. One clear next goal          | Delivered (browser verified)       | One objective, nearby actions, missing-tool explanations, gentle optional hints.                                       | A new player can find and revive the flowers using the game interface; record actual journey duration.                                               |
| 3. Satisfying discoveries       | Delivered (browser verified)       | Watering/bloom/reward feedback, optional sound, Kitty celebrations, reward-to-inventory-to-room connection.            | Each reward is understandable, granted once, wearable at home and in the adventure, and connected to a revisitable memory.                           |
| 4. Consistent visual style      | Delivered (browser verified)       | Pastel palette, lighting, rounded scenery, typography, icons, framing, and effect intensity.                           | Compare all screens in the target journey at desktop and phone sizes; maintain contrast, readable text, and a bright grain-free scene.               |
| 5. Comfortable phone play       | Delivered; physical review pending | Touch targets, menus, scrolling, loading, orientation, and device-appropriate rendering.                               | Complete the journey on the target physical phone and laptop, recording browser/device and performance; fix overlap, input, or readability issues.   |
| 6. Dependable progress/releases | Delivered; CI and browser verified | Save feedback, visible version, backup/restore, interrupted sessions, migration, and automated browser release checks. | Reopen, restore, and upgrade saves without losing rewards; failed core-journey checks prevent publication.                                           |

## Stage 1 delivery record

Baseline: `c6f30fe`, the controls update already published before this roadmap.
It removed slow step ease-out, kept rapid turn/second-tap input, restored the
previous held key, and added 48-pixel touch targets with slide steering.

This milestone additionally covers:

- A turn pressed before a wall collision resolves must still execute.
- Holding the new direction must continue; repeating the blocked direction must stop.
- Releasing a temporary turn must resume a still-held key without erasing the turn.
- Touch pointer capture must clear on blur, hidden tab, a story/modal, and unmount.
- Touch steering is owned by a focused `DirectionPad` component, separate from menus.

Verification completed on 2026-10-29:

- `npm test`: 135 passing tests (66 existing domain checks + 69 Vitest checks),
  including real Rapier movement at 20/30/60/120/144/240 simulated display FPS.
- `npm run build`: TypeScript and the production Vite build pass.
- `python tests/controls-browser.py`: rapid/overlapping taps, uppercase WASD,
  held-key restoration, wall turns, blur, real emulated touch slide/cancel,
  pointer-capture release, and story-choice interruption pass.
- `python tests/movement-browser.py`: continuous interpolated camera/body motion,
  reduced motion, wall stops, touch holds, and the garden/glade portal pass.
- `python tests/react-browser.py`: all four original adventure quests, wardrobe,
  room return, mission rewards, reload, shared rewards, and phone touch pass.
- All three browser suites report zero page errors.

Release link: <https://hmlim123.github.io/hellokittygame/adventure.html?v=stage1-14>.
The GitHub Pages workflow for this source revision is the deployment record.
The user authorized automatic continuation through Stage 6. Later milestones are
tracked below and will ship together after the final release checks.
This environment has Chromium and phone touch emulation. Safari/WebKit and
physical iPhone/Mac testing are not available here; keep them on the device
review checklist and do not claim they passed.

## Delivery routine

1. Reproduce the gap and make a focused change.
2. Run meaningful unit/physics checks and relevant browser journeys.
3. Confirm saves and the existing three-button interface remain usable.
4. Publish the tested release and confirm the GitHub Pages workflow succeeds.
5. Record evidence and the next milestone here. Report any remaining device checks.

## Stage 2 delivery record

One current goal is now visible above the adventure. It explains the next tool
and the nearby one-tap action; an optional folded hint shows the walking route.
The hint gently offers help after inactivity without opening itself. Equipped
lanterns continue to reveal later markers automatically.

Validation: 3 guide-state tests pass; the production build and a fresh UI-driven
glade → lantern trail → flowers → room souvenir → reload journey pass with zero
page errors. The automated route took 6.1 seconds; a first-time human playtime
measurement remains pending and is not inferred from that test.

## Stage 3 delivery record

Reviving the flower patch now earns a Blossom keepsake dress. A persistent,
dismissible reward card shows the dress before offering “Wear it here” or
“Try it at home”; no outfit is forced on Nancy. The actual Blender character
gets mint fabric and a cream flower detail. A little flower pot appears at home
and opens the flower storybook page. Existing watering/bloom effects, Kitty’s
reaction, and optional chime remain connected to the discovery.

The unlock is derived from the existing flower completion flag, so it is earned
once and returning players receive it too. Two reward-state tests and the fresh
journey through reward → room → outfit → memory → inventory → reload pass.

## Stage 4 delivery record

The room, adventure, wardrobe, postcard and ending now share a warm lighting rig
and exposure. UI text, buttons, focus rings, cards and scene hints use a coherent
pastel/rose palette with stronger text contrast. Foreground adventure walls fade
near Kitty so they do not hide her; their collision boundaries stay unchanged.

Desktop and phone presentation checks pass, including measured 4.5:1 contrast
for the tested goal/body/primary/settings text. Screenshots were visually reviewed.
The complete reward journey and normal/reduced-motion camera, collision, touch
and portal regressions pass. This is not a claim of a full accessibility audit.

## Stage 5 delivery record

Phone adventure framing now keeps Kitty larger and visible at map edges, including
landscape. The game card uses viewport-aware height, controls have comfortable
targets, native selects avoid small-font phone zoom, and dialog close buttons
remain reachable after scrolling. Settings offers Automatic, Battery friendly
and Sharper game detail. Automatic lowers pixel density only after sustained
slow frames and recovers slowly, with a mobile cap; reduced detail also uses
fewer discovery particles. Menu changes and rotation preserve the selected detail.

Validation: 3 adaptation/migration tests pass; browser checks pass at 320×568,
390×844 and 844×390 with touch, outfit editing, scrolled dialogs, rotation, quality
persistence and reload. Presentation, keyboard, touch, camera, collisions and
portal regressions pass. Physical iPhone/Android/Mac performance and Safari
review remain pending; browser emulation does not certify those devices.

## Stage 6 delivery record

Primary and classic save writes now report failures, support retry, and retain a
working download even when storage is blocked. Settings shows version 1.6.0, the
source build revision and last successful save time. Rehydrating another tab's
position remounts the old physics body safely; legacy saves that omit newer
chapter or preference fields preserve those fields from the modern save.

New unit checks cover primary-only and mirror-only failures, recovery without
animation-write storms, coordinate refresh, and older-save repair. Browser checks
cover blocked storage, export/retry/reload, fresh-phone restore and real cross-tab
position refresh. A production journey also caught a pre-input physics backlog
causing extra steps; each movement command now has its own elapsed-time budget.
The full Butterfly Glade chapter passes after that correction, including the
letter placeholder, ending, real postcard download and touch puzzle.

Release automation installs pinned Chromium/Python checks, starts an isolated
preview, and runs ten browser suites before artifact upload. A failed journey
blocks publication and retains diagnostics. Final local verification: all 150 automated tests and all ten browser suites
pass, with zero page errors. The GitHub Pages run repeats these checks before
deployment and is the publication authority.

## Remaining human review

- Play the first journey without prior instructions; record the actual duration
  and any confusing goal/tool wording. The 5–10 minute target is not yet validated.
- Review touch, Safari rendering, loading and performance on Nancy's physical
  phone and Mac. Automated Chromium/device emulation has passed; real hardware
  and Safari are still unverified.
- Nancy's letter is ready as an explicitly authorized assistant-written draft; the author can personalize it later.

## Release 1.6.0

Implementation is complete through Stage 6; human review items above remain
explicitly open. The final local gate passed: 150 automated tests and all ten
browser suites (controls, movement, fresh journey, presentation, devices, save
release checks, full chapter, polish, navigation, original room/quests).

Latest game: <https://hmlim123.github.io/hellokittygame/?v=production-16>.
Deployments: <https://github.com/hmlim123/hellokittygame/actions/workflows/pages.yml>.
The release is published only after that workflow succeeds.

Deployment confirmed: [Pages run 40979705374](https://github.com/hmlim123/hellokittygame/actions/runs/40979705374)
finished **Success** for source commit `d2eeb6508a0eab33199c7d9dde9c2f7e6a8810a6`.
The CI browser gate passed before publication. The deployed app reports version
1.6.0 / build d2eeb65. This documentation-only delivery record does not change the
deployed game build.

## Letter update · v1.6.1

The user explicitly requested an assistant-written letter and asked to know what
would be added. `dist/letter.js` now contains four warm paragraphs about making
this little world for Nancy, signed “With all my love, Me ♡”. No personal name or
specific shared memory was invented. The envelope still opens behind its heart
seal and can be folded and reopened. The chapter check now verifies the actual
ready letter instead of the old placeholder.

Validation for the letter update: all 150 automated checks and the complete
chapter browser journey pass, including the actual message behind the heart
seal, storybook access, ending and postcard. The letter remains editable.
Letter release: <https://hmlim123.github.io/hellokittygame/?v=letter-17>.

Follow-up verification on 2026-10-30: all ten local release browser suites pass,
with zero page errors. The initial Pages release gate failed, so publication was
blocked. The runner now retains individual suite logs and includes the failed
suite's traceback in GitHub error annotations; every existing journey remains
required. [Pages run 41082839102](https://github.com/hmlim123/hellokittygame/actions/runs/41082839102)
passed the full CI browser gate and deployed source `9276a03` successfully. The
original failure did not reproduce locally or in that release run; its cause is
unconfirmed. The published game reports v1.6.1 / build 9276a03.

Open the letter from Her room → Play together → Nancy’s letter, then break the
heart seal. It is also available through the discovered envelope's storybook page.

## Cozy expansion · v1.7.0 (published; physical review pending)

The user authorized the next six improvements on 2026-10-30. This is a separate
expansion from the completed production roadmap above.

| Improvement | Implementation / review status |
| --- | --- |
| Physical phone and Safari playtesting | Pending actual devices; [review script](phone-playtest.md) records the journey, device fields and open result. Chromium emulation is separate evidence. |
| Bake cookies with Kitty | Three cutters, three icings, up to 12 placed sprinkles, three gift recipients; no timer/penalty. Draft and one-time gift accounting persist. |
| Personal keepsake wall | Six bounded JPEG thumbnails of the real downloaded postcards, with outfit, scene, place, pose and local date/time. Framed images appear at home. PNG originals remain separate downloads. |
| More touch reactions | Dedicated captured-pointer petting without camera rotation; existing Blender high-five and a one-action equip/cuddle teddy flow; existing optional sound and reduced motion are respected. |
| Second short story | Gather mint automatically near the glade entrance → bake a cookie for Momo → set two cups and the cookie at a moonlit table. Pausing preserves progress. Ending, storybook page and home teacup reward persist. The table remembers the gifted cookie. |
| Comfortable reading | Standard/Large/Extra large persisted text; temporary clean scene view with visible touch restore, H/Escape support and movement guarded while hidden. |

The room retains three main buttons. New durable fields normalize old saves and
participate in legacy mirroring, failure handling and atomic backup/restore. No
personal memories were invented and Nancy’s letter remains unchanged. Unit and browser checks pass; device/Safari review and first-time human
duration remain explicitly pending.

The expansion checks reproduced a held-movement pause: automatic tiles reset
the input clock and discarded time on slow frames. They now share one budget
until a new press/turn, with the original pre-input backlog guard intact. Normal
and reduced-motion movement, quick taps and touch controls pass locally. The
browser movement sample uses a longer unclamped corridor after renderer warmup;
its camera alignment, no-backward-snap and no-boundary-pause assertions remain.
The backup schema check now includes `cozy`, and damaged thumbnail loading is
isolated from the room. Unit/domain verification: all 159 checks pass. The ten original local browser suites pass, and the final cozy suite passes
after thumbnail isolation, including actual backup transfer into a fresh phone
browser and a damaged-image check. These checks report zero page errors. The
full eleven-suite GitHub release gate passed before publication.

Deployment confirmed on 2026-10-30: [Pages run 41096613738](https://github.com/hmlim123/hellokittygame/actions/runs/41096613738)
finished **Success** for source `5342946`. All 159 automated checks and all
eleven CI browser suites passed before artifact upload and Pages deployment.
Release link: <https://hmlim123.github.io/hellokittygame/?v=cozy-18>. The build is
v1.7.0 / 5342946. Documentation-only commits do not change the deployed build.

Preview evidence: [cookie decorating](nancy-cookie-gift.png),
[moonlight tea party](nancy-tea-ending.png), and
[keepsake wall](nancy-keepsake-wall.png). The local website archive was refreshed
with the same version/build. Physical-device/Safari review is still pending in
[the review script](phone-playtest.md); automated emulation is not that review.

## Gift handoff · v1.7.1 (published)

The user requested easier NPC interactions, a reset for Nancy’s first visit,
and a share link. Momo, the cloud guardian and Pip now have direct model/name
interaction and a generous three-tile speaking range with a clear-line check.
Facing is automatic. Named footer actions and E support keyboard/touch play;
adjacent quest objects retain priority. Explicit conversations stay open until
closed, and phone name buttons are clamped below the scene’s tool row.

Progress is browser-local. A new visitor starts fresh without an automatic-reset
URL. The share link is <https://hmlim123.github.io/hellokittygame/?v=gift-19>.
A device with existing progress can use Settings → Keep your progress → Start
fresh → Download backup & start fresh. Reset preserves Nancy’s letter, retains
and downloads a restorable previous save, clears the merged legacy collection,
and rolls back partial failures. Unrelated storage and classic wallet/picnic
fields stay unchanged. Reopening the share link preserves Nancy’s progress.

Local checks: 164 automated tests and the real-browser NPC/reset journey pass,
including first conversations from three tiles away, persistent replies and
choices, native backup download, reset/reload, unchanged letter, a fresh phone
context, and real touch name/choice controls with zero page errors. The release
gate now includes twelve suites. Physical-device/Safari review remains pending.

The original four-quest browser journey and complete Butterfly Glade journey
also pass locally, including the guardian choices, star puzzle, unchanged letter,
ending and PNG export. CI caught a brief walking-pose observation race on its
software renderer. That check now installs its frame observer before input and
holds through a walk; foot lift and turning assertions are preserved. The
focused polish suite (tools, rig, bridge, Pip and backup transfer) passes after
that test correction. The full twelve-suite CI gate subsequently passed before publication.

Deployment confirmed on 2026-10-30: [Pages run 41138033994](https://github.com/hmlim123/hellokittygame/actions/runs/41138033994)
finished **Success** for source `593cda4eb826ae272595327123ff9684bf875289`.
All 164 automated tests and all twelve CI browser suites passed before upload
and Pages deployment. The deployed game is v1.7.1 / 593cda4; the local website
archive was refreshed with the same version/build.

Share the room: <https://hmlim123.github.io/hellokittygame/?v=gift-19>. No test
progress is included in the URL. Reset was exercised in isolated test browsers;
this environment cannot clear the user’s existing device storage remotely. A
new browser starts fresh, while a previously used device can reset through the
backed-up Settings action. Nancy’s letter stays available.

## Start from zero · v1.7.2 (published)

The user clarified that the gift must automatically begin at zero even when a
browser contains earlier testing progress. This explicitly supersedes the prior
handoff's manual-reset-only behavior. The gift-19 and gift-20 links now perform
one first-opening reset before creating/rendering the game store. The starter
Kitty and authored letter remain, but scores, rounds, completed missions, quests,
earned friends, cookies, tea-party progress and postcards start at zero. The shelf
now counts invited friends excluding the starter Kitty: 0 of 5 at the beginning.

One permanent marker is shared by both gift links, saved atomically with the
fresh save and a recoverable previous-save backup. Ordinary URLs, subsequent
openings, alias changes and future releases preserve progress. On a failed
storage transaction, the original disk data is rolled back and a fresh in-memory
session reports unsaved writes while remaining playable. Unrelated storage stays
untouched. The marker is not tied to the build revision.

Local verification covers 169 automated tests, including rich completed saves,
chapter reset, the one-time marker, ordinary-URL preservation, alias/reload
continuity and marker-write rollback. The real NPC/gift browser journey seeds a
completed old save, verifies automatic zero progress and a zero-friend counter,
then verifies play/reload without another wipe, the unchanged letter, native
manual-reset backups, and a new touch-phone context. All pass with zero page
errors. The twelve-suite CI release gate passed before publication.

Updated gift link: <https://hmlim123.github.io/hellokittygame/?v=gift-20>.
The user's original gift-19 link performs the same one-time start; gift-20 also
refreshes cached HTML from the earlier release. Physical Safari is unverified.

Deployment confirmed on 2026-10-30: [Pages run 41141339531](https://github.com/hmlim123/hellokittygame/actions/runs/41141339531)
finished **Success** for source `8627915bed75afcc792995f7effa74240d580472`.
All 169 automated tests and all twelve CI browser suites passed before upload
and Pages deployment. The deployed game is v1.7.2 / 8627915; the local website
archive uses the same version/build.

Send <https://hmlim123.github.io/hellokittygame/?v=gift-20>. Opening the updated
gift code performs the authorized one-time reset, including an already-used
browser; after that launch it saves new progress normally. The letter stays.

## Blender performances · v1.8.0 (published)

The user authorized all five Blender/game upgrades. The new editable source is
`hellokitty3D/hello_kitty_game.blend`, rebuilt by `create_game_assets.py` from the
unchanged postcard animation. The latest Hawaiian static/dance editions on
GitHub are preserved alongside it. Source commit and file SHA-256 are recorded
in `dist/assets/kitty-source.json`; Mac instructions are in
[the Blender workflow](blender-workflow.md).

| Upgrade | Implemented behavior |
| --- | --- |
| Kitty actually bakes | Recipe steps play authored Stir, Cut, Present and Bow performances. Heart/star/round cutter matches selection; her tray displays the actual icing and stamps. Optional replay; no forced wait or added main buttons. |
| NPC greetings | Actual Blender Momo waves and awake Pip wiggles her ears at hello and after dialogue closes, so the reading panel does not hide their reaction. Sleeping/waking eyes use the actual meshes. |
| Natural grips | Named paw/cup/tray sockets, baked midpoint constraint and live midpoint correction. Joined shoulders remain fixed while wrists sweep; tea ending lifts a cup. |
| Discoveries | Named Surprise, Bow and Celebrate performances respond to discoveries and quest completions; additive gaze/walking pivots keep bind translations correct. |
| Matching decorations | Blender-made rounded cushion, frame, little oven and cup at home; matching tray, bowl, spoon and three cutters in baking. Tap the oven to bake. |

Named glTF clips replace fixed frame slices, with a fallback for old imports.
The exporter excludes studio and authoring previews, removes unused timeline
buffers, and leaves its input `.blend` unchanged. Kitty remains below 2 MB;
all friends and props together remain below 600 KB. Asset URLs are versioned
for returning browsers. Reduced motion suppresses performances; the same three
room buttons, letter, existing saves and permanent gift marker remain intact.

Blender validation passes for editable clip ranges, socket parents and preview
visibility. The actual shipped GLBs pass pose/reset, shoulder connection, cup
lift, friend animation and payload checks. The new browser journey exercises
stirring, cutting, decorated tray, bow, replay, reduced motion, reload continuity,
Momo/Pip greetings and zero page errors. The thirteen-suite release gate includes
the twelve earlier controls, quest, device, save and cozy journeys. Publication
will be recorded after the final gate; physical iPhone/Mac Safari review remains
pending, and automated playthrough time is not Nancy's first-player duration.

Local verification on 2026-11-04: all **173** automated checks pass (70 domain/model
checks and 103 Vitest checks), and the complete **13-suite** browser gate passes.
After the final visibility/layout refinements, the focused presentation and
Blender-performance browser checks pass again, including greetings after reading,
static reduced motion and preserved cookie progress. TypeScript/build pass. The
letter, first-gift marker and backup implementation are unchanged from v1.7.2.
Preview evidence: [Kitty's decorated tray](nancy-blender-baking.png) and
[room with matching toys](nancy-blender-room.png). The physical review checklist
now includes these new performances. The latest release workflow cancels
superseded commits; every published build still requires the complete gate.

Reduced motion also interrupts an active gesture immediately; model and browser
checks cover the preference change without waiting for a clip to finish.

Deployment confirmed on 2026-11-04: [Pages run 41902306795](https://github.com/hmlim123/hellokittygame/actions/runs/41902306795)
finished **Success** for source `abc59617f32dbc476af89e5d88135ebe353a6085`.
All **173 automated checks** and all **thirteen CI browser suites** passed before
upload and Pages deployment. The deployed build is **v1.8.0 / abc5961**; the local
website archive has the same build. Superseded draft runs were cancelled and
were not published. Blender source is pushed at `hellokitty3D` commit
`33053dfcae2220a1904456bb5ac2908a074049c9`, preserving the newer Hawaiian files.

Share the refreshed room:
<https://hmlim123.github.io/hellokittygame/?v=gift-20&update=toys-21>.
The extra update parameter refreshes cached HTML and does not change the permanent
first-gift marker. Existing Nancy progress and her letter remain intact. Open
**Play a mission → Bake cookies with Kitty**, or tap the room oven, to see the
new performances. Original gift-19/gift-20 links continue to work. Physical
phone/Mac Safari verification remains pending in the manual review checklist.


## Cozy life · v1.9.0 (published)

The user authorized six connected updates and emphasized natural motion, with an
approximately one-hour improvement budget. All six are implemented: direct-input
baking, remembered gifts/visits, a delivery→mint→home recipe journey, earned corner
placement, selectable sunny/rainy atmosphere with optional audio, and four recipes
with story-derived unlocks. The same three main room buttons remain.

Blender source is `hello_kitty_natural.blend`: soft elbow/paw deformation on the
actual fused arms, synchronized sockets, loopable spoon contact, anticipated
cutter pressure, turning/tray placement, handover and an oven hinge. Earlier game
and Hawaiian Blender files are preserved. Source commit/hash are recorded in the
asset provenance. Input clocks ease toward a live pose rather than restarting
animations on every event; shape edits, gifts and progress continue to save.

The new real-browser journey passes circular pointer stirring, changed paw poses,
pressing, native slider preparation, one real delivered parcel, mint gathering
without bridge prerequisites, recipe/cushion unlock on returning home, Momo's
actual icing recall, persistent room/rain choices, and 320px reduced-motion touch.
All 184 automated checks pass (72 domain/model + 112 Vitest); TypeScript/build
pass. The complete release gate now contains fourteen suites. Local/CI checks are
browser emulation, not physical phone/Mac Safari testing. First-player journey
duration remains unmeasured; the five-minute story is a design target.

The delivery snapshot is separate from later cookie batches and gifts are granted
once. Old saves gain empty friend memories rather than invented gift history.
One side story can be active at a time; paused milestones are preserved. New
cozy fields normalize and transfer in existing backup/legacy mirroring flows.
Rain stays in the window, adds no grain, and sound stays opt-in. The first-gift
marker and Nancy's letter are unchanged. Publication will be recorded after the
complete gate succeeds.

Final parcel review also covers reserving a packed cookie immediately, preventing
re-gifting it from baking, and leaving a later baking batch untouched on delivery.

The fourteen browser suites now run across four isolated CI runners. An explicit
coverage check ensures every suite appears exactly once; publication waits for
the unit/build job and all four browser groups, then downloads the same immutable
build artifact. No checks are removed. The Blender performance check now uses
the new Stir control before observing the real input-driven pose.

Deployment confirmed on 2026-11-04 (client date): [Pages run 41951571618](https://github.com/hmlim123/hellokittygame/actions/runs/41951571618)
finished **Success** for source `ecef64eb9b5dcffba9a8978b0c48f0ffb6ac3eca`.
All **184 automated checks** and **14 browser suites**, across four successful
isolated groups, passed before Pages publication. The exact immutable build
artifact passed every group and was then deployed. The live game and local
website archive are **v1.9.0 / ecef64e**. Natural Blender source is pushed at
`d99bb326edf69c9c9d38132f0b34e010369edbf4`; original editions remain intact.

Share: <https://hmlim123.github.io/hellokittygame/?v=gift-20&update=cozy-22>.
Choose **Play a mission → A little cookie delivery**, or open baking to use the
spoon, cutter and oven slider. **Your cozy corner** contains earned placement
and rain choices; the folded recipe book is inside baking. The refreshed URL
keeps the permanent gift-start marker, Nancy's letter, and her earned progress.
The implementation/local checks fit the requested approximately one-hour work
window; final remote publication completed just after it. Physical Safari/phone
review and first-time human journey timing remain pending.

## Completeness polish · v1.9.1 (2026-11-04)

Nancy's creator asked to prioritize completion and polish over more features.
This pass stays within baking and the existing cookie-delivery journey:

- Preserve the kitchen worktop across steps; keep held trays level, retain the
  Blender-authored prop scale, and fit the real tray inside a real oven cavity.
- Align the authored turn/reach with the oven. Deposit the tray, withdraw empty
  paws, and close the door using the rendered motion phase. Keyboard End travels
  through the motion; step completion waits for the visible pose.
- Correct Blender SCENE frame-time trimming (frame 1 is 1/fps) and close the spoon
  contact loop before Cut starts. Keep input poses in control of the animation;
  repeated clicks cannot replace an in-progress completion callback. Replays
  return to the ready pose.
- Resume a pending home arrival from the room URL or Continue delivery exactly
  once. Pip remembers the actual mint visit. Do not change earned progress,
  letter text, gift launch marker, or the three room buttons.

Verified release: **v1.9.1**, tested source
`21a5812209ba43765fa2e2259caf500889889900`, Blender source
`c6c3410317504d780919068c8a4a84d0c5d85a25`. All **187 automated checks**
(74 Node/model/domain + 113 Vitest) and all **14 browser suites** passed.
[Pages run 41958463856](https://github.com/hmlim123/hellokittygame/actions/runs/41958463856)
completed successfully, including all four browser groups and deployment of the
same tested artifact. Published link:
<https://hmlim123.github.io/hellokittygame/?v=gift-20&update=polish-23>.

Local real-input checks covered stirring/cancellation, press, keyboard End,
packed-cookie delivery, mint, direct room-URL arrival, reward persistence,
320px touch/reduced motion, replays, and both friend greetings. The measured
tray tilt remained zero during the oven pose, and the baked reach is checked
against the oven position. Updated review: `docs/nancy-blender-baking.png`.

An earlier candidate hit a hosted controls-check timeout that did not reproduce
in the local full controls playthrough. The release gate blocked publication.
Browser runners now use Ubuntu 24.04 and the installed Playwright-pinned browser;
failure reports retain the calling test location and control-state diagnostics.
The final full gate, including rapid turns, touch recovery and cancellation,
passed in that environment. No check or release dependency was removed.

Physical phone and Safari verification remains pending. The actual device
checklist and Mac Blender workflow are updated in `docs/phone-playtest.md` and
`docs/blender-workflow.md`. Preserve this boundary in future completion claims.

## Five complete Blender plush editions · v2.0.0 (2026-11-05)

User requested all five reference-inspired Blender models first, then game
integration with dances and expressions. Created Strawberry Cloud, Moonlight
Witch, Baby Blossom, Rose Kitten and Silver Bunny as separate self-contained
`.blend` projects, retaining the natural edition and all earlier source files.
Packed fabric normals, real short curled fibers, fused paw deformation, costume
meshes, distinct soft dances, wink and two-eye happy expressions are editable.
Render paths are relative for use on Mac; no external texture/cache is needed.

Game integration stays in Inventory → Clothes → Kitty’s plush collection. It
keeps the three room buttons, existing clothes/items, letter, gift marker and
progress. The optional shared equipment field is whitelisted and backed up;
postcards retain the actual style. Models load lazily once per selection and are
shared between scenes. Failed/interrupted requests keep the current Kitty.
Body normalization preserves baking contact; tall accessories fit preview/photo
cameras. Covered 3D room rendering pauses, fine strands use matte materials,
small/distant or Battery friendly characters omit fine pile, and picking targets
the stuffed surface. Gesture timing no longer loses most elapsed time at low FPS.

Verified **v2.0.0**, tested game source
`ad57da8e99ee6c09f950ebb90a58a335b3e52697`, Blender source
`9dad10b164565def0ac08f1747c13a64e12307f0`. All **196 automated checks** (79 Node/model/domain +
117 Vitest) and **16 browser suites** passed. All four browser groups and the
Pages deployment succeeded in
[run 42082839427](https://github.com/hmlim123/hellokittygame/actions/runs/42082839427).
The published site uses the exact artifact that passed the gate:
<https://hmlim123.github.io/hellokittygame/?v=gift-20&update=plush-24>.

Real-input browser checks covered all five models, distinct dances, wink/happy
restoration, one lazy model request per selection, complete tall-accessory
framing, shared outfits, room/adventure/baking, walking/reload, postcard style,
320px touch, reduced motion and return to Original Kitty. Failure/retry and late
response cancellation passed; the classic fallback loads and retains the chosen
edition. The existing connected cozy-life journey also passed locally.

The five portable `.blend` files were packaged together with portraits and a
source manifest, and every file checksum in the bundle was verified. Updating
render paths to relative paths left all five exported model binaries identical.
Review images: `docs/nancy-plush-*.png`. The original source projects, current
progress, letter and gift-start marker remain intact.

Physical phone/Safari review remains pending; Chromium phone emulation is not
physical-device certification. Use `docs/phone-playtest.md` for that remaining
review. No new main button or additional mission was added in this release.

## Natural plush surface correction · v2.0.1

The exposed white curls around the chin read as facial hair in actual play.
Replace the free curled pile with a packed seamless 512px fleece normal and
subtle continuous nap relief, retaining the editable stuffed meshes. Fit the
hood opening to the head, use short embroidered cheek whiskers, and remove the
kitten hood’s overlapping ear caps. Preserve all five source
projects, distinct dances, fused paw deformation, expressions and 13 clips.

No new features or reset. Keep shared clothes, items, quests, postcards, the
letter and the permanent gift-start marker. Version gallery images as well as
model URLs so the old portraits do not linger in cache.

Acceptance: visually inspect Blender portraits and actual browser previews;
verify no exposed curl geometry, the packed fabric texture and all original
motion/prop contact assertions. Run the automated checks and all release browser
journeys before publication. Physical phone and Safari review remain pending.

Local verification: all 196 automated checks passed (79 Node/model/domain and
117 Vitest). All five actual browser models danced, winked, restored happy eyes
and kept shared clothes; adventure walking/reload, postcards, baking, 320px touch
and reduced motion passed. Failure/retry, late-response cancellation and the
classic fallback passed. Source portraits and actual game previews were reviewed, including a side-by-side
comparison against the previous in-game model. The existing full cozy-life
baking/delivery journey also passed locally, with zero page errors.
Model payloads are now 2.95–3.28 MB, with no exposed pile meshes.

Blender source: `9f73b7f1450535d5b7abe42a3ae3336366eebd6c`.
Game candidate: `a3f564e22969063add8262c0f12e074e13499b6e`.
The corrected five-project download was verified against every source checksum.
Published after all **196 automated checks** and **16 browser suites** passed.
All four browser groups and the Pages deployment succeeded in
[run 42096173464](https://github.com/hmlim123/hellokittygame/actions/runs/42096173464).
The deployed site uses the exact artifact that passed that gate:
<https://hmlim123.github.io/hellokittygame/?v=gift-20&update=soft-plush-25>.
The local downloadable website also contains the corrected models and the tested
game revision. The five portable Blender projects and their portraits are bundled
with a source manifest, and every bundled source checksum was verified.
No reset marker, quest, saved outfit or personal letter changed. Physical phone
and Safari verification remain pending.

## Silver Bunny ear correction · v2.0.2 (published)

The creator identified unnatural ears after the fleece correction. The previous
ears were identical upright ellipsoids with separate thick metallic inserts.
Silver Bunny now has broad buried bases, gentle outward curvature, slightly
different forward-bending tips and thin satin lining that follows the actual
outer surface. A clean oval head and fitted hood remove the leftover cat-ear
bumps. Existing controls have small independent settling beats and return to rest.

Blender source: `d4e0fd92bc53ddce87015a45032872fd4da93798`.
The other four projects are unchanged. All 13 clips and paw sockets remain;
there is no progress reset, UI feature, quest or letter change. Model and gallery
URLs use the new release version, including the classic fallback model URL.

All **197 automated checks** passed (80 Node/model/domain and 117 Vitest).
The added actual-model check measures root containment, lining-to-surface
distance, fabric material response, independent settling, attachment during
dancing and restoration to rest. The exporter retains the fitted ear/head
topology so reduction cannot separate these surfaces.

Front, profile, rear and dance Blender renders were visually inspected. The
existing full plush browser check now also captures actual side/back rotation
of Silver Bunny. All 197 automated checks and all 16 browser suites passed
before publication. Physical phone and Mac/Safari review remain pending.

Local actual-input browser verification also passed all five editions’ dance,
wink and happy restoration, shared clothes, adventure walking/reload, postcards,
and tall-accessory baking. Silver Bunny was visually reviewed in front/profile/
rear game views and a 320px touch/reduced-motion preview. Failed-download retry,
late selection cancellation and the classic fallback passed with no page errors.

Game candidate: `2e482f4ac2b7352900445724c7babe0c63a8eeae`.
Release gate: [run 42099187591](https://github.com/hmlim123/hellokittygame/actions/runs/42099187591).
The corrected source bundle was verified against all five project checksums;
the website archive contains the actual corrected model and source manifest.
Review images: `docs/nancy-silver-bunny-*.png` and
`docs/silver-bunny-blender-*.png`. No physical-device result is inferred from
these browser checks.

Publication verified: all four browser groups and the Pages deployment succeeded
in run **42099187591** for the game candidate above. The same immutable tested
artifact was deployed. The deployment job’s fresh step results were checked after
the summary page initially cached an unfinished deployment.

Published: <https://hmlim123.github.io/hellokittygame/?v=gift-20&update=silver-bunny-26>.
Both the individual Silver Bunny Blender project and the five-project bundle
contain the corrected ears; the website archive matches the tested game revision.
Nancy’s progress, letter and permanent gift-start marker remain unchanged.

## Smooth collection and rounded rabbit ears · v2.0.3 (published)

The creator requested smoother textures on all five and identified another
unwanted shape near Silver Bunny’s ears. Remove fleece normals/bump textures
and tiny surface relief, use a smooth matte finish and soften the silver bow
response. Retain each edition’s palette, all 13 clips, morphs and paw sockets.

Silver Bunny now uses explicit round ear caps, oval flush lining and a single
clean oval head. The duplicate hood shell near the ear bases is removed.
Ear roots and independent settling use the same existing head controls.
The original game character, three room buttons, letter, progress and gift-start
marker remain. Physical phone/Mac Safari review remains pending.

Verify all five source portraits and game previews, smooth-material export,
round rabbit tips, no extra hood rim, all expressions/dances, baking contact,
phone framing and save compatibility before the full browser release gate.

Source revision: `62b3195f3d759a380c1c5fb3932d29b90958b91d`.
Game candidate: `7876eb455f54fae78fde9f8853c49121348d46ef`.
All **197 automated checks** passed (80 Node/model/domain and 117 Vitest).
The model gate now asserts smooth matte material export and the absence of
fleece normal textures, alongside every existing dance/expression/prop-contact
check. Rabbit fitting checks assert rounded-cap revision and no extra hood shell.

All five Blender portraits were visually reviewed after restoring the original
smooth sculpt surfaces. Rabbit profile, rear and dance renders were reviewed
with the new round caps and one head surface. Portable Blender archives were
verified against all five source checksums. Full release gate:
[run 42119305391](https://github.com/hmlim123/hellokittygame/actions/runs/42119305391).
All 197 automated checks and all 16 browser suites passed; all four browser
groups and Pages deployment succeeded before publication.

Local browser verification passed all five real model selections, distinct
dances, wink/happy restoration, shared outfits, postcard capture/metadata,
room/adventure walking and reload, tall-accessory baking, and 320px touch with
reduced motion. Silver Bunny’s front/profile/rear game views and phone preview
were visually inspected with rounded tips and no extra shell. Failure/retry,
late-response cancellation and the classic fallback also passed with zero
page errors. Updated review images replace the previous textured versions.
The website archive was checked against each actual smooth model and source
manifest. Physical-device review is still pending.

Publication verified in run **42119305391** for candidate
`7876eb455f54fae78fde9f8853c49121348d46ef`. The exact immutable tested artifact
was deployed. Published game:
<https://hmlim123.github.io/hellokittygame/?v=gift-20&update=smooth-collection-27>.
The five-project smooth Blender bundle and website archive contain the updated
models; source checksums and the smooth surface metadata were verified.
Nancy’s progress, letter and permanent first-gift marker remain unchanged.
Physical phone and Mac/Safari review remain pending.

## New shelf collection and five friendship stories · v2.1.0 (published)

The creator requested replacing the “0 of 5 friends invited” shelf with the new
characters, then requested more stories and selected a mix of playable stories
and illustrated tales. Stable IDs 1–5 now map to Strawberry Cloud, Moonlight
Witch, Baby Blossom, Rose Kitten and Silver Bunny; ID 0 is Original Kitty.
Existing invitations, selected slots and progress are retained.

The actual Blender sources are baked into lightweight, static shelf figurines
with their source hashes embedded. They have no animation rigs and retain each
character’s palette and costume. The main selected friend and arrival use the
full animated model. Shelf selection preloads the requested model before
committing, cancels stale responses, preserves outfits/items and rejects locked
characters. Miniatures preload invisibly during arrival; the ending scale
matches the shelf. The classic fallback shares the collection and offers a
progress-preserving link to the friendship stories.

Each friend has a three-part playable kindness story and an illustrated saved
page. Direct 3D object taps and equivalent picture buttons support pointer,
touch and keyboard; sequence hints have no penalty and there is no timer.
Progress resumes after pausing/reloading. Finishing invites the matching friend
once and saves a storybook page. Already invited friends gain the story without
a duplicate reward; completed stories support full rereading. Partial/completed
stories are normalized in cozy progress and included in backups. An older
classic cozy mirror that omits the field cannot erase the new primary progress.

All **206 automated checks** pass (83 Node/model/domain and 123 Vitest), including
source provenance/payload bounds for all six miniature models, exact one-time
invitations in any story order, locked choices, harmless wrong/duplicate actions,
partial/reload/backup continuity, older-save compatibility and arrival scale.
A real browser playthrough completed all five stories, selected every invited
edition, returned to Original Kitty, read the illustrated/full story, reloaded
all completed progress and used the 320px touch layout without page errors.
The first ribbon was collected with a real 3D scene click. Existing fallback
load/retry/cancellation checks also passed.

The browser release gate now covers **17 suites** across the existing four
isolated groups; coverage asserts every suite appears exactly once and deploy
still depends on all groups passing the exact immutable build artifact.
Nancy’s letter, permanent gift-start marker and three-button room stay intact.
Physical phone/Mac Safari review remains pending. Publication verified below.

Release candidate: `afe0e6c2a0063dabfbf70a5502fb9d918cd62fab` (v2.1.0).
[Pages run 42129207730](https://github.com/hmlim123/hellokittygame/actions/runs/42129207730)
is the full 17-suite release authority. Push initially failed with the server’s
`fatal error in commit_refs`; a full non-thin Git pack succeeded. For the final
record push, use `git -c pack.window=0 push --no-thin origin master` if needed.

The delayed-model browser check now waits for its interception callback before
asserting the held request, removing a harness event-order race. The actual
retry, leave-before-load cancellation and classic fallback assertions remain
and pass. The local connected regression also passed the original tea, petting,
phone reading/keepsake backup and cookie-delivery journeys with zero page errors.

Publication verified: all **206 automated checks** and **17 browser suites**
passed for `afe0e6c2a0063dabfbf70a5502fb9d918cd62fab`. All four browser groups
and the Pages deployment succeeded in run **42129207730**, deploying the exact
immutable artifact that passed the full release gate.

Published: <https://hmlim123.github.io/hellokittygame/?v=gift-20&update=shelf-stories-28>.
Open **Your little shelf → Meet your new friends**, or **Play a mission → Five
little friendship stories**. The local connected suite also passed the tea,
full cookie-delivery and all five friendship stories, including direct scene
taps, original invitation preservation, full rereading, reload, phone touch and
zero page errors. The downloadable website bundle contains the exact candidate
revision and all six lightweight Blender shelf models.

Review: `docs/nancy-friend-shelf.png`, `docs/nancy-friend-story.png`,
`docs/nancy-friend-story-phone.png`. Nancy’s existing invitations, letter,
wardrobe, adventure progress and gift marker remain. Physical phone/Mac Safari
verification remains pending.

### Expressions and relaxed empty paws — v2.2.0

All six actual Blender sources now contain five new mouthless facial clips:
sleepy, surprised, happy squint, bashful and curious. Real eye shape keys,
small authored head movements and a surface-projected blush supply the looks.
The existing thirteen clips and baking sockets remain; an extra relaxed-paw
showcase brings each library to nineteen clips. The fused arm meshes carry an
EmptyRest shape anchored at the shoulder. Sources open at frame 1105 with
lowered empty paws; the optional bouquet is hidden. Silver Bunny's rounded
ears and the smooth matte materials are retained.

The game blends the empty-paw shape after animation mixing, and uses the
established grip during a hand performance, equipped item or baking attachment.
Faces work with either pose. More little expressions is a folded secondary
control in Play together and Inventory, with matching static photo poses.
Intermediate friendship-story moments use the appropriate new face. Reduced
motion presents a brief static face and returns to normal. No fourth main
room button was added.

Fresh saves start with empty paws. The previous automatic bouquet is cleared
once using a separate cosmetic migration marker; other items remain. Flowers
chosen afterward survive reload and future openings. The permanent gift-start
marker, letter, earned invitations, wardrobe and adventure/story progress are
retained. Classic room/adventure share the migration. The exporter retains
static bind channels with two endpoints instead of repeated frame samples,
keeping the six lazy models within their existing size budgets (Original's
expanded 19-clip budget is 3.2MB; the five editions remain below 4MB each).

Blender source commit: `4e18999` in the private hellokitty3D repository.
All six full game models and shelf miniatures are exported from the updated
source files, with hashes recorded. The downloadable Blender bundle includes
Original Kitty and all five editions. Verification and publication follow.

Local verification: all **210 automated checks** pass (87 Node/model/domain,
123 Vitest). The new real-browser suite exercised five faces on all six models,
restoration/interruptions, held-flower posture, selection/reload, empty-paw
return, a saved bashful postcard, 320px touch and static reduced motion with
zero page errors. Source portraits and browser captures were visually reviewed,
including Silver Bunny's ears and the lowered paws. The full release gate now
covers **18 suites** across the same four isolated groups. Physical phone and
Mac Safari remain unverified. Publication is pending the full release gate.

The local regression also passed actual baking/contact/replay and both NPC
greetings, failed/retried/cancelled cosmetic downloads, classic fallback,
all five complete friendship stories, six shelf selections, storybook rereading,
reload and the phone touch layout. Review found that Three's raycaster includes
hidden meshes: the optional bouquet now skips raycasts while hidden, so empty
paws leave no invisible flower target. Selected flowers remain touchable.
The six-model test verifies both states; all 210 automated checks still pass.

The full release gate for `44bd1dc` stopped publication after the existing
slow-frame steering check caught one extra held step. Physics catch-up was
sampling the wall clock on every substep, allowing its own processing time to
increase the input budget. InputClock now samples once per render frame before
Rapier and shares that fixed budget across the batch. Continuous walking keeps
its clock across tiles. The loading indicator also waits for the first scene
draw/material upload before enabling input, including demand-rendered wardrobe
changes. The existing slow-frame browser assertion is retained; it now logs the
press duration for diagnosis. A new timing boundary test brings the automated
checks to **211** (87 Node/model/domain and 124 Vitest), all passing.

Cached teddy, strawberry, letter and adventure-tool groups also skip raycasts
when hidden, so switching back to empty paws leaves no invisible prop target.
Actual-ray tests verify visible props are interactive and hidden props are not.

The next full gate found a Drei HTML lifecycle problem during scene replacement:
`play-polish-browser.py` reported a React DOM removeChild error after restore,
and `cozy-life-browser.py` could lose Momo's label after returning to the village.
Both were reproduced locally. SceneHtml now gives every label a stable, owned
portal host instead of mounting foreign React roots into the Canvas-owned DOM.
Detaching the host leaves its children attached until Drei disposes them;
changing the event target no longer rebuilds a root in a reused label element.
Buttons/links remain interactive and noninteractive labels pass pointer input
through. The restore test retains browser error stacks for future diagnosis.

The exact failing restore/phone-transfer journey now passes with zero errors.
The complete baking/parcel/Momo/Pip/recipe/room-weather journey and its 320px
reduced-motion controls also pass, including the previously missing Momo label.
No browser assertion was removed or weakened. Publication remains gated on all
18 suites for the final code revision.

Publication verified: **v2.2.0**, candidate `e142c6e6236d5ce1b779eb7f70788b7ce2087af3`.
All **211 automated checks** and **18 browser suites** passed. All four browser
groups and the Pages deployment succeeded in
[run 42137281296](https://github.com/hmlim123/hellokittygame/actions/runs/42137281296),
publishing the exact immutable artifact that passed the release gate.

Published: <https://hmlim123.github.io/hellokittygame/?v=gift-20&update=expressions-29>.
All six characters start with relaxed empty paws; flowers remain optional.
Use Play together → More little expressions or the folded Inventory control.
The photo corner includes all five new faces. All six Blender projects open
at frame 1105 with their lowered-paw pose; source commit `4e18999`.
The verified six-project bundle is `/workspace/hello-kitty-expressions-blenders.zip`;
the website bundle contains candidate `e142c6e6236d5ce1b779eb7f70788b7ce2087af3`.

Local final regression also passed the full tea/souvenir/storybook/postcard loop,
rendered keepsake frame, petting/teddy/high-five, large reading, 320px touch,
clean-view restoration and cross-device tea/keepsake backup with zero page errors.
The older gift-20 save upgrade preserves invitations, outfit, edition, charms,
story progress and the permanent gift marker after clearing the automatic
bouquet once. Nancy’s letter remains unchanged. Physical phone/Mac Safari
review remains pending; browser emulation is not physical-device verification.

Review images: `docs/nancy-expression-cloud.png`,
`docs/nancy-expression-postcard.png`.

### Corrected resting arm silhouette — v2.2.1

The previous EmptyRest only rotated the old bouquet-holding arm. Review from
front and profile confirmed that the paws still curled inward. The corrected
shape resculpts the arm as a smooth, rounded oval beside the skirt, closer to
the body in profile. The complete surface is reshaped while the shoulder
controller stays fixed and the upper arm overlaps its actual sleeve. Keeping
a large patch of the old surface produced a crease and was rejected in review.
Shoulder connectivity is now checked against the actual sleeve volume and
fixed controller, rather than assuming a particular vertex stays unchanged.
Original Basis/grip meshes, contact keys, sockets, all nineteen clips and the
six editions’ costumes/rounded rabbit ears remain.

Runtime pose selection also keeps empty paws down during head pats, tilts,
kisses, bows, head-only surprises, dances and celebrations. A wave uses the
authored waving paw while the other paw rests at the side. Held props and
baking retain their established contact poses. Photo Still/Wink resolves the
complete rest/held pose after switching, rather than freezing an intermediate
blend. No item default, gift marker, story progress or letter is reset.

Verification includes actual palm coordinates in each of the six exported
models: the old curl remained near x ±0.318 and front z 0.321 in game units.
The acceptance check requires the empty palms to sit beside the skirt at
|x| > 0.46 and back from the chest at z < 0.26, below y 0.66. It also checks
real shoulder/sleeve overlap and independent paw selection during a wave.
Front/profile renders and real-browser rotation captures supplement these
geometric checks. Full verification and publication are pending below.

All **212 automated checks** pass (88 Node/model/domain, 124 Vitest).
The corrected palms sit at approximately x ±0.510, y 0.603, front z 0.193
in game units (exact measurements are checked per edition). Both shoulder
controllers retain their original bind positions, and the rounded upper-arm
surfaces overlap the actual sleeves. Existing baking/prop contacts and all
19 clips pass. Blender source commit: `8f56330` in the private repository.
The six-project download includes the new sculpt and its reproducible script.

Publication verified: **v2.2.1**, candidate `85806115ca355716144c159273e4429604de104d`.
All **212 automated checks** and **18 browser suites** passed. All four browser
groups and the Pages deployment succeeded in
[run 42271529748](https://github.com/hmlim123/hellokittygame/actions/runs/42271529748),
publishing the exact immutable artifact that passed the complete release gate.

Published: <https://hmlim123.github.io/hellokittygame/?v=gift-20&update=natural-paws-30>.
All six characters were captured and reviewed from front and profile in the
real browser; Blender front/profile/three-quarter renders were reviewed too.
The new mesh has smooth rounded side arms, without the previous inward curl
or the crease seen in a rejected shoulder-pinning prototype. The browser checks
verify that the unoccupied paw remains down during a wave. Photo Wave → Still
and Wave → Wink resolve the complete resting pose. Optional flowers retain
their grip and survive reload. 320px touch/reduced motion and all five expressions
pass with zero page errors. Local baking/contact, tray, replay and both NPC
greetings passed again after the correction. Nancy’s progress and letter remain.
Physical phone/Mac Safari testing remains pending.

Blender source: `8f563301af67f2b652d49b6ae93c7eb6bee1acd1`.
Verified six-project archive: `/workspace/hello-kitty-natural-paws-blenders.zip`.
The website archive contains the tested candidate `85806115ca355716144c159273e4429604de104d`.
Review: `docs/kitty-natural-paws-front.png`, `docs/kitty-natural-paws-side.png`,
`docs/kitty-natural-paws-game-front.png`, `docs/kitty-natural-paws-game-side.png`.


### Bigger happy dance — v2.3.0

User request: replace the tiny dance with a visibly happy full performance.
Original Kitty and all five editions now have a six-second authored Blender
dance with eight step touches, alternating raised paws, two hops, happy eyes
and a cheer/bow finish. The matching occupied-paw take retains grip and all
footwork. Equipment changes preserve the beat; walking and other interactions
can interrupt. Reduced motion uses a still happy face. Existing rest shapes,
baking contacts, rounded bunny ears, progress and Nancy’s letter remain.

Source: `1595fd5` in hellokitty3D. Release verification is recorded below after
completion; physical phone/Mac Safari review remains pending.

Local verification: all **217 automated checks** pass (93 Node/model/domain,
124 Vitest). The new real-browser suite passes the full empty-paw and
occupied-paw dances, happy eyes, settled rest, item persistence after reload,
320px touch and static reduced motion, with no page errors. Model checks sample
all six routines at 60 Hz: broad paw rotation, lateral steps, both-foot hops,
actual mesh floor clearance and planted-foot stability. Grip and phase survive
equipment changes; waving interrupts cleanly. A rendered six-second browser
preview and step/cheer stills were reviewed. Publication gate is pending.

Review: `docs/kitty-happy-dance-step.png`, `docs/kitty-happy-dance-cheer.png`.
Six editable projects: `/workspace/hello-kitty-happy-dance-blenders.zip`.
Preview: `/workspace/hello-kitty-happy-dance-preview.mp4`.


All 217 automated checks and all 19 browser suites passed in run 42318797679.
The Pages deployment then exceeded its ten-minute job timeout; the run is
Cancelled, so publication is not yet verified. A guarded publication retry
checks the original source SHA, successful build and all four successful browser
jobs, then downloads that run’s exact unexpired tested-site artifact. It verifies
the embedded release commit before uploading; it does not rebuild or skip tests.
The recovery gives the publishing service twenty minutes within a 25-minute job.
The temporary push trigger is removed after this recovery completes.


Publication verified: **v2.3.0**, candidate `7e08a5a75988a928e1a9f58810059d27cb67b8a6`.
All **217 automated checks** and **19 browser suites** passed in
[run 42318797679](https://github.com/hmlim123/hellokittygame/actions/runs/42318797679).
The original ten-minute Pages job timed out after testing. The guarded recovery
verified all five successful build/browser jobs, source revision and immutable
artifact, then successfully published that exact tested artifact in
[run 42321499294](https://github.com/hmlim123/hellokittygame/actions/runs/42321499294).
Its source/artifact guards and Pages deployment steps all succeeded. No rebuild
or skipped test gate was used. The temporary push trigger and pinned fallback
inputs have been removed; future recovery requires an explicit workflow dispatch.
The guard was also checked locally against a valid run and eight rejection cases,
including failed/additional checks, missing jobs, wrong source and expired assets.

Published: <https://hmlim123.github.io/hellokittygame/?v=gift-20&update=happy-dance-31>.
Tap Happy dance. All six real Blender projects contain the six-second routine
and occupied-paw take. Local baking/contact, tray, replay and both NPC greeting
checks passed again with no page errors. Source archive checksums match private
Blender source `1595fd5`; the website archive contains candidate `7e08a5a`.
Nancy’s progress and letter remain. Physical phone/Mac Safari review is pending.
