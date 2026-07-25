export const RELEASE_PALETTE = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#84cc16',
];

export function releaseColor(tier: number): string {
  return RELEASE_PALETTE[tier % RELEASE_PALETTE.length];
}
