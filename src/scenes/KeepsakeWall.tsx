import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { type Group, Texture, SRGBColorSpace } from "three";
import { useGameStore } from "../game/store";
import type { PostcardMemory } from "../game/cozy";
function Picture({ image }: { image: string }) {
  const [texture, setTexture] = useState<Texture | null>(null);
  useEffect(() => {
    // A damaged local thumbnail must never reject the room's GLB loader.
    // Each frame owns and releases its texture instead of growing a loader cache.
    const photo = new Image();
    let active = true,
      owned: Texture | null = null;
    setTexture(null);
    photo.onload = () => {
      if (!active) return;
      owned = new Texture(photo);
      owned.colorSpace = SRGBColorSpace;
      owned.needsUpdate = true;
      setTexture(owned);
    };
    photo.onerror = () => {
      if (active) setTexture(null);
    };
    photo.src = image;
    return () => {
      active = false;
      photo.onload = null;
      photo.onerror = null;
      owned?.dispose();
      photo.src = "";
    };
  }, [image]);
  return (
    <mesh position={[0, 0, 0.04]}>
      <planeGeometry args={[0.56, 0.69]} />
      <meshBasicMaterial
        map={texture}
        color={texture ? "#ffffff" : "#fff2df"}
        toneMapped={false}
      />
    </mesh>
  );
}
function Frame({ memory, index }: { memory: PostcardMemory; index: number }) {
  return (
    <group
      position={[
        -3.95 + (index % 3) * 0.75,
        1.9 - Math.floor(index / 3) * 0.9,
        -3.59,
      ]}
      onClick={(e) => {
        e.stopPropagation();
        const s = useGameStore.getState();
        if (e.delta < 7 && !s.viewOnly && !s.mission?.active && !s.arrival)
          useGameStore.setState({ panel: "keepsakes", memoryPage: memory.id });
      }}
    >
      <mesh>
        <boxGeometry args={[0.65, 0.79, 0.065]} />
        <meshStandardMaterial color="#c6a385" />
      </mesh>
      <Picture image={memory.image} />
    </group>
  );
}
export function KeepsakeWall() {
  const cards = useGameStore((s) => s.cozy.postcards),
    group = useRef<Group>(null);
  useFrame(({ camera, gl }) => {
    if (group.current) group.current.visible = camera.position.z > 0.35;
    gl.domElement.dataset.keepsakeFrames = String(
      group.current?.children.length || 0,
    );
  });
  return (
    <group name="Nancy’s keepsake wall" ref={group}>
      {cards.map((p, i) => (
        <Frame key={p.id} memory={p} index={i} />
      ))}
    </group>
  );
}
