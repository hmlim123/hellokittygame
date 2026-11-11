import { useHomeMotion } from "../game/home-motion";
import type { HomeAction } from "../game/home-world";
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
      materials = new Map<string, THREE.MeshStandardMaterial>(),
      nodes = new Map<string, THREE.Object3D>();
    root.traverse((o) => {
      nodes.set(o.name, o);
      if (o instanceof THREE.Mesh) {
        const clone = (m: THREE.Material) => {
          let station: THREE.Object3D = o;
          while (station.parent && station.parent !== root)
            station = station.parent;
          const key = station.name + ":" + m.uuid;
          if (!materials.has(key))
            materials.set(key, m.clone() as THREE.MeshStandardMaterial);
          return materials.get(key)!;
        };
        o.material = Array.isArray(o.material)
          ? o.material.map(clone)
          : clone(o.material);
      }
    });
    const colors = new Map(
      [...materials.values()].map((m) => [m, m.color.clone()]),
    );
    const occluders = [
      "Studio_Wardrobe",
      "Studio_Bathroom",
      "Studio_Shelf",
      "Studio_UpperCabinets",
      "Studio_BackWall",
      "Studio_LeftWall",
    ].map((name) => {
      const node = nodes.get(name)!;
      const mats = new Set<THREE.MeshStandardMaterial>();
      node.traverse((o) => {
        if (o instanceof THREE.Mesh)
          for (const m of Array.isArray(o.material)
            ? o.material
            : [o.material]) {
            const mat = m as THREE.MeshStandardMaterial;
            mat.transparent = true;
            mats.add(mat);
          }
      });
      return {
        node,
        mats,
        box: new THREE.Box3().setFromObject(node).expandByScalar(0.45),
        alpha: 1,
      };
    });
    return { root, materials, colors, nodes, occluders };
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
  const ray = useMemo(() => new THREE.Ray(), []),
    point = useMemo(() => new THREE.Vector3(), []),
    hit = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, gl }, dt) => {
    const s = useGameStore.getState();
    for (const name of ["Studio_BackWall", "Studio_UpperCabinets"]) {
      const node = model.nodes.get(name);
      if (node) node.visible = camera.position.z > 0.35;
    }
    for (const name of ["Studio_LeftWall", "Studio_Window", "Studio_Shelf"]) {
      const node = model.nodes.get(name);
      if (node)
        node.visible =
          camera.position.x >
          (useHomeMotion.getState().camera === "follow" &&
          !s.mission &&
          !s.arrival
            ? -5.6
            : -0.42);
    }
    const picnic = model.nodes.get("Studio_PicnicMemory"),
      lantern = model.nodes.get("Studio_LanternMemory");
    if (picnic) picnic.visible = s.adventure.picnicDelivered;
    if (lantern) lantern.visible = s.adventure.lanternsBlessed;
    const motion = useHomeMotion.getState();
    point.set(motion.visual.x, 1.15, motion.visual.z);
    const distance = camera.position.distanceTo(point);
    ray.set(camera.position, point.clone().sub(camera.position).normalize());
    let faded = 0;
    for (const o of model.occluders) {
      const blocks =
        motion.camera === "follow" &&
        !s.mission &&
        !s.arrival &&
        o.node.visible &&
        ray.intersectBox(o.box, hit) &&
        camera.position.distanceTo(hit) < distance - 0.35;
      const target = blocks ? 0.16 : 1;
      o.alpha += (target - o.alpha) * (1 - Math.exp(-Math.min(dt, 0.1) * 14));
      if (o.alpha < 0.98) faded++;
      for (const m of o.mats) {
        m.opacity = o.alpha;
        m.depthWrite = o.alpha > 0.98;
      }
    }
    gl.domElement.dataset.homeOccluders = String(faded);
    gl.domElement.dataset.studio = "blender";
    gl.domElement.dataset.studioNight = String(night);
  });
  const interact = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 7) return;
    e.stopPropagation();
    if (!interactive) return;
    if (
      performance.now() <
      Number(
        (e.nativeEvent.target as HTMLCanvasElement)?.dataset?.homeIgnoreTap ||
          0,
      )
    )
      return;
    const action = furnitureAction(e.object);
    if (action) useHomeMotion.getState().visit(action as HomeAction);
    else useHomeMotion.getState().walkTo({ x: e.point.x, z: e.point.z });
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
