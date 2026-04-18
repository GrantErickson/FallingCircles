import { settings } from './settings';
import { TRANSITION_DURATION } from './constants';
import { W, H } from './grid';

// ── Background image state ────────────────────────────────────

export interface BackgroundState {
  bgImage: HTMLCanvasElement | null;
  bgRawImg: HTMLImageElement | null;
  bgFocalX: number;
  bgFocalY: number;
  nextBgImage: HTMLCanvasElement | null;
  nextBgRawImg: HTMLImageElement | null;
  nextFocalX: number;
  nextFocalY: number;
  transitioning: boolean;
  transitionAlpha: number;
  transitionStart: number;
}

export const bgState: BackgroundState = {
  bgImage: null,
  bgRawImg: null,
  bgFocalX: 0.5,
  bgFocalY: 0.5,
  nextBgImage: null,
  nextBgRawImg: null,
  nextFocalX: 0.5,
  nextFocalY: 0.5,
  transitioning: false,
  transitionAlpha: 0,
  transitionStart: 0,
};

// ── Background image loading ──────────────────────────────────

// Type declaration for the Shape Detection API (not yet in TypeScript's lib)
interface FaceDetectionResult {
  boundingBox: DOMRectReadOnly;
}
declare class FaceDetector {
  constructor(options?: { fastMode?: boolean; maxDetectedFaces?: number });
  detect(image: ImageBitmapSource): Promise<FaceDetectionResult[]>;
}

// Single reusable FaceDetector instance (null when the API is unavailable)
const faceDetector: FaceDetector | null = (() => {
  if (typeof FaceDetector === "undefined") return null;
  try { return new FaceDetector({ fastMode: true, maxDetectedFaces: 10 }); }
  catch { return null; }
})();

// Detects the focal point of an image using the FaceDetector API when available.
// Returns normalized [x, y] coordinates (0–1), defaulting to center [0.5, 0.5].
async function detectFocalPoint(img: HTMLImageElement): Promise<[number, number]> {
  if (!faceDetector) return [0.5, 0.5];
  try {
    const faces = await faceDetector.detect(img);
    if (faces.length === 0) return [0.5, 0.5];
    let totalArea = 0;
    let weightedX = 0;
    let weightedY = 0;
    for (const face of faces) {
      const { x, y, width, height } = face.boundingBox;
      const area = width * height;
      weightedX += ((x + width / 2) / img.naturalWidth) * area;
      weightedY += ((y + height / 2) / img.naturalHeight) * area;
      totalArea += area;
    }
    return [weightedX / totalArea, weightedY / totalArea];
  } catch {
    return [0.5, 0.5];
  }
}

export function fitImageToCanvas(img: HTMLImageElement, focalX = 0.5, focalY = 0.5): HTMLCanvasElement {
  const sw = W(), sh = H();
  const offscreen = document.createElement("canvas");
  offscreen.width = sw;
  offscreen.height = sh;
  const octx = offscreen.getContext("2d")!;

  const imgAspect = img.naturalWidth / img.naturalHeight;
  const scrAspect = sw / sh;
  let drawW, drawH, drawX, drawY;
  if (imgAspect > scrAspect) {
    drawH = sh; drawW = sh * imgAspect;
    drawX = Math.max(sw - drawW, Math.min(0, focalX * (sw - drawW)));
    drawY = 0;
  } else {
    drawW = sw; drawH = sw / imgAspect;
    drawX = 0;
    drawY = Math.max(sh - drawH, Math.min(0, focalY * (sh - drawH)));
  }
  octx.drawImage(img, drawX, drawY, drawW, drawH);
  return offscreen;
}

export function loadBackgroundImage(onLoaded: () => void): void {
  fetch("https://app.ais.team/api/ImageSearchService/getRandomCuratedImageUrls?count=1")
    .then(r => r.json())
    .then((data: unknown) => {
      const d = data as { wasSuccessful?: boolean; object?: unknown };
      const urls = d?.wasSuccessful && d.object ? d.object : data;
      const url = Array.isArray(urls) ? (urls as string[])[0] : (urls as string);
      if (!url) return;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = async () => {
        const [focalX, focalY] = await detectFocalPoint(img);
        if (!bgState.bgImage) {
          bgState.bgRawImg = img;
          bgState.bgFocalX = focalX;
          bgState.bgFocalY = focalY;
          bgState.bgImage = fitImageToCanvas(img, focalX, focalY);
          onLoaded();
        } else {
          bgState.nextBgRawImg = img;
          bgState.nextFocalX = focalX;
          bgState.nextFocalY = focalY;
          bgState.nextBgImage = fitImageToCanvas(img, focalX, focalY);
          bgState.transitioning = true;
          bgState.transitionStart = performance.now();
          bgState.transitionAlpha = 0;
        }
      };
      img.src = url;
    })
    .catch(() => { /* fall back to white circles */ });
}

