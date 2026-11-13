import { createPortal } from "@react-three/fiber";
import {
  Component,
  type ReactNode,
  Suspense,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useKittyAsset, useReducedMotion } from "./Kitty";
import { readMelodyAsset, makeMelody, disposeMelody } from "./melody-model";
import { makeBlenderKitty } from "../../dist/blender-kitty.js";
import { applyHeroEquipment } from "./AdventureTools";
import { assetUrl } from "../game/assets";
import { useVisitsStore, type VisitPlayer } from "../game/visits";
import { CozyLights } from "./CozyLights";
import { updateWalking } from "./walk-animation";

// The original meshes and editable Blender controller libraries share a rig.
// Imported translations must be relative to the loader's additive bind pivots.
function Actor({
  actor,
  melody = false,
}: {
  actor: VisitPlayer;
  melody?: boolean;
}) {
  return melody ? <MelodyActor actor={actor} /> : <KittyActor actor={actor} />;
}
function MelodyActor({ actor }: { actor: VisitPlayer }) {
  const asset = readMelodyAsset(),
    hero = useMemo(() => makeMelody(asset), [asset]);
  useEffect(() => () => disposeMelody(hero), [hero]);
  return <Performance hero={hero} actor={actor} style="melody" />;
}
function KittyActor({ actor }: { actor: VisitPlayer }) {
  const asset = useKittyAsset(actor.appearance.plush || undefined),
    hero = useMemo(() => makeBlenderKitty(asset, 0), [asset]);
  useEffect(() => {
    applyHeroEquipment(hero, {
      version: 1,
      outfit: actor.appearance.outfit,
      item: "none",
      ...(actor.appearance.plush ? { plush: actor.appearance.plush } : {}),
    });
    return () => {
      hero.userData.blender.mixer.stopAllAction();
      hero.traverse((o: THREE.Object3D) => {
        if (o instanceof THREE.Mesh)
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            m.dispose();
      });
    };
  }, [hero, actor.appearance.outfit, actor.appearance.plush]);
  return (
    <Performance
      hero={hero}
      actor={actor}
      style={actor.appearance.plush || "classic"}
    />
  );
}
function Performance({
  hero,
  actor,
  style,
}: {
  hero: THREE.Group;
  actor: VisitPlayer;
  style: string;
}) {
  const gltf = useGLTF(assetUrl("assets/together-motion/" + style + ".glb")),
    group = useRef<THREE.Group>(null),
    reduced = useReducedMotion();
  const moment = useVisitsStore((s) => s.together);
  const mixing = moment?.action === "stir" && actor.id === "host";
  const decorating = moment?.action === "decorate" && actor.id === "guest";
  const presenting = moment?.action === "present";
  const grip = useMemo(() => {
    const source = gltf.scene.getObjectByName("Together_Grip_R");
    const socket = new THREE.Group();
    if (source) socket.position.copy(source.position);
    hero.userData.blender.model.getObjectByName("CTRL_Arm_R")?.add(socket);
    return socket;
  }, [hero, gltf]);
  useEffect(
    () => () => {
      grip.removeFromParent();
    },
    [grip],
  );
  const animation = useMemo(() => {
    const model = hero.userData.blender.model as THREE.Group;
    const mixer = new THREE.AnimationMixer(model);
    const clips = Object.fromEntries(
      gltf.animations.map((source) => {
        const clip = source.clone();
        clip.tracks = clip.tracks.filter((track) =>
          model.getObjectByName(track.name.split(".")[0]),
        );
        for (const track of clip.tracks) {
          const [name, property] = track.name.split("."),
            control = model.getObjectByName(name)!;
          if (
            property === "position" &&
            control.parent &&
            /^(Idle_|Walk_)/.test(control.parent.name)
          )
            for (let i = 0; i < track.values.length; i++)
              track.values[i] -= control.parent.position.getComponent(i % 3);
        }
        const action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        return [clip.name, action];
      }),
    );
    return { mixer, clips, current: "" };
  }, [hero, gltf]);
  useEffect(
    () => () => {
      animation.mixer.stopAllAction();
      animation.mixer.uncacheRoot(hero.userData.blender.model);
    },
    [animation, hero],
  );
  useFrame(({ invalidate }, dt) => {
    const s = useVisitsStore.getState(),
      moment = s.together,
      elapsed = moment ? (Date.now() + s.clockOffset - moment.at) / 1000 : 5,
      kind = moment?.action || "wave",
      host = actor.id === "host",
      highfive = kind === "highfive",
      baking = ["stir", "decorate", "present"].includes(kind),
      pose = kind === "photo",
      approaching = highfive && elapsed < 0.6 && elapsed >= 0,
      t = THREE.MathUtils.clamp(
        elapsed - (highfive ? 0.6 : 0),
        0,
        baking ? 4 : 3,
      ),
      clip =
        kind === "highfive"
          ? host
            ? "togetherHighfiveR"
            : "togetherHighfiveL"
          : kind === "celebrate"
            ? "togetherCelebrate"
            : kind === "stir"
              ? host
                ? "togetherStir"
                : "togetherWave"
              : kind === "decorate"
                ? host
                  ? "togetherWave"
                  : "togetherDecorate"
                : kind === "present"
                  ? "togetherPresent"
                  : "togetherWave";
    if (moment && elapsed < (baking ? 4.5 : 4.2)) invalidate();
    const active =
      kind !== "cancel" && elapsed >= 0 && elapsed < (baking ? 4 : 3.6);
    const action = animation.clips[clip];
    if (animation.current !== clip) {
      animation.clips[animation.current]?.fadeOut(0.25);
      action?.reset().fadeIn(0.25).play();
      animation.current = clip;
    }
    // Sampling absolute shared time keeps both clients aligned after suspension.
    if (action) {
      action.paused = true;
      action.time =
        reduced || !active
          ? action.getClip().duration
          : pose
            ? moment?.pose === "wave"
              ? 1
              : 3
            : t;
      animation.mixer.update(Math.min(dt, 0.1));
    }
    const occupied =
      baking &&
      ((kind === "stir" && host) ||
        (kind === "decorate" && !host) ||
        kind === "present");
    const smooth = (v: number) => {
      const x = THREE.MathUtils.clamp(v, 0, 1);
      return x * x * (3 - 2 * x);
    };
    const normalized = t / 4,
      envelope =
        occupied && active
          ? smooth((normalized - 0.125) / (0.333333 - 0.125)) *
            (1 - smooth((normalized - 0.416667) / (0.875 - 0.416667)))
          : 0;
    hero.traverse((o) => {
      if (
        o instanceof THREE.Mesh &&
        o.morphTargetDictionary &&
        o.morphTargetInfluences
      ) {
        for (const name of ["EmptyRest", "Elbow_soft", "Paw_soft"]) {
          const i = o.morphTargetDictionary[name];
          if (i !== undefined)
            o.morphTargetInfluences[i] =
              name === "EmptyRest" ? 1 - envelope : 0;
        }
      }
    });
    if (group.current) {
      const side = host ? -1 : 1,
        distance = highfive
          ? approaching
            ? 0.85 - 0.43 * smooth(elapsed / 0.6)
            : active
              ? 0.42
              : 0.42 + 0.43 * smooth((elapsed - 3.6) / 0.6)
          : 0.85;
      group.current.position.x = side * distance;
      group.current.rotation.z =
        pose && moment?.pose === "lean" ? side * 0.08 : 0;
      group.current.rotation.y = THREE.MathUtils.damp(
        group.current.rotation.y,
        highfive && active ? (host ? Math.PI / 2 : -Math.PI / 2) : 0,
        18,
        Math.min(dt, 0.1),
      );
      if (approaching && !reduced) updateWalking(hero, dt, 1.2, false);
    }
  });
  return (
    <group ref={group}>
      <primitive object={hero} scale={0.78} dispose={null} />
      {(mixing || decorating) && (
        <group
          position={[
            0.24,
            style === "melody" ? 0.43 : 0.48,
            style === "melody" ? 0.21 : 0.4,
          ]}
        >
          <mesh position={[0, -0.12, 0]}>
            <cylinderGeometry args={[0.27, 0.3, 0.07, 24]} />
            <meshStandardMaterial color="#cda58b" />
          </mesh>
          <mesh>
            <sphereGeometry
              args={[0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]}
            />
            <meshStandardMaterial
              color={mixing ? "#ead0a0" : "#edbbce"}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}
      {mixing &&
        createPortal(
          <mesh position={[0, -0.07, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.22, 12]} />
            <meshStandardMaterial color="#bd9478" />
          </mesh>,
          grip,
        )}
      {decorating &&
        createPortal(
          <mesh position={[0, -0.04, 0]}>
            <coneGeometry args={[0.065, 0.19, 16]} />
            <meshStandardMaterial color="#e8a9c5" />
          </mesh>,
          grip,
        )}
      {presenting &&
        createPortal(
          <group position={[0, -0.04, 0]}>
            <mesh>
              <boxGeometry args={[0.45, 0.035, 0.27]} />
              <meshStandardMaterial color="#f2c4d2" />
            </mesh>
            {[-0.13, 0, 0.13].map((x) => (
              <mesh
                key={x}
                position={[x, 0.035, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <cylinderGeometry args={[0.055, 0.055, 0.025, 16]} />
                <meshStandardMaterial color="#d7aa76" />
              </mesh>
            ))}
          </group>,
          grip,
        )}
    </group>
  );
}
function Capture({
  capture,
}: {
  capture: React.RefObject<(() => string) | null>;
}) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    capture.current = () => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL("image/png");
    };
    return () => {
      capture.current = null;
    };
  }, [gl, scene, camera, capture]);
  return null;
}
function GentleRain() {
  const ref = useRef<THREE.InstancedMesh>(null),
    dummy = useMemo(() => new THREE.Object3D(), []),
    reduced = useReducedMotion();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    for (let i = 0; i < 40; i++) {
      dummy.position.set(
        (((i * 29) % 101) / 101) * 8 - 4,
        5 -
          ((((i * 47) % 103) / 103 + (reduced ? 0 : clock.elapsedTime * 0.3)) %
            1) *
            6,
        -1 - ((i * 13) % 7) * 0.2,
      );
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 40]}>
      <cylinderGeometry args={[0.007, 0.007, 0.14, 4]} />
      <meshBasicMaterial color="#91aabd" />
    </instancedMesh>
  );
}
function Framing({ closeup }: { closeup: boolean }) {
  const { camera, invalidate } = useThree();
  useEffect(() => {
    camera.position.set(0, closeup ? 1.6 : 2, closeup ? 3.6 : 6.5);
    camera.lookAt(0, closeup ? 1.3 : .9, 0);
    camera.updateProjectionMatrix(); invalidate();
  }, [camera, closeup, invalidate]);
  return null;
}
function Preview({
  capture,
  closeup,
}: {
  capture: React.RefObject<(() => string) | null>;
  closeup: boolean;
}) {
  const players = useVisitsStore((s) => s.players),
    role = useVisitsStore((s) => s.role),
    weather = useVisitsStore((s) => s.together?.weather || "sunshine");
  return (
    <div
      className={"together-preview" + (closeup ? " closeup" : "")}
      aria-label={
        closeup
          ? "Your partner’s character"
          : "Hello Kitty and My Melody together"
      }
    >
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        camera={{
          position: [0, closeup ? 1.6 : 2, closeup ? 3.6 : 6.5],
          fov: 36,
        }}
        gl={{ preserveDrawingBuffer: true }}
        onCreated={({ camera }) => camera.lookAt(0, closeup ? 1.3 : 0.9, 0)}
      >
        <color
          attach="background"
          args={[
            weather === "sunset"
              ? "#edc4c7"
              : weather === "rain"
                ? "#cdd7e5"
                : "#e3eddc",
          ]}
        />
        {weather === "rain" && <GentleRain />}
        <CozyLights evening={weather === "sunset"} rainy={weather === "rain"} />
        <Suspense fallback={null}>
          {players
            .filter((p) => !closeup || p.id !== role)
            .map((p) => (
              <group
                key={p.id}
                position={
                  closeup ? [p.id === "host" ? 0.85 : -0.85, 0, 0] : [0, 0, 0]
                }
              >
                <Actor actor={p} melody={p.character === "melody"} />
              </group>
            ))}
          <Capture capture={capture} />
        </Suspense>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
          <circleGeometry args={[12, 48]} />
          <meshStandardMaterial
            color={weather === "sunset" ? "#e2b6a7" : "#d5e2c6"}
          />
        </mesh>
      </Canvas>
    </div>
  );
}

class PreviewBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p role="status">
        The character preview could not load. Your visit and chat are still
        available.
      </p>
    ) : (
      this.props.children
    );
  }
}
export function TogetherPreview(props: {
  capture: React.RefObject<(() => string) | null>;
  closeup: boolean;
}) {
  return (
    <PreviewBoundary>
      <Preview {...props} />
    </PreviewBoundary>
  );
}
