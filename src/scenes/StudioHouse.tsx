import { useEffect, useMemo, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useGLTF, useCursor } from "@react-three/drei";
import * as THREE from "three";
import { assetUrl } from "../game/assets";
import { THEMES } from "../game/domain";
import { useGameStore } from "../game/store";
import { useHomeFurniture } from "./HomeDetails";
import { RainWindow } from "./RainWindow";
import { studioAnchor } from "./studio-layout";

function furnitureAction(object: THREE.Object3D | null) {
  while (object) {
    if (typeof object.userData.studio_action === "string")
      return object.userData.studio_action as string;
    object = object.parent;
  }
  return "";
}
/** The furniture and shell are exported from Nancy's editable Blender studio. */
export function StudioHouse() {
  const asset = useGLTF(assetUrl("assets/studio-home.glb"));
  const theme = useGameStore((s) => s.room.theme),
    night = useGameStore((s) => s.room.night);
  const interactive = useHomeFurniture();
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && interactive);
  const model = useMemo(() => {
    const root = asset.scene.clone(true),
      materials = new Map<THREE.Material, THREE.MeshStandardMaterial>(),
      nodes = new Map<string, THREE.Object3D>();
    root.traverse((o) => {
      nodes.set(o.name, o);
      if (o instanceof THREE.Mesh) {
        const clone = (m: THREE.Material) => {
          if (!materials.has(m))
            materials.set(m, m.clone() as THREE.MeshStandardMaterial);
          return materials.get(m)!;
        };
        o.material = Array.isArray(o.material)
          ? o.material.map(clone)
          : clone(o.material);
      }
    });
    const colors = new Map(
      [...materials.values()].map((m) => [m, m.color.clone()]),
    );
    return { root, materials, colors, nodes };
  }, [asset]);
  useEffect(() => () => model.materials.forEach((m) => m.dispose()), [model]);
  useEffect(() => {
    for (const m of model.materials.values()) {
      m.color.copy(model.colors.get(m)!);
      if (theme !== "rose") {
        const t = THEMES[theme];
        if (m.name === "Studio wall") m.color.set(t.wall);
        if (m.name === "Studio rose") m.color.set(t.rug);
        if (m.name === "Studio blush") m.color.set(t.accent);
      }
      if (m.name === "Studio warm light") m.emissiveIntensity = night ? 1.8 : 1;
    }
  }, [theme, night, model]);
  useFrame(({ camera, gl }) => {
    const s = useGameStore.getState();
    for (const name of ["Studio_BackWall", "Studio_UpperCabinets"]) {
      const node = model.nodes.get(name);
      if (node) node.visible = camera.position.z > 0.35;
    }
    for (const name of ["Studio_LeftWall", "Studio_Window", "Studio_Shelf"]) {
      const node = model.nodes.get(name);
      if (node) node.visible = camera.position.x > -0.42;
    }
    const picnic = model.nodes.get("Studio_PicnicMemory"),
      lantern = model.nodes.get("Studio_LanternMemory");
    if (picnic) picnic.visible = s.adventure.picnicDelivered;
    if (lantern) lantern.visible = s.adventure.lanternsBlessed;
    gl.domElement.dataset.studio = "blender";
    gl.domElement.dataset.studioNight = String(night);
  });
  const interact = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 7) return;
    e.stopPropagation();
    if (!interactive) return;
    const action = furnitureAction(e.object),
      s = useGameStore.getState();
    if (action === "baking") s.openPanel("baking");
    else if (action === "wardrobe") s.openPanel("inventory");
    else if (action === "letter") s.openPanel("letter");
    else if (action === "relax") s.openPanel("together");
    else if (action === "exit") s.enterVillage();
    else if (action === "sleep") {
      s.setNight(!s.room.night);
      s.react(
        s.room.night ? "wave" : "sleepy",
        s.room.night
          ? "Soft daylight fills your little studio. A new moment together. ♡"
          : "A cozy evening. Your bedside lamps are on, and there is no hurry. ♡",
      );
    }
  };
  const window = model.nodes.get("Studio_Window");
  return (
    <>
      <primitive
        object={model.root}
        dispose={null}
        onClick={interact}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHovered(Boolean(furnitureAction(e.object)));
        }}
        onPointerOut={() => setHovered(false)}
      />
      {window && <RainWindow window={window} />}
      {night && (
        <>
          <pointLight
            position={studioAnchor("lamp_bed")}
            intensity={3.5}
            color="#ffd79d"
            distance={5}
            decay={2}
          />
          <pointLight
            position={studioAnchor("lamp_desk")}
            intensity={3.5}
            color="#ffd79d"
            distance={5}
            decay={2}
          />
        </>
      )}
    </>
  );
}
