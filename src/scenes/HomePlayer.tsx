import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  RigidBody,
  CapsuleCollider,
  useBeforePhysicsStep,
  useAfterPhysicsStep,
  useRapier,
  type RapierRigidBody,
} from "@react-three/rapier";
import * as THREE from "three";
import { Kitty, useKittyTouch, useReducedMotion } from "./Kitty";
import { Toy } from "./GameToys";
import { GroundShadow } from "./GroundShadow";
import { assetUrl } from "../game/assets";
import { useGameStore } from "../game/store";
import {
  useHomeMotion,
  homeRender,
  arriveHomeAction,
  homeClipFor,
  runHomeQueue,
} from "../game/home-motion";
import {
  HOME_SEAT,
  HOME_ACTIONS,
  homeFloorHeight,
  moveHome,
  HOME_SPAWN,
  homeWalkable,
  type HomePoint,
} from "../game/home-world";
import { turnToward } from "./walk-animation";
import { InputClock } from "./input-clock";
import { studioAnchor } from "./studio-layout";
const floorHeight = homeFloorHeight;
export function HomePlayer() {
  const equipment = useGameStore((s) => s.equipment),
    id = useGameStore((s) => s.room.selected),
    style = equipment.plush || "classic",
    gltf = useGLTF(assetUrl("assets/home-motion/" + style + ".glb"));
  const clips = useMemo(
    () => Object.fromEntries(gltf.animations.map((a) => [a.name, a])),
    [gltf],
  );
  const phase = useHomeMotion((s) => s.phase),
    held = useHomeMotion((s) => s.heldCup),
    clip = phase === "seated" && held ? "cupIdle" : homeClipFor(phase),
    reduced = useReducedMotion(),
    touch = useKittyTouch();
  const spawn = useMemo(() => {
    const saved = useGameStore.getState().cozy.home;
    return homeWalkable(saved.x, saved.z) ? saved : { ...HOME_SPAWN, yaw: 0 };
  }, []);
  const body = useRef<RapierRigidBody>(null),
    anchor = useRef<THREE.Group>(null),
    hero = useRef<THREE.Group | null>(null),
    cup = useRef<THREE.Group>(null),
    locomotion = useRef({ speed: 0 }),
    latest = useRef<HomePoint>({ x: spawn.x, z: spawn.z });
  const { world } = useRapier(),
    controller = useRef<ReturnType<
      typeof world.createCharacterController
    > | null>(null),
    clock = useMemo(() => new InputClock(), []),
    command = useRef(-1),
    yawGoal = useRef(spawn.yaw),
    arrived = useRef<string | null>(null),
    elapsed = useRef({ phase, time: 0 }),
    publish = useRef(0),
    save = useRef(0),
    previousFrame = useRef({ x: spawn.x, z: spawn.z }),
    visual = useRef(new THREE.Vector3(spawn.x, floorHeight(spawn), spawn.z)),
    cupFrom = useRef(new THREE.Vector3(...studioAnchor("tea_cup"))),
    cupTarget = useMemo(
      () => new THREE.Vector3(...studioAnchor("tea_cup")),
      [],
    ),
    socketPoint = useMemo(() => new THREE.Vector3(), []),
    cupScale = useRef(0.447),
    cupRotation = useMemo(() => new THREE.Quaternion(), []),
    cupFromRotation = useMemo(() => new THREE.Quaternion(), []),
    upright = useMemo(() => new THREE.Quaternion(), []);
  useEffect(() => {
    const current = world.createCharacterController(0.01);
    current.setSlideEnabled(true);
    controller.current = current;
    return () => {
      if (controller.current === current) controller.current = null;
      world.removeCharacterController(current);
    };
  }, [controller, world]);
  useEffect(() => {
    useHomeMotion.setState({
      position: { x: spawn.x, z: spawn.z },
      visual: { x: spawn.x, z: spawn.z },
      yaw: spawn.yaw,
      speed: 0,
      path: [],
      input: { x: 0, z: 0 },
      pending: null,
      phase: "idle",
      phaseTime: 0,
      heldCup: false,
      afterStand: null,
    });
    return () => {
      const p = latest.current,
        m = useHomeMotion.getState();
      useGameStore.getState().saveHomePosition(p.x, p.z, m.yaw);
      m.stop();
      useHomeMotion.setState({
        phase: "idle",
        phaseTime: 0,
        heldCup: false,
        afterStand: null,
      });
    };
  }, []);
  useFrame(() => clock.beginFrame(performance.now()), -2);
  useEffect(
    () =>
      useHomeMotion.subscribe((state, previous) => {
        if (
          state.yaw !== previous.yaw &&
          state.speed === 0 &&
          !state.path.length &&
          !state.input.x &&
          !state.input.z
        )
          yawGoal.current = state.yaw;
      }),
    [],
  );
  useBeforePhysicsStep(() => {
    const p = body.current?.translation(),
      s = useGameStore.getState(),
      m = useHomeMotion.getState();
    if (!p || !controller.current) return;
    if (
      !s.sceneReady ||
      s.panel ||
      s.dialogue ||
      s.viewOnly ||
      s.mission ||
      s.arrival ||
      s.petMode ||
      m.phase !== "idle" ||
      m.camera !== "follow" ||
      document.hidden
    ) {
      locomotion.current.speed = 0;
      clock.reset(performance.now());
      return;
    }
    if (m.inputAt !== command.current) {
      clock.reset(m.inputAt);
      command.current = m.inputAt;
    }
    if (!clock.consume()) {
      locomotion.current.speed = 0;
      return;
    }
    let dx = m.input.x,
      dz = m.input.z,
      step = 2.35 / 60;
    if (m.path.length) {
      const target = m.path[0],
        d = Math.hypot(target.x - p.x, target.z - p.z);
      if (d < 0.012) {
        const path = m.path.slice(1);
        useHomeMotion.setState({ path });
        if (!path.length) {
          arrived.current = m.pending;
          useHomeMotion.setState({ pending: null });
        }
        dx = 0;
        dz = 0;
      } else {
        dx = (target.x - p.x) / d;
        dz = (target.z - p.z) / d;
        step = Math.min(step, d);
      }
    }
    const n = moveHome(p, dx * step, dz * step),
      desired = { x: n.x - p.x, y: 0, z: n.z - p.z };
    const collider = body.current!.collider(0);
    controller.current.computeColliderMovement(collider, desired);
    const allowed = controller.current.computedMovement();
    const safe = moveHome(p, allowed.x, allowed.z);
    body.current!.setNextKinematicTranslation({
      x: safe.x,
      y: floorHeight(safe),
      z: safe.z,
    });
    const speed = Math.hypot(safe.x - p.x, safe.z - p.z) * 60;
    locomotion.current.speed = speed;
    if (speed > 0.02) yawGoal.current = Math.atan2(safe.x - p.x, safe.z - p.z);
  });
  useAfterPhysicsStep(() => {
    const p = body.current?.translation();
    if (p) latest.current = { x: p.x, z: p.z };
  });
  useFrame(({ gl }, dt) => {
    const s = useGameStore.getState(),
      m = useHomeMotion.getState(),
      p = latest.current,
      delta = Math.min(0.1, Math.max(0, dt));
    if (elapsed.current.phase !== m.phase)
      elapsed.current = { phase: m.phase, time: 0 };
    if (!s.panel && !s.dialogue && s.sceneReady && !document.hidden)
      elapsed.current.time += delta;
    if (m.phase === "idle")
      locomotion.current.speed = Math.min(
        4,
        Math.hypot(
          p.x - previousFrame.current.x,
          p.z - previousFrame.current.z,
        ) / Math.max(0.001, dt),
      );
    previousFrame.current = { ...p };
    const time = elapsed.current.time,
      duration = reduced
        ? 0.05
        : m.phase === "sitting" || m.phase === "standing"
          ? 1.5
          : m.phase === "sipping"
            ? 2
            : 1,
      t = THREE.MathUtils.clamp(time / duration, 0, 1),
      ease = t * t * (3 - 2 * t);
    visual.current.set(p.x, floorHeight(p), p.z);
    if (m.phase === "sitting") {
      visual.current.x = THREE.MathUtils.lerp(
        p.x,
        HOME_SEAT.x,
        reduced ? 1 : ease,
      );
      visual.current.z = THREE.MathUtils.lerp(
        p.z,
        HOME_SEAT.z,
        reduced ? 1 : ease,
      );
    } else if (m.phase === "standing") {
      visual.current.x = THREE.MathUtils.lerp(
        HOME_SEAT.x,
        p.x,
        reduced ? 1 : ease,
      );
      visual.current.z = THREE.MathUtils.lerp(
        HOME_SEAT.z,
        p.z,
        reduced ? 1 : ease,
      );
    } else if (["seated", "picking", "sipping", "putting"].includes(m.phase)) {
      visual.current.x = HOME_SEAT.x;
      visual.current.z = HOME_SEAT.z;
    }
    homeRender.x = visual.current.x;
    homeRender.z = visual.current.z;
    if (anchor.current) {
      anchor.current.position.set(
        visual.current.x - p.x,
        0,
        visual.current.z - p.z,
      );
      anchor.current.rotation.y = turnToward(
        anchor.current.rotation.y,
        m.phase !== "idle" ? m.yaw : yawGoal.current,
        delta,
        reduced,
      );
    }
    if (s.panel || s.dialogue || s.petMode || s.viewOnly)
      locomotion.current.speed = 0;
    const rig = hero.current?.userData.blender;
    const socket = rig?.model.getObjectByName("Socket_Teacup");
    if (socket) {
      socket.getWorldPosition(socketPoint);
      socket.getWorldQuaternion(cupRotation);
      cupScale.current = 0.9 * rig.baseScale;
    }
    if (cup.current) {
      cup.current.scale.setScalar(cupScale.current);
      cup.current.position.copy(cupTarget);
      cup.current.quaternion.identity();
      if (m.heldCup) {
        cup.current.position.copy(socketPoint);
        cup.current.quaternion.copy(cupRotation);
      } else if (m.phase === "picking" && t > 0.68) {
        const mix = THREE.MathUtils.smoothstep(t, 0.68, 0.94);
        cup.current.position.lerp(socketPoint, mix);
        cup.current.quaternion.slerp(cupRotation, mix);
      } else if (m.phase === "putting" && t > 0.64) {
        const mix = THREE.MathUtils.smoothstep(t, 0.64, 1);
        cup.current.position.copy(cupFrom.current).lerp(cupTarget, mix);
        cup.current.quaternion.copy(cupFromRotation).slerp(upright, mix);
      }
    }
    if (m.phase === "putting" && m.heldCup && t >= 0.64) {
      cupFrom.current.copy(socketPoint);
      cupFromRotation.copy(cupRotation);
      useHomeMotion.setState({ heldCup: false });
    }
    if (m.phase === "picking" && !m.heldCup && t >= 0.94)
      useHomeMotion.setState({ heldCup: true });
    if (!s.panel && !s.dialogue && s.sceneReady) {
      if (m.phase === "turning" && time > (reduced ? 0.01 : 0.28))
        useHomeMotion.setState({ phase: "sitting", phaseTime: 0 });
      else if (m.phase === "sitting" && t === 1)
        useHomeMotion.setState({
          phase: "seated",
          phaseTime: 0,
          message: "Pick up the cup whenever you like. No hurry. ♡",
        });
      else if ((m.phase === "picking" || m.phase === "sipping") && t === 1) {
        if (m.phase === "sipping") s.recordHomeTea();
        useHomeMotion.setState({
          phase: "seated",
          phaseTime: 0,
          message:
            m.phase === "sipping"
              ? "A little tea together. ♡"
              : "A warm cup in her paws. ♡",
        });
      } else if (m.phase === "putting" && t === 1)
        useHomeMotion.setState({
          phase: "standing",
          phaseTime: 0,
          heldCup: false,
        });
      else if (m.phase === "standing" && t === 1) {
        const q = m.afterStand;
        useHomeMotion.setState({
          phase: "idle",
          phaseTime: 0,
          heldCup: false,
          afterStand: null,
          message: "Ready for another little moment. ♡",
        });
        if (q) runHomeQueue(q);
      } else if (m.phase === "seated" && m.afterStand) m.stand(m.afterStand);
    }
    if (arrived.current) {
      const id = arrived.current;
      arrived.current = null;
      yawGoal.current =
        HOME_ACTIONS.find((a) => a.id === id)?.yaw ?? yawGoal.current;
      s.saveHomePosition(p.x, p.z, m.yaw);
      arriveHomeAction(id as Parameters<typeof arriveHomeAction>[0]);
    }
    publish.current += dt;
    save.current += dt;
    if (publish.current > 0.08) {
      useHomeMotion.setState({
        yaw: m.phase === "idle" ? yawGoal.current : m.yaw,
        position: { ...p },
        visual: { x: visual.current.x, z: visual.current.z },
        speed: locomotion.current.speed,
        phaseTime: time,
      });
      publish.current = 0;
    }
    if (save.current > 0.5 && m.phase === "idle") {
      s.saveHomePosition(p.x, p.z, m.yaw);
      save.current = 0;
    }
    gl.domElement.dataset.homeX = String(p.x);
    gl.domElement.dataset.homeZ = String(p.z);
    gl.domElement.dataset.homeSpeed = String(locomotion.current.speed);
    gl.domElement.dataset.homePhase = m.phase;
    gl.domElement.dataset.homeCup = String(m.heldCup);
    gl.domElement.dataset.homeCupGap = String(
      m.heldCup && cup.current
        ? cup.current.position.distanceTo(socketPoint)
        : 0,
    );
    gl.domElement.dataset.homeRoute = String(m.path.length);
  });
  return (
    <>
      <RigidBody
        ref={body}
        type="kinematicPosition"
        colliders={false}
        position={[spawn.x, floorHeight(spawn), spawn.z]}
      >
        <CapsuleCollider args={[0.34, 0.28]} position={[0, 0.65, 0]} />
        <group ref={anchor} rotation={[0, spawn.yaw, 0]}>
          <GroundShadow size={[1.25, 0.85]} />
          <Kitty
            id={id}
            equipment={clip ? { ...equipment, item: "none" } : equipment}
            animate
            interactive={phase === "idle"}
            onTouch={(part) => {
              useHomeMotion.getState().stop();
              useHomeMotion.setState({ yaw: 0 });
              touch(part);
            }}
            scale={0.9}
            locomotion={locomotion}
            additionalClips={clips}
            homeClip={clip}
            homeGrip={["picking", "sipping", "putting"].includes(phase) || held}
            heroRef={hero}
          />
        </group>
      </RigidBody>
      <group
        ref={cup}
        position={studioAnchor("tea_cup")}
        scale={0.447}
        onClick={(e) => {
          if (e.delta > 7) return;
          e.stopPropagation();
          if (
            performance.now() <
            Number(
              (e.nativeEvent.target as HTMLCanvasElement)?.dataset
                ?.homeIgnoreTap || 0,
            )
          )
            return;
          const m = useHomeMotion.getState();
          if (m.phase === "seated") m.tea();
          else if (m.phase === "idle") m.visit("seat");
        }}
      >
        <Toy name="Cup" />
      </group>
    </>
  );
}
