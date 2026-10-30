/** One warm studio palette for Kitty, her room, the adventure and keepsake photos. */
export const COZY_EXPOSURE = 1.1;
export const WORLD_COLORS = {
  village: "#e3e8d5",
  garden: "#eee0ef",
  glade: "#e8dfec",
} as const;
export function CozyLights({ evening = false }: { evening?: boolean }) {
  return (
    <>
      <hemisphereLight
        args={[
          "#fff6ee",
          evening ? "#b9a5c6" : "#b9acb1",
          evening ? 2.25 : 2.5,
        ]}
      />
      <directionalLight position={[-3, 9, 6]} color="#fff1d5" intensity={2} />
      <directionalLight position={[5, 3, 0]} color="#f6d4e3" intensity={0.55} />
    </>
  );
}
