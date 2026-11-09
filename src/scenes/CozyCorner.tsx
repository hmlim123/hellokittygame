import { useGameStore } from "../game/store";
import { decorationUnlocked } from "../game/cozy";
import { Toy } from "./GameToys";
export function CozyCorner() {
  const c = useGameStore((s) => s.cozy),
    a = useGameStore((s) => s.adventure);
  const cushion = {
    rug: [1.9, 0.01, 1.1],
    chair: [-2.95, 1.07, -1.3],
    nook: [-1.6, 0.01, 2.2],
  } as const;
  const frame = {
    rug: [-3.9, 2.25, -3.6],
    chair: [-4.2, 2.1, 0.7],
    nook: [3.8, 2.1, -3.6],
  } as const;
  const flowers = {
    rug: [-3.8, 0.02, 1.1],
    chair: [-3.85, 0.02, -0.2],
    nook: [2.6, 0.02, -1.2],
  } as const;
  return (
    <>
      {!c.village.placed.welcome && (
        <Toy
          name="Cushion"
          position={[
            ...cushion[
              decorationUnlocked("cushion", c, a) ? c.corner.cushion : "rug"
            ],
          ]}
          scale={1.1}
        />
      )}
      {!c.village.placed.cafe && (
        <Toy
          name="Frame"
          position={[
            ...frame[
              decorationUnlocked("frame", c, a) ? c.corner.frame : "rug"
            ],
          ]}
          rotation={[0, c.corner.frame === "chair" ? Math.PI / 2 : 0, 0]}
          scale={0.8}
        />
      )}
      {decorationUnlocked("flowers", c, a) && !c.village.placed.flowers && (
        <Toy
          name="Flowers"
          position={[...flowers[c.corner.flowers]]}
          scale={0.9}
        />
      )}
    </>
  );
}