// ── Crossfade tick (called once per frame) ────────────────────
// Advances the transition and swaps images when complete.
// Returns true if a repaint of the button state is needed.
export function tickTransition(): boolean {
  if (!bgState.transitioning || !bgState.nextBgImage) return false;

  const elapsed = performance.now() - bgState.transitionStart;
  bgState.transitionAlpha = Math.min(elapsed / TRANSITION_DURATION, 1);

  if (bgState.transitionAlpha >= 1) {
    bgState.bgImage = bgState.nextBgImage;
    bgState.bgRawImg = bgState.nextBgRawImg;
    bgState.bgFocalX = bgState.nextFocalX;
    bgState.bgFocalY = bgState.nextFocalY;
    bgState.nextBgImage = null;
    bgState.nextBgRawImg = null;
    bgState.nextFocalX = 0.5;
    bgState.nextFocalY = 0.5;
    bgState.transitioning = false;
    bgState.transitionAlpha = 0;
    return true;
  }
  return false;
}

// ── Draw background image composite (source-atop) ────────────
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): void {
  if (settings.whiteCirclesOnly || !bgState.bgImage) return;

  ctx.globalCompositeOperation = "source-atop";
  if (bgState.transitioning && bgState.nextBgImage) {
    ctx.globalAlpha = 1 - bgState.transitionAlpha;
    ctx.drawImage(bgState.bgImage, 0, 0, w, h);
    ctx.globalAlpha = bgState.transitionAlpha;
    ctx.drawImage(bgState.nextBgImage, 0, 0, w, h);
    ctx.globalAlpha = 1;
  } else {
    ctx.drawImage(bgState.bgImage, 0, 0, w, h);
  }

  // Brightness adjustment
  const b = settings.trailBrightness;
  if (b < 1) {
    ctx.fillStyle = `rgba(0,0,0,${1 - b})`;
    ctx.fillRect(0, 0, w, h);
  } else if (b > 1) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(b - 1, 1)})`;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.globalCompositeOperation = "source-over";
}

// ── Draw ghost image reveal near cursor ───────────────────────
export function drawGhost(
  ctx: CanvasRenderingContext2D,
  mouseX: number,
  mouseY: number,
  ghostCanvas: HTMLCanvasElement,
  ghostCtx: CanvasRenderingContext2D,
  ghostR: number,
  ghostAlpha: number,
  w: number,
  h: number
): void {
  if (settings.whiteCirclesOnly || !bgState.bgImage) return;

  const gSize = ghostCanvas.width;
  ghostCtx.clearRect(0, 0, gSize, gSize);

  const grad = ghostCtx.createRadialGradient(ghostR, ghostR, 0, ghostR, ghostR, ghostR);
  grad.addColorStop(0, `rgba(255,255,255,${ghostAlpha})`);
  grad.addColorStop(0.6, `rgba(255,255,255,${ghostAlpha * 0.4})`);
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ghostCtx.globalCompositeOperation = "source-over";
  ghostCtx.fillStyle = grad;
  ghostCtx.fillRect(0, 0, gSize, gSize);

  // Blit only the visible sub-rectangle of the background
  ghostCtx.globalCompositeOperation = "source-in";
  const gx = mouseX - ghostR;
  const gy = mouseY - ghostR;
  const sx = Math.max(0, gx);
  const sy = Math.max(0, gy);
  const sw = Math.min(w, gx + gSize) - sx;
  const sh = Math.min(h, gy + gSize) - sy;
  const dx = sx - gx;
  const dy = sy - gy;

  if (sw > 0 && sh > 0) {
    if (bgState.transitioning && bgState.nextBgImage) {
      ghostCtx.globalAlpha = 1 - bgState.transitionAlpha;
      ghostCtx.drawImage(bgState.bgImage!, sx, sy, sw, sh, dx, dy, sw, sh);
      ghostCtx.globalAlpha = bgState.transitionAlpha;
      ghostCtx.drawImage(bgState.nextBgImage, sx, sy, sw, sh, dx, dy, sw, sh);
      ghostCtx.globalAlpha = 1;
    } else {
      ghostCtx.drawImage(bgState.bgImage!, sx, sy, sw, sh, dx, dy, sw, sh);
    }
  }

  ghostCtx.globalCompositeOperation = "source-over";
  ctx.drawImage(ghostCanvas, gx, gy);
}
