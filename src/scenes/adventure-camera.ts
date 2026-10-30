export function adventureFraming(width: number, height: number) {
  const aspect = Math.max(1, width) / Math.max(1, height),
    compact = width < 640;
  const half = Math.min(compact ? 2.3 : 3.8, (compact ? 1.65 : 4.6) / aspect);
  return {
    half,
    aspect,
    marginX: Math.min(3, Math.max(1.2, half * aspect - 0.3)),
    marginZ: Math.min(3, Math.max(1.2, (half * Math.sqrt(113)) / 7 - 0.3)),
  };
}
