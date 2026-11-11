import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  makeBlenderKitty,
  blenderClips,
  reactBlender,
  updateBlender,
} from "../dist/blender-kitty.js";
const layout = JSON.parse(
  await readFile(new URL("../dist/assets/studio-home.json", import.meta.url)),
);
const load = async (path) => {
  const b = await readFile(new URL("../dist/assets/" + path, import.meta.url));
  return {
    bytes: b,
    gltf: await new GLTFLoader().parseAsync(
      b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
      "",
    ),
  };
};
const assets = [];
for (const style of ["classic", "cloud", "witch", "baby", "kitten", "bunny"]) {
  const { gltf } = await load(
      style === "classic" ? "hello-kitty.glb" : "plush/" + style + ".glb",
    ),
    home = await load("home-motion/" + style + ".glb");
  const meta = JSON.parse(
      await readFile(
        new URL(
          "../dist/assets/home-motion/" + style + ".json",
          import.meta.url,
        ),
      ),
    ),
    original = JSON.parse(
      await readFile(
        new URL(
          "../dist/assets/" +
            (style === "classic"
              ? "kitty-source.json"
              : "plush/" + style + "-source.json"),
          import.meta.url,
        ),
      ),
    );
  assets.push({
    style,
    meta,
    original,
    motion: home,
    asset: {
      scene: gltf.scene,
      clips: {
        ...blenderClips(gltf.animations),
        ...Object.fromEntries(home.gltf.animations.map((a) => [a.name, a])),
      },
    },
  });
}
const step = (hero, time) => {
  for (let t = 0; t < time - 1e-6; t += 1 / 60)
    updateBlender(hero, Math.min(1 / 60, time - t));
  hero.updateMatrixWorld(true);
};
function seated(asset) {
  const h = makeBlenderKitty(asset);
  h.scale.setScalar(0.9);
  const [x, y, z] = layout.anchors.tea_seat.position;
  h.position.set(x, y, z);
  h.rotation.y = layout.anchors.tea_seat.yaw;
  reactBlender(h, "sitDown");
  step(h, 1.49);
  return h;
}
test("all six small home libraries come from the matching original Blender character", () => {
  for (const a of assets) {
    assert.equal(
      a.meta.original_source_sha256,
      a.original.source_sha256,
      a.style,
    );
    assert.equal(a.meta.library, "cozy-home-v1");
    assert.ok(a.motion.bytes.length < 90000);
    let meshes = 0;
    a.motion.gltf.scene.traverse((o) => {
      if (o.isMesh) meshes++;
    });
    assert.equal(
      meshes,
      0,
      "motion library must not duplicate character geometry",
    );
    assert.deepEqual(
      a.motion.gltf.animations.map((a) => a.name).sort(),
      [
        "sitDown",
        "sitIdle",
        "cupIdle",
        "takeCup",
        "sipSit",
        "putCup",
        "standUp",
      ].sort(),
    );
  }
});
test("seated bodies fit the actual chair and their cups meet the Blender tray", () => {
  for (const a of assets) {
    const h = seated(a.asset),
      b = h.userData.blender,
      dress = b.model.getObjectByName("Strawberry_pink_rounded_dress");
    assert.ok(dress, a.style);
    const bottom = new THREE.Box3().setFromObject(dress).min.y;
    assert.ok(
      Math.abs(bottom - 0.75) < 0.045,
      a.style + " body/seat contact " + bottom,
    );
    reactBlender(h, "sitIdle");
    b.current.setLoop(THREE.LoopRepeat, Infinity);
    step(h, 12);
    assert.equal(b.current.getClip().name, "sitIdle");
    const cup = b.model.getObjectByName("Socket_Teacup"),
      rest = cup.getWorldPosition(new THREE.Vector3()),
      tray = new THREE.Vector3(...layout.anchors.tea_cup.position);
    assert.ok(
      rest.distanceTo(tray) < 0.035,
      a.style + " tray contact " + rest.distanceTo(tray),
    );
    b.heldAttachment = "cup";
    reactBlender(h, "takeCup");
    step(h, 0.99);
    const lifted = cup.getWorldPosition(new THREE.Vector3());
    assert.ok(
      lifted.y > rest.y + 0.025,
      a.style + " must lift the cup off the tray",
    );
    reactBlender(h, "sipSit");
    step(h, 1);
    const sipping = cup.getWorldPosition(new THREE.Vector3());
    assert.ok(
      sipping.y > lifted.y + 0.08,
      a.style + " cup must rise for a sip",
    );
  }
});
test("replacing the cup and standing restore the original floor pose without removing prior clips", () => {
  for (const a of assets) {
    const h = seated(a.asset),
      b = h.userData.blender;
    reactBlender(h, "putCup");
    step(h, 0.99);
    reactBlender(h, "standUp");
    step(h, 1.49);
    const foot = b.model.getObjectByName("Foot_-1");
    foot.updateWorldMatrix(true, false);
    const box = new THREE.Box3().setFromObject(foot);
    assert.ok(
      Math.abs(box.min.y - 0.145) < 0.012,
      a.style + " standing foot " + box.min.y,
    );
    assert.ok(
      b.actions.wave &&
        b.actions.dance &&
        b.actions.danceHeld &&
        b.actions.stir,
    );
    reactBlender(h, "wave");
    step(h, 0.75);
    assert.equal(b.current.getClip().name, "wave");
  }
});
