/** Deterministic small rotation (in degrees) for a card, derived from its id — same id always tilts the same way. */
export function cardTilt(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const normalized = (Math.abs(hash) % 1000) / 1000; // 0..1
  return (normalized - 0.5) * 3; // -1.5..1.5 degrees
}
