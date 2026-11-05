# Editing the game toys in Blender

The source project is `../hellokitty3D/hello_kitty_natural.blend` (Blender 4.3+).
It contains 13 named Kitty performances, paw sockets, Momo/Pip greetings, and
13 rounded prop assemblies. The original static and animated projects remain intact.

## On your Mac

1. Open the game edition in Blender and **Save As** a working copy before editing.
2. Use the timeline markers to find Stir, Cut, Present, Surprise, Bow, Celebrate,
   and Sip. Existing Dance, Wave, Wink and Offer sections remain at the beginning.
3. Select `CTRL_*` empties to edit poses in the Dope Sheet or Graph Editor.
   Keep object names and shoulder pivots; body/head use toy controls and the fused
   arms use Elbow_soft / Paw_soft morphs. There are no articulated fingers.
4. Expand **GAME — cozy props** or **GAME — friends** to edit matching models.
   `Socket_Paw_L/R`, `Socket_Teacup`, `Socket_Spoon` and `Socket_Tray` define the grips.
5. Export your working copy, then run the game:

```sh
cd path/to/hellokittygame
"/Applications/Blender.app/Contents/MacOS/Blender" \
  -b ../hellokitty3D/hello_kitty_natural.blend --python-exit-code 1 \
  --python scripts/export_blender.py
npm run dev
```

Substitute your saved working-copy path in `-b`. After exporting another edit,
restart `npm run dev` and reload the page so the fresh assets are copied again.
The exporter does not save or modify that input file. Rendered viewport shading previews the Blender studio;
the game has its own matching lighting in `src/scenes/CozyLights.tsx`.

## Source to gameplay

- In hellokitty3D, rebuild the first game edition with `create_game_assets.py`,
  then the natural edition with `create_natural_game.py`, then apply
  `refine_natural_flow.py`. These replace generated files; back up manual edits.
- `scripts/export_blender.py` exports the actual Kitty/control collections,
  converts the wink to morph targets, reduces meshes, and excludes the studio
  and authoring-only preview. Friends and props become separate small GLBs.
- `scripts/glb_clips.py` splits sampled object timelines into synchronized named
  glTF clips, interpolates boundaries, and removes unused timeline buffer data.
  Blender SCENE timestamps are frame/fps: frame 1 is 1/fps, not zero. The Stir
  loop closes at frame 216 before Cut starts at 217.
  Games consume names rather than hard-coded frame slices. Legacy models still load.
- `dist/assets/kitty-source.json` records the source repository, commit, file,
  SHA-256, frame ranges and fps. Each game release versions the model URLs.
- `dist/blender-kitty.js` preserves bind poses inside additive gaze/walk pivots.
  `KittyHeld` follows the live paw midpoint for a tray centered between the paws; cup, spoon and
  cutter use the individual paw sockets. The spoon has its own angled grip; the
  tray counters body lean and preserves the size authored in Blender. Nancy's actual cookie is composed on
  the tray by `CookieMesh`; its shape, icing and stamps remain saved normally.
- `ToyFriend` plays greetings on explicit dialogue or automatic NPC notices, and again after
  dismissal so the reading panel does not hide the response.
  Sleeping Pip keeps closed eyes; her wake transition opens the actual eye meshes.
- Baking follows recipe stages, conversation events greet, quest completions
  celebrate, and the tea ending lifts a cup. Reduced motion suppresses the motions.

The main Kitty GLB stays below 2.5 MB; friends and all props together are below
650 KB. No cloth simulation, fur, real-time shadows or grain are introduced.

## Verification

`npm test` checks the actual shipped GLB: named clip movement and reset, joined
shoulders, socket hierarchy, cup lift, friend motion, and small model payloads,
in addition to existing controls, save and quest rules. `npm run build` validates
TypeScript and prepares all assets. `npm run test:browser` includes the new
Blender-performance and connected cozy-life journeys, for 14 browser suites.
Physical iPhone/Mac Safari verification remains pending; Chromium emulation is
recorded separately and is not a substitute for that review.

