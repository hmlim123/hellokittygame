import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import {
  LANTERN_COLORS,
  LANTERN_PLAZA,
  type Lantern,
} from "../../shared/lantern-evening.mjs";
import { useVisitsStore } from "../game/visits";

function LanternPost({ lamp, side }: { lamp: Lantern; side: number }) {
  const color = lamp.color ? LANTERN_COLORS[lamp.color].color : "#ecdfc7";
  return (
    <group position={[LANTERN_PLAZA.x + side * 1.45, 0, LANTERN_PLAZA.z + 1.22]}>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 0.1, 12]} />
        <meshStandardMaterial color="#c9a48a" />
      </mesh>
      <mesh position={[0, 0.57, 0]}>
        <cylinderGeometry args={[0.045, 0.055, 1.1, 9]} />
        <meshStandardMaterial color="#9f7969" />
      </mesh>
      <mesh position={[0, 1.34, 0]} scale={[1, 1.13, 1]}>
        <sphereGeometry args={[0.28, 16, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={lamp.lit ? color : "#000000"}
          emissiveIntensity={lamp.lit ? 0.72 : 0}
          roughness={0.86}
        />
      </mesh>
      {[1.05, 1.63].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.14, 0.14, 0.05, 14]} />
          <meshStandardMaterial color="#bd8865" />
        </mesh>
      ))}
      {lamp.lit && (
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.58, 24]} />
          <meshBasicMaterial color={color} opacity={0.22} transparent depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

export function VillageLanterns() {
  const canvas = useThree((s) => s.gl.domElement);
  const active = useVisitsStore((s) => !!s.role &&
    (s.status === "online" || s.status === "reconnecting"));
  const host = useVisitsStore((s) => s.lanternEvening?.host.color);
  const guest = useVisitsStore((s) => s.lanternEvening?.guest.color);
  const hostLit = useVisitsStore((s) => s.lanternEvening?.host.lit === true);
  const guestLit = useVisitsStore((s) => s.lanternEvening?.guest.lit === true);
  const visible = active && (!!host || !!guest);
  useEffect(() => {
    if (!visible) return;
    canvas.dataset.hostLantern = host ? `${host}-${hostLit ? "lit" : "paper"}` : "none";
    canvas.dataset.guestLantern = guest ? `${guest}-${guestLit ? "lit" : "paper"}` : "none";
    return () => {
      delete canvas.dataset.hostLantern;
      delete canvas.dataset.guestLantern;
    };
  }, [canvas, visible, host, guest, hostLit, guestLit]);
  if (!visible) return null;
  return (
    <>
      <LanternPost lamp={{ color: host ?? null, lit: hostLit }} side={-1} />
      <LanternPost lamp={{ color: guest ?? null, lit: guestLit }} side={1} />
    </>
  );
}
