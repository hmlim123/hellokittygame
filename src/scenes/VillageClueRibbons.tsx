import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { clueStop } from "../../shared/clue-trail.mjs";
import { useVisitsStore } from "../game/visits";

function Ribbon({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group position={[x, 0.72, z]}>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.19, 0.04, 0]} rotation={[0, 0, -side * 0.25]} scale={[1.5, 0.95, 0.54]}>
            <sphereGeometry args={[0.145, 12, 8]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[side * 0.11, -0.16, 0.015]} rotation={[0, 0, side * 0.33]}>
            <boxGeometry args={[0.12, 0.28, 0.045]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      ))}
      <mesh scale={[0.85, 1.15, 0.75]}>
        <sphereGeometry args={[0.115, 12, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

export function VillageClueRibbons() {
  const trail = useVisitsStore((s) => s.clueTrail);
  const role = useVisitsStore((s) => s.role);
  const canvas = useThree((s) => s.gl.domElement);
  const stop = role && clueStop(trail?.destination);
  const hostFound = role === "host" ? trail?.ownSearched : trail?.partnerSearched;
  const guestFound = role === "guest" ? trail?.ownSearched : trail?.partnerSearched;
  useEffect(() => {
    if (!stop) return;
    canvas.dataset.clueRibbons = String(Number(!hostFound) + Number(!guestFound));
    return () => { delete canvas.dataset.clueRibbons; };
  }, [canvas, stop, hostFound, guestFound]);

  if (!stop) return null;
  return (
    <>
      {!hostFound && <Ribbon x={stop.x - 0.84} z={stop.z + 0.48} color="#d783a3" />}
      {!guestFound && <Ribbon x={stop.x + 0.84} z={stop.z + 0.48} color="#9b7fc3" />}
    </>
  );
}
