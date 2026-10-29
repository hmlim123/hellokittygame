import { useMemo } from "react";
import { Html } from "@react-three/drei";
import { useGameStore } from "../game/store";
import { makeAdventureTool } from "./AdventureTools";
import { makeGift } from "../../dist/gifts.js";
import { makeBow } from "../../dist/models.js";
export function Souvenirs() {
  const a = useGameStore((s) => s.adventure),
    open = useGameStore((s) => s.openMemory),
    c = a.chapter;
  const objects = useMemo(
    () => ({
      ribbons: makeBow("#d989ab", 0.3),
      lanterns: makeAdventureTool("lantern"),
      letter: makeGift("letter"),
      flowers: makeAdventureTool("watering"),
    }),
    [],
  );
  const memories = [
    {
      id: "ribbons",
      show: a.ribbonReturned,
      position: [2.9, 1.27, 2.2] as [number, number, number],
      object: objects.ribbons,
      label: "Momo’s ribbon",
    },
    {
      id: "lanterns",
      show: a.lanternsBlessed,
      position: [3.12, 1.3, 1.68] as [number, number, number],
      object: null,
      label: "Garden lantern",
    },
    {
      id: "picnic",
      show: a.picnicDelivered,
      position: [1.85, 0.55, 2] as [number, number, number],
      object: null,
      label: "Picnic basket",
    },
    {
      id: "flowers",
      show: c.flowersRevived,
      position: [-2.25, 0.12, 1.4] as [number, number, number],
      object: objects.flowers,
      label: "The flower patch",
    },
    {
      id: "letter",
      show: c.letterFound,
      position: [2.6, 1.3, 1.45] as [number, number, number],
      object: objects.letter,
      label: "Nancy’s envelope",
    },
  ];
  return (
    <group>
      {memories
        .filter((m) => m.show)
        .map((m) => (
          <group
            key={m.id}
            position={m.position}
            onClick={(e) => {
              e.stopPropagation();
              if (e.delta < 7) open(m.id);
            }}
          >
            {m.object && (
              <primitive
                object={m.object}
                scale={m.id === "ribbons" ? 0.3 : 0.45}
              />
            )}
            <Html center position={[0, 0.3, 0]} zIndexRange={[2, 0]}>
              <button
                className="souvenir-label"
                aria-label={`Remember ${m.label}`}
                onClick={() => open(m.id)}
                title={`Remember ${m.label}`}
              >
                ♡ <span>{m.label}</span>
              </button>
            </Html>
          </group>
        ))}
    </group>
  );
}
