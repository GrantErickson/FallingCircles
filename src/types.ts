// ── Type definitions ──────────────────────────────────────────

export interface Settings {
  circleRadius: number;
  fallSpeed: number;
  trailLength: number;
  maxPerColumn: number;
  gap: number;
  mouseRadius: number;
  mouseRevealBrightness: number;
  trailBrightness: number;
  trailDim: boolean;
  whiteCirclesOnly: boolean;
  speedVariation: number;
}

export interface MouseState {
  x: number;
  y: number;
}

export interface TrailCircle {
  drawX: number;
  drawY: number;
  circleR: number;
  finalAlpha: number;
  influence: number;
  key: string;
}

export interface MouseInfluence {
  extra: number;
  influence: number;
}

export interface GhostCanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  size: number;
}
