import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useHomeMotion, homeRender } from "../game/home-motion";
import { useGameStore } from "../game/store";
import { useReducedMotion } from "./use-reduced-motion";
export function HomeCamera({ active }: { active: boolean }) {
  const { camera, gl, size } = useThree(),
    reduced = useReducedMotion(),
    reset = useGameStore((s) => s.cameraReset),
    follow = useRef(new THREE.Vector3()),
    initial = useRef(false),
    target = useMemo(() => new THREE.Vector3(), []),
    offset = useMemo(() => new THREE.Vector3(0, 5.4, 8.3), []);
  useEffect(() => {
    initial.current = false;
  }, [active, reset, size.width, size.height]);
  useEffect(() => {
    const canvas = gl.domElement,
      pointers = new Map<number, { x: number; y: number }>();
    let distance = 0,
      scale = 1;
    const start = (e: PointerEvent) => {
      if (!active || e.pointerType !== "touch") return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        distance = Math.hypot(a.x - b.x, a.y - b.y);
        scale = useHomeMotion.getState().cameraScale;
        canvas.dataset.homePinching = "true";
        canvas.dataset.homeIgnoreTap = String(performance.now() + 500);
      }
    };
    const move = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2 && distance > 0) {
        const [a, b] = [...pointers.values()],
          ratio = Math.hypot(a.x - b.x, a.y - b.y) / distance;
        useHomeMotion.setState({
          cameraScale: THREE.MathUtils.clamp(scale * ratio, 0.8, 1.35),
        });
        canvas.dataset.homeIgnoreTap = String(performance.now() + 500);
      }
    };
    const end = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) {
        distance = 0;
        canvas.dataset.homePinching = "false";
      }
    };
    const wheel = (e: WheelEvent) => {
      if (!active) return;
      e.preventDefault();
      const m = useHomeMotion.getState();
      useHomeMotion.setState({
        cameraScale: THREE.MathUtils.clamp(
          m.cameraScale * Math.exp(-e.deltaY * 0.001),
          0.8,
          1.35,
        ),
      });
    };
    canvas.addEventListener("pointerdown", start);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => {
      canvas.removeEventListener("pointerdown", start);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", end);
      canvas.removeEventListener("pointercancel", end);
      canvas.removeEventListener("wheel", wheel);
    };
  }, [active, gl]);
  useFrame((_, dt) => {
    if (!active) return;
    const m = useHomeMotion.getState();
    target.set(homeRender.x, 0.95, homeRender.z);
    const snap = !initial.current;
    if (!initial.current) {
      follow.current.copy(target);
      initial.current = true;
    } else
      follow.current.lerp(
        target,
        reduced ? 1 : 1 - Math.exp(-Math.min(dt, 0.1) * 9),
      );
    camera.position.copy(follow.current).add(offset);
    camera.lookAt(follow.current);
    const c = camera as THREE.OrthographicCamera,
      zoom =
        Math.min(size.width / 5.1, Math.max(25, (size.height - 120) / 4.1)) *
        m.cameraScale;
    c.zoom = snap
      ? zoom
      : THREE.MathUtils.lerp(
          c.zoom,
          zoom,
          1 - Math.exp(-Math.min(dt, 0.1) * 12),
        );
    if (Math.abs(c.zoom - zoom) < 0.02) c.zoom = zoom;
    c.updateProjectionMatrix();
    gl.domElement.dataset.homeCamera = "follow";
    gl.domElement.dataset.viewAngle = "0";
    gl.domElement.dataset.homeFollowError = String(
      Math.hypot(follow.current.x - target.x, follow.current.z - target.z),
    );
  });
  return null;
}
