import { useMemo } from "react";
import { makeAdventureTool } from "./AdventureTools";
import { SceneHtml as Html } from "./SceneHtml";
import { useGameStore } from "../game/store";
import { makeGift } from "../../dist/gifts.js";
import { makeBow } from "../../dist/models.js";
import { TeaCup } from "./TeaParty";
import { studioAnchor } from "./studio-layout";
function FlowerKeepsake() {
  return (
    <group name="Flower patch keepsake" scale={0.55}>
      <mesh position={[0, 0.13, 0]}>
        <cylinderGeometry args={[0.24, 0.18, 0.26, 16]} />
        <meshStandardMaterial color="#e3a0b8" roughness={0.9} />
      </mesh>
      {[-0.12, 0.12].map((x, flower) => (
        <group key={x} position={[x, 0.28, 0]}>
          <mesh position={[0, 0.19, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.38, 8]} />
            <meshStandardMaterial color="#8bad91" />
          </mesh>
          {Array.from({ length: 5 }, (_, i) => {
            const a = (i * Math.PI * 2) / 5;
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * 0.095, 0.42 + Math.sin(a) * 0.095, 0]}
                scale={[0.075, 0.075, 0.03]}
              >
                <sphereGeometry args={[1, 10, 8]} />
                <meshStandardMaterial color={flower ? "#f5df9c" : "#f0b6cc"} />
              </mesh>
            );
          })}
          <mesh position={[0, 0.42, 0.025]}>
            <sphereGeometry args={[0.045, 10, 8]} />
            <meshStandardMaterial color="#ebc268" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
export function Souvenirs() {
  const tea = useGameStore((s) => s.cozy.tea);
  const a = useGameStore((s) => s.adventure),
    open = useGameStore((s) => s.openMemory),
    c = a.chapter;
  const objects = useMemo(
    () => ({
      ribbons: makeBow("#d989ab", 0.3),
      lanterns: makeAdventureTool("lantern"),
      letter: makeGift("letter"),
    }),
    [],
  );
  const memories = [
    {
      id: "ribbons",
      show: a.ribbonReturned,
      position: studioAnchor("ribbon"),
      object: objects.ribbons,
      label: "Momo’s ribbon",
    },
    {
      id: "lanterns",
      show: a.lanternsBlessed,
      position: studioAnchor("lantern"),
      object: null,
      label: "Garden lantern",
    },
    {
      id: "picnic",
      show: a.picnicDelivered,
      position: studioAnchor("picnic"),
      object: null,
      label: "Picnic basket",
    },
    {
      id: "flowers",
      show: c.flowersRevived,
      position: studioAnchor("flowers"),
      object: null,
      label: "The flower patch",
    },
    {
      id: "letter",
      show: c.letterFound,
      position: studioAnchor("letter"),
      object: objects.letter,
      label: "Nancy’s envelope",
    },
  ];
  return (
    <group>
      {tea.complete && (
        <group
          position={studioAnchor("tea")}
          scale={0.75}
          onClick={(e) => {
            e.stopPropagation();
            if (e.delta < 7) useGameStore.getState().openMemory("tea");
          }}
        >
          <TeaCup />
          <Html center position={[0, 0.55, 0]} zIndexRange={[2, 0]}>
            <button
              className="souvenir-label"
              aria-label="Remember Moonlight tea party"
              onClick={() => useGameStore.getState().openMemory("tea")}
            >
              ☾ <span>Our little tea party</span>
            </button>
          </Html>
        </group>
      )}
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
            {m.id === "flowers" && <FlowerKeepsake />}
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
