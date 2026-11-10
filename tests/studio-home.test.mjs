import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
const bytes = await readFile(
  new URL("../dist/assets/studio-home.glb", import.meta.url),
);
const layout = JSON.parse(
  await readFile(new URL("../dist/assets/studio-home.json", import.meta.url)),
);
const { scene } = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
scene.updateMatrixWorld(true);
function station(o) {
  while (o) {
    if (o.userData.studio_action) return o.userData.studio_action;
    o = o.parent;
  }
  return "";
}
test("the Blender studio contains the full home within the mobile geometry budget", () => {
  assert.equal(bytes.length, layout.asset_bytes);
  assert.ok(bytes.length < 2500000);
  let triangles = 0;
  scene.traverse((o) => {
    if (o.isMesh)
      triangles +=
        (o.geometry.index?.count || o.geometry.attributes.position.count) / 3;
  });
  assert.equal(triangles, layout.triangles);
  assert.ok(triangles < 50000);
  for (const name of [
    "Bed",
    "Bathroom",
    "Kitchen",
    "Dining",
    "Sofa",
    "Wardrobe",
    "Desk",
    "Shelf",
    "Window",
    "Entry",
  ]) {
    const root = scene.getObjectByName("Studio_" + name);
    assert.ok(root, name);
    const size = new THREE.Box3()
      .setFromObject(root)
      .getSize(new THREE.Vector3());
    assert.ok(size.length() > 0.5, name + " has real geometry");
  }
  assert.match(layout.source_sha256, /^[a-f0-9]{64}$/);
  assert.match(layout.source_commit, /^[a-f0-9]{40}$/);
});
test("the oven, bed, wardrobe and desk are reachable from the whole-room view", () => {
  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
  camera.position
    .copy(new THREE.Vector3(0, 1.65, 0.15))
    .add(new THREE.Vector3(10, 11, 15).normalize().multiplyScalar(18));
  camera.lookAt(0, 1.65, 0.15);
  camera.updateMatrixWorld();
  for (const [name, action] of [
    ["oven", "baking"],
    ["bed", "sleep"],
    ["wardrobe", "wardrobe"],
    ["desk", "letter"],
    ["reading", "relax"],
  ]) {
    const point = new THREE.Vector3(...layout.anchors[name].position).project(
      camera,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(point.x, point.y), camera);
    const hit = ray.intersectObject(scene, true)[0];
    assert.equal(
      station(hit?.object),
      action,
      name + " must not be hidden behind another station",
    );
  }
});
test("saved decorations and Kitty are anchored to the actual exported furniture", () => {
  for (const name of [
    "window",
    "nook",
    "chair",
    "table",
    "kitty",
    ...Array.from({ length: 6 }, (_, i) => "shelf_" + i),
  ]) {
    const p = layout.anchors[name].position;
    const ray = new THREE.Raycaster(
      new THREE.Vector3(p[0], p[1] + 0.01, p[2]),
      new THREE.Vector3(0, -1, 0),
      0,
      0.25,
    );
    assert.ok(
      ray.intersectObject(scene, true).length,
      name + " needs a supporting surface",
    );
  }
  let anchors = 0;
  scene.traverse(o => {
    const name = o.userData.studio_anchor;
    if (!name) return;
    anchors++;
    const actual = o.getWorldPosition(new THREE.Vector3());
    const expected = new THREE.Vector3(...layout.anchors[name].position);
    assert.ok(actual.distanceTo(expected) < .0001, name + ' manifest must follow the exported furniture');
  });
  assert.equal(anchors, Object.keys(layout.anchors).length);
  const slots = Array.from({ length: 6 }, (_, i) =>
    layout.anchors["shelf_" + i].position.join(","),
  );
  assert.equal(new Set(slots).size, 6);
});
