import { useGameStore } from "../game/store";
import { decorationUnlocked } from "../game/cozy";
import { Toy } from "./GameToys";
import { studioAnchor, studioYaw } from "./studio-layout";
export function CozyCorner() {
  const c = useGameStore((s) => s.cozy),
    a = useGameStore((s) => s.adventure);
  const cushion = {
    rug: studioAnchor("rug"),
    chair: studioAnchor("chair"),
    nook: studioAnchor("floor_nook"),
  };
  const frame = {
    rug: studioAnchor("frame_back"),
    chair: studioAnchor("frame_wall"),
    nook: studioAnchor("frame_nook"),
  };
  const flowers = {
    rug: studioAnchor("floor_nook"),
    chair: studioAnchor("window"),
    nook: studioAnchor("tea"),
  };
  const frameSpot = decorationUnlocked("frame", c, a) ? c.corner.frame : "rug";
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
          position={frame[frameSpot]}
          rotation={[
            0,
            studioYaw(
              frameSpot === "chair"
                ? "frame_wall"
                : frameSpot === "nook"
                  ? "frame_nook"
                  : "frame_back",
            ),
            0,
          ]}
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
