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
- Keep Nancy's personal letter empty until the author supplies the message.
- Never equate phone emulation with a physical device test.

## Milestones

| Stage | Status | Scope | Acceptance |
| --- | --- | --- | --- |
| 1. Polished controls | Delivered (browser verified) | Keyboard/touch reliability, turning, camera, obstacles, focus loss and area transitions. | Quick taps are retained, holds are smooth, newer turns survive walls, and release/cancel/focus loss stop safely in desktop and phone browser checks. |
| 2. One clear next goal | Queued next | One objective, nearby actions, missing-tool explanations, gentle optional hints. | A new player can find and revive the flowers using the game interface; record actual journey duration. |
| 3. Satisfying discoveries | Queued | Watering/bloom/reward feedback, optional sound, Kitty celebrations, reward-to-inventory-to-room connection. | Each reward is understandable, granted once, wearable at home and in the adventure, and connected to a revisitable memory. |
| 4. Consistent visual style | Queued | Pastel palette, lighting, rounded scenery, typography, icons, framing, and effect intensity. | Compare all screens in the target journey at desktop and phone sizes; maintain contrast, readable text, and a bright grain-free scene. |
| 5. Comfortable phone play | Queued | Touch targets, menus, scrolling, loading, orientation, and device-appropriate rendering. | Complete the journey on the target physical phone and laptop, recording browser/device and performance; fix overlap, input, or readability issues. |
| 6. Dependable progress/releases | Queued | Save feedback, visible version, backup/restore, interrupted sessions, migration, and automated browser release checks. | Reopen, restore, and upgrade saves without losing rewards; failed core-journey checks prevent publication. |

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
Stage 2 is the next implementation milestone; Stages 2–6 are not yet complete.
This environment has Chromium and phone touch emulation. Safari/WebKit and
physical iPhone/Mac testing are not available here; keep them on the device
review checklist and do not claim they passed.

## Delivery routine

1. Reproduce the gap and make a focused change.
2. Run meaningful unit/physics checks and relevant browser journeys.
3. Confirm saves and the existing three-button interface remain usable.
4. Publish the tested release and confirm the GitHub Pages workflow succeeds.
5. Record evidence and the next milestone here. Report any remaining device checks.
