import { useGameStore } from "../game/store";
import { villageKeepsakes } from "../game/village";
import { Toy, type ToyName } from "./GameToys";
import { useHomeFurniture } from "./HomeDetails";
export function VillageHome() {
  const v = useGameStore((s) => s.cozy.village),
    interactive = useHomeFurniture();
  const positions = {
    window: [-4.15, 1.86, -0.7],
    nook: [-1.65, 0.115, -1],
    table: [3.15, 1.24, 1.5],
  } as const;
  const models: Record<string, ToyName> = {
    welcome: "Cushion",
    flowers: "Flowers",
    cafe: "Frame",
  };
  return (
    <>
      {villageKeepsakes(v)
        .filter((k) => v.placed[k.id])
        .map((k) => (
          <group
            key={k.id}
            position={[...positions[v.placed[k.id]!]]}
            onClick={(e) => {
              if (interactive && e.delta < 8) {
                e.stopPropagation();
                useGameStore.getState().openPanel("village");
              }
            }}
          >
            <Toy
              name={models[k.id]}
              scale={k.id === "flowers" ? 0.65 : 0.6}
              rotation={[0, v.placed[k.id] === "window" ? Math.PI / 2 : 0, 0]}
            />
          </group>
        ))}
    </>
  );
}
