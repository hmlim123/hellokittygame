import { useEffect, useState } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Group } from "three";
import { assetUrl } from "../game/assets";
import { chooseShelfFriend } from "./select-friend";
import { useGameStore } from "../game/store";
const resources = new Map<string, Promise<Group>>();
function miniature(style: string) {
  let resource = resources.get(style);
  if (!resource) {
    resource = new GLTFLoader()
      .loadAsync(assetUrl("assets/shelf/" + style + ".glb"))
      .then((g) => g.scene)
      .catch((error) => {
        resources.delete(style);
        throw error;
      });
    resources.set(style, resource);
  }
  return resource;
}
export function ShelfFriend({
  id,
  style,
  position,
  visible = true,
  scale = 0.43,
  rotation,
}: {
  id: number;
  style: string;
  position: [number, number, number];
  visible?: boolean;
  scale?: number;
  rotation?: [number, number, number];
}) {
  const [model, setModel] = useState<Group | null>(null);
  useEffect(() => {
    let active = true;
    miniature(style)
      .then((scene) => {
        if (active) setModel(scene.clone(true));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [style]);
  return model ? (
    <primitive
      object={model}
      visible={visible}
      position={position}
      scale={scale}
      rotation={rotation}
      dispose={null}
      onClick={(e: { delta: number; stopPropagation(): void }) => {
        if (e.delta > 7) return;
        e.stopPropagation();
        void chooseShelfFriend(id).catch(() =>
          useGameStore
            .getState()
            .react(
              "tilt",
              "This little friend needs a moment to get ready. Try again.",
            ),
        );
      }}
    />
  ) : null;
}
