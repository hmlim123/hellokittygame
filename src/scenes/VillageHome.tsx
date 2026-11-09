import { useGameStore } from "../game/store";
import { villageKeepsakes } from "../game/village";
import { Toy, type ToyName } from "./GameToys";
export function VillageHome() {
  const v = useGameStore((s) => s.cozy.village);
  const positions = {
    window: [-3.8, 1.08, -3.4],
    nook: [1.7, 0.03, 2.25],
    table: [3.15, 1.27, 1.5],
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
              if (e.delta < 8) {
                e.stopPropagation();
                useGameStore.getState().openPanel("village");
              }
            }}
          >
            <Toy name={models[k.id]} scale={k.id === "flowers" ? 0.65 : 0.6} />
          </group>
        ))}
    </>
  );
}
