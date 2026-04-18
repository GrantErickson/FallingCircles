import type { GhostCanvas, MouseState, TrailCircle } from './types';
import { MOUSE_OFFSCREEN, SPEED_SCALE, GROWTH_SPEED, SHRINK_SPEED, MAX_GROWTH } from './constants';
import { settings, defaultSettings, loadSettings, saveSettings, sliders } from './settings';
import { W, H, columnCount, columnX, columnYOffset, rowStep, spawnInterval } from './grid';
import { Drop } from './drop';
import {
  bgState, fitImageToCanvas, loadBackgroundImage, tickTransition,
  drawBackground, drawGhost,
} from './background';

// ── Canvas ────────────────────────────────────────────────────

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

function resize(): void {
  canvas.width = innerWidth * devicePixelRatio;
  canvas.height = innerHeight * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
}
addEventListener("resize", resize);
resize();

// ── Settings UI ───────────────────────────────────────────────

loadSettings();

function syncUIFromSettings(): void {
  for (const id of sliders) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    const valEl = document.getElementById(id + "Val");
    if (!el) continue;
    el.value = String(settings[id]);
    if (valEl) valEl.textContent = String(settings[id]);
  }
  const tdEl = document.getElementById("trailDim") as HTMLInputElement | null;
  if (tdEl) tdEl.checked = settings.trailDim;
  const wcEl = document.getElementById("whiteCirclesOnly") as HTMLInputElement | null;
  if (wcEl) wcEl.checked = settings.whiteCirclesOnly;
}

syncUIFromSettings();

for (const id of sliders) {
  const el = document.getElementById(id) as HTMLInputElement | null;
  const valEl = document.getElementById(id + "Val");
  if (!el) continue;
  el.addEventListener("input", () => {
    (settings[id] as number) = parseFloat(el.value);
    if (valEl) valEl.textContent = el.value;
    saveSettings();
  });
}

const trailDimEl = document.getElementById("trailDim") as HTMLInputElement | null;
if (trailDimEl) {
  trailDimEl.addEventListener("change", () => {
    settings.trailDim = trailDimEl.checked;
    saveSettings();
  });
}

const whiteCirclesOnlyEl = document.getElementById("whiteCirclesOnly") as HTMLInputElement | null;
if (whiteCirclesOnlyEl) {
  whiteCirclesOnlyEl.addEventListener("change", () => {
    settings.whiteCirclesOnly = whiteCirclesOnlyEl.checked;
    saveSettings();
    updateOpenImageBtn();
  });
}

const resetBtn = document.getElementById("resetSettings");
if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    Object.assign(settings, defaultSettings);
    syncUIFromSettings();
    saveSettings();
    updateOpenImageBtn();
  });
}

document.getElementById("settingsToggle")!.addEventListener("click", () => {
  document.getElementById("settingsPanel")!.classList.toggle("hidden");
});

// ── Image buttons ─────────────────────────────────────────────

const openImageBtn = document.getElementById("openImageBtn")!;
openImageBtn.addEventListener("click", () => {
  const url = bgState.bgRawImg ? bgState.bgRawImg.src : null;
  if (!url) return;
  window.open("image.html?url=" + encodeURIComponent(url), "_blank", "noopener,noreferrer");
});

const nextImageBtn = document.getElementById("nextImageBtn")!;
nextImageBtn.addEventListener("click", () => {
  loadBackgroundImage(updateOpenImageBtn);
});

function updateOpenImageBtn(): void {
  const visible = !settings.whiteCirclesOnly && !!bgState.bgRawImg;
  openImageBtn.classList.toggle("hidden", !visible);
  nextImageBtn.classList.toggle("hidden", !!settings.whiteCirclesOnly);
}

// ── Mouse tracking ────────────────────────────────────────────

const mouse: MouseState = { x: MOUSE_OFFSCREEN, y: MOUSE_OFFSCREEN };
addEventListener("mousemove", e => { mouse.x = e.clientX; mouse.y = e.clientY; });
addEventListener("mouseleave", () => { mouse.x = MOUSE_OFFSCREEN; mouse.y = MOUSE_OFFSCREEN; });

// ── Background image setup ────────────────────────────────────

addEventListener("resize", () => {
  if (bgState.bgRawImg) bgState.bgImage = fitImageToCanvas(bgState.bgRawImg, bgState.bgFocalX, bgState.bgFocalY);
  if (bgState.nextBgRawImg) bgState.nextBgImage = fitImageToCanvas(bgState.nextBgRawImg, bgState.nextFocalX, bgState.nextFocalY);
});
loadBackgroundImage(updateOpenImageBtn);
setInterval(() => loadBackgroundImage(updateOpenImageBtn), 30000);

// ── Animation state ───────────────────────────────────────────

let drops: Drop[] = [];

// Per-column: globalFallDistance at which to next spawn a drop.
// Initialized with staggered offsets so columns don't all fire at once.
let columnNextSpawn: number[] = [];

// All drops snap their spawn to the nearest grid boundary of this value,
// keeping positions aligned to integer multiples of rowStep.
let globalFallDistance = 0;

function dropsInColumn(ci: number): number {
  let n = 0;
  for (const d of drops) if (d.col === ci) n++;
  return n;
}

