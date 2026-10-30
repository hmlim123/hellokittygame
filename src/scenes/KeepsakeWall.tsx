import { Component, Suspense, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { type Group, SRGBColorSpace } from "three";
import { useGameStore } from "../game/store";
import type { PostcardMemory } from "../game/cozy";
class PictureBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <mesh position={[0, 0, 0.04]}>
        <planeGeometry args={[0.56, 0.69]} />
        <meshBasicMaterial color="#fff2df" />
      </mesh>
    ) : (
      this.props.children
    );
  }
}
function Picture({ image }: { image: string }) {
  const texture = useTexture(image);
  texture.colorSpace = SRGBColorSpace;
  return (
    <mesh position={[0, 0, 0.04]}>
      <planeGeometry args={[0.56, 0.69]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
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
        if (e.delta < 7 && !useGameStore.getState().viewOnly)
          useGameStore.setState({ panel: "keepsakes", memoryPage: memory.id });
      }}
    >
      <mesh>
        <boxGeometry args={[0.65, 0.79, 0.065]} />
        <meshStandardMaterial color="#c6a385" />
      </mesh>
      <PictureBoundary>
        <Suspense fallback={null}>
          <Picture image={memory.image} />
        </Suspense>
      </PictureBoundary>
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
      <Suspense fallback={null}>
        {cards.map((p, i) => (
          <Frame key={p.id} memory={p} index={i} />
        ))}
      </Suspense>
    </group>
  );
}
