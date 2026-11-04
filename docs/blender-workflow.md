# Editing the game toys in Blender

The source project is `../hellokitty3D/hello_kitty_game.blend` (Blender 4.3+).
It adds ten Kitty performances, paw sockets, Momo/Pip greetings, and ten rounded
prop assemblies. The original static and animated projects remain intact.

## On your Mac

1. Open the game edition in Blender and **Save As** a working copy before editing.
2. Use the timeline markers to find Stir, Cut, Present, Surprise, Bow, Celebrate,
   and Sip. Existing Dance, Wave, Wink and Offer sections remain at the beginning.
3. Select `CTRL_*` empties to edit poses in the Dope Sheet or Graph Editor.
   Keep object names and shoulder pivots; this is a rigid toy rig without fingers.
4. Expand **GAME — cozy props** or **GAME — friends** to edit matching models.
   `Socket_Paw_L/R`, `Socket_Teacup` and `Socket_Tray` define the grips.
5. Export your working copy, then run the game:

```sh
cd path/to/hellokittygame
"/Applications/Blender.app/Contents/MacOS/Blender" \
  -b ../hellokitty3D/hello_kitty_game.blend --python-exit-code 1 \
  --python scripts/export_blender.py
npm run dev
```

Substitute your saved working-copy path in `-b`. After exporting another edit,
restart `npm run dev` and reload the page so the fresh assets are copied again.
The exporter does not save or modify that input file. Rendered viewport shading previews the Blender studio;
the game has its own matching lighting in `src/scenes/CozyLights.tsx`.

## Source to gameplay

- `create_game_assets.py` in hellokitty3D rebuilds the new `.blend` reproducibly.
  It replaces only the game edition, so back up manual edits first.
- `scripts/export_blender.py` exports the actual Kitty/control collections,
  converts the wink to morph targets, reduces meshes, and excludes the studio
  and authoring-only preview. Friends and props become separate small GLBs.
- `scripts/glb_clips.py` splits sampled object timelines into synchronized named
  glTF clips, interpolates boundaries, and removes unused timeline buffer data.
  Games consume names rather than hard-coded frame slices. Legacy models still load.
- `dist/assets/kitty-source.json` records the source repository, commit, file,
  SHA-256, frame ranges and fps. Each game release versions the model URLs.
- `dist/blender-kitty.js` preserves bind poses inside additive gaze/walk pivots.
  `KittyHeld` follows the live paw midpoint for a tray centered between the paws; cup, spoon and
  cutter use the individual paw sockets. Nancy's actual cookie is composed on
  the tray by `CookieMesh`; its shape, icing and stamps remain saved normally.
- `ToyFriend` plays greetings on explicit dialogue or automatic NPC notices, and again after
  dismissal so the reading panel does not hide the response.
  Sleeping Pip keeps closed eyes; her wake transition opens the actual eye meshes.
- Baking follows recipe stages, conversation events greet, quest completions
  celebrate, and the tea ending lifts a cup. Reduced motion suppresses the motions.

The main Kitty GLB stays below 2 MB; friends and all props together are below
600 KB. No cloth simulation, fur, real-time shadows or grain are introduced.

## Verification

`npm test` checks the actual shipped GLB: named clip movement and reset, joined
shoulders, socket hierarchy, cup lift, friend motion, and small model payloads,
in addition to existing controls, save and quest rules. `npm run build` validates
TypeScript and prepares all assets. `npm run test:browser` includes the new
Blender-performance journey as well as the twelve previous release suites.
Physical iPhone/Mac Safari verification remains pending; Chromium emulation is
recorded separately and is not a substitute for that review.
