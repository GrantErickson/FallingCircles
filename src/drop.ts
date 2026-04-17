import type { MouseInfluence, MouseState } from './types';
import { settings } from './settings';
import { SPEED_SCALE } from './constants';
import { columnX, columnYOffset, rowStep } from './grid';

// ── Drop ───────────────────────────────────────────────────────

export class Drop {
  col: number;
  x: number;
  alive: boolean;
  speedMultiplier: number;
  speedOffset: number;
  row: number;
  y: number;
  continuousY: number;
  spawnGridBase: number;
  trail: number[];

  constructor(colIndex: number, globalFallDistance: number, startRow?: number) {
    this.col = colIndex;
    this.x = columnX(colIndex);
    this.alive = true;
    this.speedMultiplier = 1 + (Math.random() * 2 - 1) * settings.speedVariation;
    this.speedOffset = 0;

    if (startRow != null) {
      // Pre-seeded: place at a specific row with a partial trail
      const step = rowStep();
      this.row = startRow;
      this.y = startRow * step;
      this.continuousY = this.y;
      this.spawnGridBase = 0;
      const trailLen = Math.min(settings.trailLength, Math.max(0, startRow));
      this.trail = [];
      for (let r = startRow - trailLen; r < startRow; r++) {
        this.trail.push(r * step);
      }
    } else {
      // Snap spawn to the nearest grid boundary so drops stay phase-locked
      const step = rowStep();
      this.spawnGridBase = Math.floor(globalFallDistance / step) * step;
      this.row = -1;
      this.y = -step;
      this.continuousY = this.y;
      this.trail = [];
    }
  }

  update(globalFallDistance: number): void {
    const step = rowStep();
    const speed = settings.fallSpeed * SPEED_SCALE;
    this.speedOffset += speed * (this.speedMultiplier - 1);
    this.continuousY = (globalFallDistance + this.speedOffset - this.spawnGridBase) - step;

    const newRow = Math.floor(this.continuousY / step);
    while (this.row < newRow) {
      this.row++;
      this.y = this.row * step;
      this.trail.push(this.y);
      if (this.trail.length > settings.trailLength) this.trail.shift();
    }

    const trailTop = this.trail.length > 0 ? this.trail[0] : this.continuousY;
    if (trailTop > innerHeight + step * 2) this.alive = false;
  }

  get rowFraction(): number {
    const step = rowStep();
    return step > 0 ? (this.continuousY / step) - this.row : 0;
  }

  mouseInfluence(px: number, py: number, mouse: MouseState): MouseInfluence {
    const dist = Math.hypot(px - mouse.x, py - mouse.y);
    const influence = dist < settings.mouseRadius ? 1 - dist / settings.mouseRadius : 0;
    return { extra: influence * 0.5, influence };
  }

  drawHead(ctx: CanvasRenderingContext2D, mouse: MouseState): void {
    const headY = this.continuousY + columnYOffset(this.col);
    const r = settings.circleRadius;
    const mi = this.mouseInfluence(this.x, headY, mouse);

    ctx.beginPath();
    ctx.arc(this.x, headY, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.95 + mi.extra})`;
    ctx.fill();

    if (mi.influence > 0) {
      ctx.beginPath();
      ctx.arc(this.x, headY, r * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${mi.influence * 0.12})`;
      ctx.fill();
    }
  }
}
