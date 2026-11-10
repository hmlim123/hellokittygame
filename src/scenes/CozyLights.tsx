/** One warm studio palette for Kitty, her room, the adventure and keepsake photos. */
export const COZY_EXPOSURE = 1.1;
export const WORLD_COLORS = {
  village: "#e3e8d5",
  garden: "#eee0ef",
  glade: "#e8dfec",
} as const;
export function CozyLights({
  evening = false,
  rainy = false,
  ambientScale = 1,
}: {
  evening?: boolean;
  rainy?: boolean;
  ambientScale?: number;
}) {
  return (
    <>
      <hemisphereLight
        args={[
          rainy ? "#fff0df" : "#fff6ee",
          evening ? "#b9a5c6" : "#b9acb1",
          (rainy ? 2.7 : evening ? 2.25 : 2.5) * ambientScale,
        ]}
      />
      <directionalLight
        position={[-3, 9, 6]}
        color="#fff1d5"
        intensity={2 * ambientScale}
      />
      <directionalLight
        position={[5, 3, 0]}
        color="#f6d4e3"
        intensity={0.55 * ambientScale}
      />
    </>
  );
}
