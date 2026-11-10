import { useGameStore } from "../game/store";
import { villageKeepsakes } from "../game/village";
import { Toy, type ToyName } from "./GameToys";
import { useHomeFurniture } from "./HomeDetails";
import { studioAnchor, studioYaw } from "./studio-layout";
export function VillageHome() {
  const v = useGameStore((s) => s.cozy.village),
    interactive = useHomeFurniture();
  const positions = {
    window: studioAnchor("window"),
    nook: studioAnchor("nook"),
    table: studioAnchor("table"),
  };
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
              rotation={[0, studioYaw(v.placed[k.id]!), 0]}
            />
          </group>
        ))}
    </>
  );
}
