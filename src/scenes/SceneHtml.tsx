import { useLayoutEffect, useMemo, useState, type ComponentProps } from "react";
import { useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";

/** Keep Drei's foreign DOM children out of the React-owned Canvas container. */
export function SceneHtml(props: ComponentProps<typeof Html>) {
  const gl = useThree((s) => s.gl);
  const connected = useThree((s) => s.events.connected);
  const [host] = useState(() => {
    const node = document.createElement("div");
    node.className = "scene-label-host";
    return node;
  });
  const portal = useMemo(() => ({ current: host }), [host]);
  useLayoutEffect(() => {
    const target = connected || gl.domElement.parentElement;
    if (!target) return;
    target.appendChild(host);
    // A label click belongs to its DOM button. Letting it reach the Canvas
    // also raycasts the ground with coordinates relative to that button.
    const stop = (event: Event) => event.stopPropagation();
    const events = [
      "pointerdown",
      "pointerup",
      "pointermove",
      "click",
      "dblclick",
      "wheel",
    ];
    events.forEach((name) => host.addEventListener(name, stop));
    // Removing this host leaves its children attached until Drei cleans up.
    // React can replace the Canvas without clearing those foreign children.
    return () => {
      events.forEach((name) => host.removeEventListener(name, stop));
      host.remove();
    };
  }, [host, gl, connected]);
  return <Html {...props} portal={portal} />;
}
