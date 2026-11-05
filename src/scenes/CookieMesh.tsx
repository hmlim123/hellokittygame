import { useMemo } from "react";
import { Shape } from "three";
import type { Cookie, CookieShape } from "../game/cozy";
function shapeFor(kind: CookieShape, recipe?: string) {
  const s = new Shape();
  if (recipe === "moon") {
    s.moveTo(0.12, 0.14);
    s.bezierCurveTo(-0.18, 0.2, -0.24, -0.16, 0, -0.18);
    s.bezierCurveTo(0.1, -0.2, 0.18, -0.12, 0.19, -0.07);
    s.bezierCurveTo(-0.02, -0.16, -0.1, 0.1, 0.12, 0.14);
    return s;
  }
  if (kind === "round") {
    s.absarc(0, 0, 0.16, 0, Math.PI * 2, false);
    return s;
  }
  if (kind === "heart") {
    s.moveTo(0, -0.15);
    s.bezierCurveTo(-0.32, 0.02, -0.14, 0.26, 0, 0.1);
    s.bezierCurveTo(0.14, 0.26, 0.32, 0.02, 0, -0.15);
    return s;
  }
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5,
      r = i % 2 ? 0.075 : 0.17;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  return s;
}
export function CookieMesh({ cookie }: { cookie: Cookie }) {
  const shape = useMemo(
    () => shapeFor(cookie.shape, cookie.recipe),
    [cookie.shape, cookie.recipe],
  );
  if (cookie.recipe === "cupcake")
    return (
      <group name="Nancy’s tiny cupcake">
        <mesh position={[0, 0.07, 0]}>
          <cylinderGeometry args={[0.15, 0.11, 0.14, 20]} />
          <meshStandardMaterial color="#e4b581" />
        </mesh>
        {cookie.stage !== "shape" &&
          [0, 1, 2].map((i) => (
            <mesh
              key={i}
              position={[0, 0.15 + i * 0.055, 0]}
              scale={[0.15 - i * 0.035, 0.055, 0.15 - i * 0.035]}
            >
              <sphereGeometry args={[1, 18, 12]} />
              <meshStandardMaterial
                color={
                  { rose: "#efb6cb", honey: "#f5df9f", lavender: "#cec0e8" }[
                    cookie.icing
                  ]
                }
              />
            </mesh>
          ))}
        {cookie.stamps.map((s, i) => (
          <mesh
            key={i}
            position={[(s.x - 50) * 0.004, 0.22, (s.y - 50) * 0.004]}
          >
            <sphereGeometry args={[0.014, 8, 6]} />
            <meshStandardMaterial
              color={s.kind === "star" ? "#fff1b9" : "#c76c91"}
            />
          </mesh>
        ))}
      </group>
    );
  return (
    <group name={`Momo’s ${cookie.icing} ${cookie.shape} cookie`}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <extrudeGeometry
          args={[
            shape,
            {
              depth: 0.035,
              bevelEnabled: true,
              bevelSize: 0.008,
              bevelThickness: 0.008,
              bevelSegments: 2,
              steps: 1,
              curveSegments: 12,
            },
          ]}
        />
        <meshStandardMaterial
          color={cookie.recipe === "strawberry" ? "#d89883" : "#d7af78"}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.045, 0]}
        scale={[0.88, 0.88, 1]}
      >
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial
          color={
            { rose: "#efb6cb", honey: "#f5df9f", lavender: "#cec0e8" }[
              cookie.icing
            ]
          }
        />
      </mesh>
      {cookie.stamps.map((s, i) => (
        <mesh
          key={i}
          position={[(s.x - 50) * 0.0045, 0.057, (s.y - 50) * 0.0045]}
          scale={[1, 0.55, 1]}
        >
          <sphereGeometry args={[s.kind === "berry" ? 0.018 : 0.012, 8, 6]} />
          <meshStandardMaterial
            color={
              s.kind === "star"
                ? "#fff2c2"
                : s.kind === "berry"
                  ? "#cf6280"
                  : "#af6c91"
            }
          />
        </mesh>
      ))}
    </group>
  );
}