function canSpawnInColumn(ci: number): boolean {
  const minSpacing = 3 * rowStep();
  const spawnY = -rowStep();
  for (const d of drops) {
    if (d.col === ci && Math.abs(d.continuousY - spawnY) < minSpacing) return false;
  }
  return true;
}

function initColumnSpawns(): void {
  const cols = columnCount();
  const interval = spawnInterval();
  columnNextSpawn = Array.from({ length: cols }, () =>
    globalFallDistance + Math.random() * interval
  );
}
initColumnSpawns();

// ── Ghost canvas ──────────────────────────────────────────────

let ghostCanvasState: GhostCanvas | null = null;

function getGhostCanvas(radius: number): GhostCanvas {
  const size = Math.ceil(radius * 2);
  if (!ghostCanvasState || ghostCanvasState.size !== size) {
    const gc = document.createElement("canvas");
    gc.width = size;
    gc.height = size;
    ghostCanvasState = { canvas: gc, ctx: gc.getContext("2d")!, size };
  }
  return ghostCanvasState;
}

// ── Smooth grow/shrink near mouse ──────────────────────────────

const residualGrowth = new Map<string, number>();

// ── Main loop ─────────────────────────────────────────────────

function frame(): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.clearRect(0, 0, W(), H());

  const cols = columnCount();
  while (columnNextSpawn.length < cols) {
    columnNextSpawn.push(globalFallDistance + Math.random() * spawnInterval());
  }

  globalFallDistance += settings.fallSpeed * SPEED_SCALE;

  // Spawn new drops at deterministic intervals
  const interval = spawnInterval();
  for (let c = 0; c < cols; c++) {
    if (globalFallDistance >= columnNextSpawn[c]
        && dropsInColumn(c) < settings.maxPerColumn
        && canSpawnInColumn(c)) {
      drops.push(new Drop(c, globalFallDistance));
      columnNextSpawn[c] = globalFallDistance + interval * (0.8 + Math.random() * 0.4);
    }
  }

  for (const d of drops) d.update(globalFallDistance);

  // Collect trail circles, deduplicating by grid position (largest wins)
  const trailMap = new Map<string, TrailCircle>();
  const activeKeys = new Set<string>();
  for (const d of drops) {
    const yOff = columnYOffset(d.col);
    const r = settings.circleRadius;
    const trailLen = d.trail.length;
    const frac = d.rowFraction;
    const atMax = trailLen >= settings.trailLength;

    for (let i = 0; i < trailLen; i++) {
      const ty = d.trail[i] + yOff;
      const t = atMax
        ? (i + 1 - frac) / (trailLen + 1)
        : (i + 1) / (trailLen + 1 + frac);
      const tCurve = t * t;
      const circleR = r * (0.1 + 0.9 * tCurve);
      const alpha = settings.trailDim ? (0.05 + 0.6 * tCurve) : 0.65;
      const mi = d.mouseInfluence(d.x, ty, mouse);

      const key = `${d.col},${d.trail[i]}`;
      activeKeys.add(key);
      const existing = trailMap.get(key);
      if (!existing || circleR > existing.circleR) {
        trailMap.set(key, {
          drawX: d.x, drawY: ty, circleR,
          finalAlpha: alpha + mi.extra, influence: mi.influence, key,
        });
      }
    }
  }

  // Prune growth entries for circles that no longer exist
  for (const key of residualGrowth.keys()) {
    if (!activeKeys.has(key)) residualGrowth.delete(key);
  }

  // Draw trail circles with smooth grow/shrink
  for (const tc of trailMap.values()) {
    const current = residualGrowth.get(tc.key) ?? 0;
    const rate = tc.influence > current ? GROWTH_SPEED : SHRINK_SPEED;
    let growth = current + (tc.influence - current) * rate;
    if (growth < 0.001) growth = 0;
    residualGrowth.set(tc.key, growth);

    const grownR = tc.circleR * (1 + growth * (MAX_GROWTH - 1));

    ctx.beginPath();
    ctx.arc(tc.drawX, tc.drawY, Math.max(grownR, 1), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${tc.finalAlpha})`;
    ctx.fill();

    if (growth > 0.01) {
      ctx.beginPath();
      ctx.arc(tc.drawX, tc.drawY, grownR * 1.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${growth * 0.1})`;
      ctx.fill();
    }
  }

  // Composite background image through trail circles
  if (tickTransition()) updateOpenImageBtn();
  drawBackground(ctx, W(), H());

  // Draw head circles on top (always white)
  for (const d of drops) d.drawHead(ctx, mouse);

  drops = drops.filter(d => d.alive);

  // Faint column guides
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1;
  for (let c = 0; c < cols; c++) {
    const x = columnX(c);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H());
    ctx.stroke();
  }

  // Ghost image reveal near cursor
  if (!settings.whiteCirclesOnly && bgState.bgImage && mouse.x > MOUSE_OFFSCREEN + 1) {
    const ghostR = settings.mouseRadius;
    const { canvas: gc, ctx: gctx } = getGhostCanvas(ghostR);
    drawGhost(ctx, mouse.x, mouse.y, gc, gctx, ghostR, settings.mouseRevealBrightness, W(), H());
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