## Natural interactive edition (v1.9)

`create_natural_game.py` builds `hello_kitty_natural.blend` from the preserved
first game edition. Body/head use rigid controls; the fused arms have
`Elbow_soft` / `Paw_soft` shape keys, keyed together with their sockets. Source
baking clips provide anticipation, contact, pressure, turning and settling.
The game damps an input clock toward the requested phase; it does not replay a
whole gesture on every pointer event. Keyboard and reduced-motion paths remain.
The oven has an `Oven_Door` hinge; the parcel, flower pot and moon cutter are
editable in the props collection. The character is below 2.5 MB and all friends
and props together remain below 650 KB. Export skips decimation on authored morph
meshes; topology reduction already happened before the keys were created.


## Contact polish (v1.9.1)

`refine_natural_flow.py` keeps the serving tray level, sizes it for the oven,
opens a real oven cavity, aligns the PlaceTray reach and return, and matches the
spoon/cutter contact to the worktop. The browser uses the rendered input phase
for the door and deposit, then waits for the visible motion before advancing.
An End-key slide follows the same motion. Replays return to the ready pose and
cannot replace an in-progress baking callback. The original kitchen camera is
retained so Kitty remains visible. Existing source editions and game saves stay
intact; no new activity is introduced.

## Five plush editions (v2.0)

The source repository now contains five complete portable projects:
`hello_kitty_plush_cloud.blend`, `hello_kitty_plush_witch.blend`,
`hello_kitty_plush_baby.blend`, `hello_kitty_plush_kitten.blend`, and
`hello_kitty_plush_bunny.blend`. Textures are packed and render paths are relative.
They preserve the original controls and all 13 named motions, with distinct soft
dances and a two-eye happy expression. The fused arms retain Elbow_soft / Paw_soft deformation. The corrected surface
is close-cropped fleece with a packed 512px normal map, subtle continuous nap
relief and stitched cheek whiskers. There is no exposed curly chin fringe.

Export a selected edition with the same command, substituting its filename.
`export_blender.py` recognizes the scene's `plush_variant`, writes
`dist/assets/plush/<id>.glb` and its source manifest, and leaves the base character,
friends and props untouched. The kitten/bunny hood opening is fitted to the head. `plush-collection.json` records all five source file hashes.

In game, choose Inventory → Clothes → Kitty’s plush collection. The original
character remains available. Models load on selection; a successful load commits
the shared `equipment.plush` field. Old saves retain their exact original schema.
Failed requests and late responses cannot silently change the selected Kitty.
A style follows Nancy into the room, adventure, baking, the photo corner and the
classic fallback. Saved postcards retain their style.

The base body stays at the original normalized scale, even under long ears or a
witch hat, to preserve paw/prop contact. The matte fleece uses the same packed normal texture in Blender and the game;
there are no loose curl meshes to resemble facial hair. The stuffed surface
receives pointer interactions. No particle simulations, alpha fur cards, film grain or
external decoder downloads are required.

### Silver Bunny ear fit (v2.0.2)

`refine_silver_bunny.py` in the source repository replaces the rigid oval ears
with curved stuffed surfaces and flush satin lining, using the original two
ear controls. Their roots sit inside a clean oval hood; the tips settle
independently during the dance and return to rest. The collection generator
calls the fitting after the fleece pass. It is idempotent.

The web exporter retains the fitted ear/lining topology and the oval head
surface, so mesh reduction cannot pull the lining away. The other editions,
all 13 motion clips, paw sockets, costumes and saved equipment remain compatible.

### Smooth matte finish (v2.0.3)

The collection generator finishes all five with `smooth_collection_finish.py`.
It removes fleece normal/bump textures, retains the original smooth sculpt and
paw morphs, and sets soft matte materials. Existing files were restored from
matching pre-fleece vertex data only; no animation, parenting or prop socket
was replaced. Silver Bunny uses rounded ear caps and a single oval head surface
without an overlapping hood shell. Its fitted lining and independent settling
remain intact.
