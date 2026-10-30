# Nancy's game: production plan

Agreed with the user on 2026-10-29. This document preserves the plan between
sessions. Deliver and verify one milestone at a time, with a focused release
and a short explanation of what changed. The roadmap is not a claim that every
stage has already shipped.

## Target journey

Enter Butterfly Glade → follow the butterflies → revive the flowers → earn a
cosmetic reward → return to Kitty's room → equip the reward → revisit the memory.

Aim for a comfortable 5–10 minute first journey. Measure this with a first-time
playthrough during Stage 2; automated test runtime does not measure playtime.
Reuse existing quests, equipment, souvenirs, and storybook pages where possible.

## Guardrails

- Preserve the three main room buttons, existing saves, and the actual Blender model.
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
