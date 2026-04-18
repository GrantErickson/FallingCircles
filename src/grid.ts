import { settings } from './settings';

// ── Viewport helpers ──────────────────────────────────────────

export const W = (): number => innerWidth;
export const H = (): number => innerHeight;

// ── Grid geometry ─────────────────────────────────────────────

export const columnWidth = (): number => settings.circleRadius * 2 + settings.gap;
export const rowStep     = (): number => settings.circleRadius * 2 + settings.gap;
export const columnCount = (): number => Math.floor(W() / columnWidth());

export function columnX(index: number): number {
  const cw = columnWidth();
  const totalW = columnCount() * cw;
  const offset = (W() - totalW) / 2 + cw / 2;
  return offset + index * cw;
}

// Offset odd columns by half a row step for hex-style interlocking
export function columnYOffset(index: number): number {
  return index % 2 ? rowStep() / 2 : 0;
}

// ── Deterministic spawn interval ─────────────────────────────
// Calculate the fall-distance interval at which to spawn a new drop
// so that exactly maxPerColumn drops are visible per column.
export function spawnInterval(): number {
  const visibleDistance = H() + (settings.trailLength + 1) * rowStep();
  return visibleDistance / settings.maxPerColumn;
}
