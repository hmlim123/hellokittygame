import {
  Suspense,
  useMemo,
  useState,
  useRef,
  useEffect,
  type RefObject,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ACESFilmicToneMapping,
  MathUtils,
  type Group,
  type PointLight,
  type MeshStandardMaterial,
} from "three";
import { Kitty, useReducedMotion, type ActivityPose } from "./Kitty";
import { Toy, ToyFriend, type Holding } from "./GameToys";
import { CozyLights, COZY_EXPOSURE } from "./CozyLights";
import { CookieMesh } from "./CookieMesh";
import { useGameStore } from "../game/store";
import { RECIPES, type Cookie } from "../game/cozy";
import type { Gesture } from "../game/types";
function readyPose(cookie: Cookie): ActivityPose {
  const prep = cookie.prep;
  const kind =
    cookie.stage !== "shape"
      ? "sprinkle"
      : (prep?.stir ?? 0) < 1
        ? "stir"
        : !prep?.pressed
          ? "cut"
          : "placeTray";
  return {
    kind,
    progress: kind === "placeTray" ? prep?.oven || 0 : 0,
    active: cookie.stage === "shape" || cookie.stage === "decorate",
  };
}
interface BakingRun {
  active: boolean;
  done?: () => void;
  wait?: number;
  onWarm?: () => void;
}
function ActivityClock({
  pose,
  run,
}: {
  pose: RefObject<ActivityPose>;
  run: RefObject<BakingRun>;
}) {
  useFrame((_, dt) => {
    if (!run.current.active || document.hidden) return;
    pose.current.progress = Math.min(
      1,
      pose.current.progress + Math.min(0.25, dt) / 0.9,
    );
    if (pose.current.progress >= 1) {
      // Keep the tray in Kitty's paws until the contact pose has reached the oven.
      if ((pose.current.renderedProgress ?? 1) < 0.98) return;
      if (run.current.wait && run.current.wait > 0) {
        run.current.onWarm?.();
        run.current.onWarm = undefined;
        run.current.wait = Math.max(0, run.current.wait - Math.min(0.25, dt));
        if (run.current.wait > 0) return;
      }
      run.current.active = false;
      pose.current.active = false;
      run.current.done?.();
      run.current.done = undefined;
    }
  });
  return null;
}
function OvenMotion({
  pose,
  stage,
  warming,
}: {
  pose: RefObject<ActivityPose>;
  stage: string;
  warming: boolean;
}) {
  const opening = useRef(0);
  const tray = useRef<Group>(null),
    light = useRef<PointLight>(null),
    glass = useRef<MeshStandardMaterial>(null);
  const cookie = useGameStore((s) => s.cozy.cookie);
  const reduced = useReducedMotion();
  useFrame(() => {
    const phase = pose.current.renderedProgress ?? 0;
    if (light.current) light.current.intensity = warming ? 1.8 : 0;
    if (glass.current) glass.current.opacity = warming ? 0.65 : 0;
    opening.current =
      stage === "oven" && !reduced
        ? MathUtils.smoothstep(phase, 0, 0.2) *
          (1 - MathUtils.smoothstep(phase, 0.82, 1))
        : 0;
    if (tray.current)
      tray.current.visible = stage === "oven" && !reduced && phase >= 0.74;
  });
  return (
    <>
      <Toy
        name="Oven"
        position={[1.05, 0.16, 0.35]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={0.8}
        opening={opening}
      />
      <pointLight
        ref={light}
        color="#ffc483"
        position={[0.72, 0.48, 0.35]}
        intensity={0}
        distance={1.8}
      />
      <mesh position={[0.74, 0.46, 0.35]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[0.32, 0.18]} />
        <meshStandardMaterial
          ref={glass}
          color="#eeb271"
          emissive="#ffb55b"
          emissiveIntensity={0.8}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      <group
        ref={tray}
        visible={false}
        position={[1.05, 0.512, 0.35]}
        rotation={[0, Math.PI / 2, 0]}
        scale={0.4969266}
      >
        <Toy name="Tray" />
        <group position={[0, 0.035, 0]} scale={1.05}>
          <CookieMesh cookie={cookie} />
        </group>
      </group>
    </>
  );
}
export default function BakingPreview() {
  const reduced = useReducedMotion();
  const prepGauge = useRef<HTMLProgressElement>(null);
  const cookie = useGameStore((s) => s.cozy.cookie),
    equipment = useGameStore((s) => s.equipment),
    [replay, setReplay] = useState(0),
    [oven, setOven] = useState(cookie.prep?.oven || 0),
    [warming, setWarming] = useState(false),
    [busy, setBusy] = useState(false);
  const prep = {
    stir: 0,
    pressed: false,
    oven: 0,
    extra: false,
    ...cookie.prep,
  };
  const stage =
    cookie.stage === "shape"
      ? prep.stir < 1
        ? "stir"
        : !prep.pressed
          ? "press"
          : "oven"
      : cookie.stage;
  const kind: Gesture =
    cookie.stage === "shape"
      ? stage === "stir"
        ? "stir"
        : stage === "press"
          ? "cut"
          : "placeTray"
      : cookie.stage === "decorate"
        ? "sprinkle"
        : cookie.stage === "give" || cookie.packed
          ? "present"
          : "bow";
  const activity = useRef<ActivityPose>(readyPose(cookie)),
    run = useRef<BakingRun>({
      active: false,
    }),
    drag = useRef({ down: false, angle: 0, amount: 0 });
  const holding: Holding | undefined = cookie.packed
    ? "parcel"
    : stage === "stir"
      ? "spoon"
      : stage === "press"
        ? "cutter"
        : cookie.stage === "decorate"
          ? undefined
          : "tray";
  const performance = useMemo(() => ({ id: replay, kind }), [kind, replay]);
  const resetGauge = () => {
    const p = useGameStore.getState().cozy.cookie.prep;
    if (prepGauge.current)
      prepGauge.current.value =
        (p?.stir ?? 0) + (p?.pressed ? 1 : 0) + (p?.oven ?? 0);
  };
  useEffect(() => {
    activity.current = readyPose(cookie);
    run.current.active = false;
    setOven(cookie.prep?.oven || 0);
    setWarming(false);
    setBusy(false);
  }, [cookie.stage, stage]);
  useEffect(() => {
    const cancel = () => {
      drag.current.down = false;
      drag.current.amount = 0;
      resetGauge();
      activity.current = readyPose(useGameStore.getState().cozy.cookie);
      run.current.active = false;
      run.current.done = undefined;
      setWarming(false);
      setBusy(false);
      setOven(useGameStore.getState().cozy.cookie.prep?.oven || 0);
    };
    const hidden = () => {
      if (document.hidden) cancel();
    };
    addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", hidden);
      drag.current.down = false;
      run.current.active = false;
    };
  }, []);
  const stampCount = useRef(cookie.stamps.length);
  useEffect(() => {
    if (
      cookie.stage === "decorate" &&
      cookie.stamps.length > stampCount.current
    ) {
      activity.current = { kind: "sprinkle", progress: 0, active: true };
      run.current = { active: true };
    }
    stampCount.current = cookie.stamps.length;
  }, [cookie.stamps.length, cookie.stage]);
  const stir = (amount: number) => {
    activity.current = {
      kind: "stir",
      progress:
        activity.current.kind === "stir"
          ? activity.current.progress + amount
          : amount,
      active: true,
    };
  };
  const perform = (kind: ActivityPose["kind"], done?: () => void) => {
    if (run.current.active) return;
    activity.current = { kind, progress: 0, active: true };
    if (reduced) {
      activity.current.active = false;
      done?.();
      return;
    }
    setBusy(true);
    run.current = {
      active: true,
      done: () => {
        setBusy(false);
        done?.();
      },
    };
  };
  const finishDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.down) return;
    drag.current.down = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    useGameStore.getState().prepareCookie("stir", drag.current.amount);
    drag.current.amount = 0;
  };
  const finishOven = () => {
    if (run.current.active) return;
    if (oven >= 1) {
      // A keyboard End press still travels through the authored contact motion.
      // A slow drag continues from the pose Nancy has already reached.
      activity.current = {
        kind: "placeTray",
        progress: activity.current.renderedProgress ?? 0,
        active: true,
      };
      setBusy(true);
      run.current = {
        active: true,
        wait: reduced ? 0 : 2.4,
        onWarm: () => setWarming(true),
        done: () => {
          setWarming(false);
          setBusy(false);
          useGameStore.getState().prepareCookie("oven", 1);
        },
      };
    } else useGameStore.getState().prepareCookie("oven", oven);
  };
  const caption = warming
    ? "A little warmth, a lovely smell… Kitty is baking your cookie. ♡"
    : stage === "stir"
      ? "Drag a circle over Kitty’s spoon to stir together."
      : stage === "press"
        ? "Press the cutter to make a tiny cookie together."
        : stage === "oven"
          ? "Slide the tray gently into the little oven."
          : cookie.stage === "decorate"
            ? "Add your little touches. Kitty sprinkles along with you."
            : cookie.stage === "give"
              ? "Kitty holds your decorated cookie, ready to share."
              : cookie.packed
                ? "A safely wrapped cookie, ready to carry to Momo."
                : "A happy little bow. Thank you for baking together, Nancy!";
  return (
    <figure
      className="baking-performance"
      data-baking-step={warming ? "warming" : stage}
    >
      <div className="baking-cue">
        <strong>
          {warming
            ? "A little oven magic ♡"
            : {
                stir: "Mix the dough",
                press: "Make your little shape",
                oven: "Time for the oven",
                decorate: "Freshly baked. Make it yours ♡",
                give: "Made with love, ready to share",
                served: cookie.packed
                  ? "A little gift to carry"
                  : "You made a friend smile ♡",
              }[stage]}
        </strong>
        <span>
          {stage === "stir"
            ? "Draw a circle, or tap to stir."
            : stage === "press"
              ? "Press once. Kitty will help."
              : stage === "oven"
                ? warming
                  ? "No need to do anything. Enjoy a cozy moment."
                  : "Slide gently to the right."
                : ""}
        </span>
      </div>
      <div
        className="baking-preview"
        data-performance={kind}
        data-warming={warming}
        style={{ touchAction: stage === "stir" ? "none" : "auto" }}
        onPointerDown={(e) => {
          if (stage !== "stir") return;
          const r = e.currentTarget.getBoundingClientRect();
          drag.current = {
            down: true,
            angle: Math.atan2(
              e.clientY - r.top - r.height * 0.6,
              e.clientX - r.left - r.width * 0.5,
            ),
            amount: 0,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current.down) return;
          const r = e.currentTarget.getBoundingClientRect(),
            a = Math.atan2(
              e.clientY - r.top - r.height * 0.6,
              e.clientX - r.left - r.width * 0.5,
            ),
            d = Math.atan2(
              Math.sin(a - drag.current.angle),
              Math.cos(a - drag.current.angle),
            );
          drag.current.angle = a;
          if (Math.abs(d) > 0.6) return;
          stir(d / (Math.PI * 2));
          drag.current.amount += Math.abs(d) / (Math.PI * 2);
          if (prepGauge.current)
            prepGauge.current.value = Math.min(
              1,
              prep.stir + drag.current.amount,
            );
        }}
        onLostPointerCapture={() => {
          if (drag.current.down) {
            drag.current.down = false;
            drag.current.amount = 0;
            activity.current.active = false;
            resetGauge();
          }
        }}
        onPointerUp={finishDrag}
        onPointerCancel={(e) => {
          drag.current.down = false;
          drag.current.amount = 0;
          activity.current.active = false;
          resetGauge();
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {}
        }}
      >
        <Canvas
          camera={{
            position:
              equipment.plush === "witch" || equipment.plush === "bunny"
                ? [-1.8, 3.6, 5.3]
                : [-1.8, 3.1, 4.3],
            fov: 38,
          }}
          dpr={[1, 1.5]}
          onCreated={({ gl, camera }) => {
            gl.toneMapping = ACESFilmicToneMapping;
            gl.toneMappingExposure = COZY_EXPOSURE;
            gl.domElement.setAttribute("aria-label", caption);
            camera.lookAt(
              0,
              equipment.plush === "witch" || equipment.plush === "bunny"
                ? 1.35
                : 1.05,
              0.2,
            );
          }}
        >
          <color attach="background" args={["#f3dce4"]} />
          <CozyLights />
          <ActivityClock pose={activity} run={run} />
          <Suspense fallback={null}>
            <Kitty
              animate
              equipment={{ ...equipment, item: "none" }}
              performance={performance}
              activity={activity}
              holding={holding}
              position={[-0.2, 0, -0.15]}
            />
            <group name="Baking_worktop" position={[0, 0, 0.6]}>
              {[-0.38, 0.38].map((x) => (
                <mesh key={x} position={[x, 0.3, 0]}>
                  <boxGeometry args={[0.1, 0.6, 0.5]} />
                  <meshStandardMaterial color="#d5af99" />
                </mesh>
              ))}
              <mesh position={[0, 0.62, 0]}>
                <boxGeometry args={[1, 0.12, 0.7]} />
                <meshStandardMaterial color="#fff0da" />
              </mesh>
              {stage === "stir" ? (
                <Toy name="Bowl" position={[0.12, 0.69, 0]} scale={0.65} />
              ) : stage === "press" || cookie.stage === "decorate" ? (
                <group position={[0.12, 0.69, -0.25]} scale={1.1}>
                  <CookieMesh cookie={cookie} />
                </group>
              ) : null}
            </group>
            <mesh position={[1.05, 0.08, 0.35]}>
              <boxGeometry args={[0.58, 0.16, 0.76]} />
              <meshStandardMaterial color="#fff0da" />
            </mesh>
            <OvenMotion pose={activity} stage={stage} warming={warming} />
            {cookie.stage === "served" &&
              !cookie.packed &&
              cookie.friend !== "kitty" && (
                <ToyFriend
                  name={cookie.friend === "pip" ? "Pip" : "Momo"}
                  position={[1, 0, 0.15]}
                  scale={0.8}
                  greetOnMount
                />
              )}
          </Suspense>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]}>
            <circleGeometry args={[5, 32]} />
            <meshStandardMaterial color="#ead7ca" />
          </mesh>
        </Canvas>
      </div>
      <figcaption role="status" aria-live="polite">
        {caption}
      </figcaption>
      {cookie.stage === "shape" && (
        <div
          className="workshop-controls"
          aria-label="Make the cookie together"
        >
          <progress
            ref={prepGauge}
            max="3"
            value={
              (prep.stir >= 1 ? 1 : prep.stir) +
              (prep.pressed ? 1 : 0) +
              prep.oven
            }
            aria-label="Cookie preparation"
          />
          {stage === "stir" && (
            <button
              onClick={() => {
                stir(0.5);
                useGameStore.getState().prepareCookie("stir", 0.5);
              }}
            >
              Stir a little ↻
            </button>
          )}
          {stage === "press" && (
            <button
              disabled={busy}
              onClick={() =>
                perform("cut", () => {
                  useGameStore.getState().prepareCookie("press");
                  if (cookie.recipe === "moon")
                    useGameStore.getState().prepareCookie("extra");
                })
              }
            >
              {cookie.recipe === "moon"
                ? "Stamp a little moon ↓"
                : "Press the cutter ↓"}
            </button>
          )}
          {stage === "oven" && (
            <label>
              Slide tray into the oven{" "}
              <input
                type="range"
                disabled={busy}
                min="0"
                max="100"
                value={Math.round(oven * 100)}
                aria-label="Slide tray into the oven"
                onChange={(e) => {
                  const p = Number(e.target.value) / 100;
                  setOven(p);
                  activity.current = {
                    kind: "placeTray",
                    progress: p,
                    active: true,
                  };
                }}
                onPointerUp={finishOven}
                onKeyUp={finishOven}
                onBlur={() => {
                  if (!run.current.active) {
                    setOven(cookie.prep?.oven || 0);
                    activity.current.active = false;
                  }
                }}
              />
            </label>
          )}
          {cookie.recipe === "strawberry" && !prep.extra && (
            <button
              onClick={() =>
                perform("sprinkle", () => {
                  useGameStore.getState().prepareCookie("extra");
                  activity.current = {
                    kind: "stir",
                    progress: 0,
                    active: true,
                  };
                })
              }
            >
              {RECIPES.find((r) => r.id === cookie.recipe)?.action} ✧
            </button>
          )}
          <small>
            You can also choose Bake &amp; decorate below and let Kitty help.
          </small>
        </div>
      )}
      {cookie.recipe === "cupcake" &&
        cookie.stage === "decorate" &&
        !prep.extra && (
          <button
            onClick={() =>
              perform("sprinkle", () =>
                useGameStore.getState().prepareCookie("extra"),
              )
            }
          >
            Swirl the icing ✧
          </button>
        )}
      {cookie.stage !== "shape" && (
        <button
          disabled={busy}
          className="small"
          onClick={() => {
            if (run.current.active) return;
            activity.current.active = false;
            setReplay((n) => n + 1);
          }}
        >
          Watch Kitty again ♡
        </button>
      )}
    </figure>
  );
}
