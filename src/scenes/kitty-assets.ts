import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Group, AnimationClip } from "three";
import { blenderClips } from "../../dist/blender-kitty.js";
import { PLUSH_STYLES } from "../../dist/plush-state.js";
import { assetUrl } from "../game/assets";
interface KittyAsset {
  scene: Group;
  clips: Record<string, AnimationClip>;
}
interface Resource {
  promise: Promise<KittyAsset>;
  value?: KittyAsset;
  error?: Error;
}
const resources = new Map<string, Resource>();
function resource(style = "classic"): Resource {
  const definition =
    PLUSH_STYLES.find((s) => s.id === style) || PLUSH_STYLES[0];
  let entry = resources.get(definition.id);
  if (!entry) {
    const current = {} as Resource;
    current.promise = new GLTFLoader()
      .loadAsync(assetUrl("assets/" + definition.file))
      .then(
        (gltf) =>
          (current.value = {
            scene: gltf.scene,
            clips: blenderClips(gltf.animations),
          }),
      )
      .catch((error) => {
        current.error =
          error instanceof Error ? error : new Error("Kitty could not load");
        throw current.error;
      });
    entry = current;
    resources.set(definition.id, entry);
  }
  return entry;
}
/** Shared, lazy resources keep all scenes on the same selected Blender model. */
export function readKittyAsset(style?: string): KittyAsset {
  const entry = resource(style);
  if (entry.error) throw entry.error;
  if (!entry.value) throw entry.promise;
  return entry.value;
}
export function prepareKittyStyle(style: string) {
  const entry = resource(style);
  // A later explicit selection may retry a failed request. The current Kitty
  // remains in place until the replacement has fully loaded.
  if (entry.error) {
    resources.delete(style);
    return resource(style).promise;
  }
  return entry.promise;
}
