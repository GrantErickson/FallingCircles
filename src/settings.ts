import type { Settings } from './types';

// ── Settings ──────────────────────────────────────────────────

export const settings: Settings = {
  circleRadius: 10,
  fallSpeed: 1.25,
  trailLength: 24,
  maxPerColumn: 3,
  gap: 1,
  mouseRadius: 200,
  mouseRevealBrightness: 0.5,
  trailBrightness: 1,
  trailDim: false,
  whiteCirclesOnly: false,
  speedVariation: 0.25,
};

export const defaultSettings: Readonly<Settings> = { ...settings };

// ── LocalStorage persistence ──────────────────────────────────

const STORAGE_KEY = "fallingCirclesSettings";

export function saveSettings(): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); }
  catch { /* storage unavailable */ }
}

export function loadSettings(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<Settings>;
    for (const key of Object.keys(settings) as (keyof Settings)[]) {
      if (key in saved && typeof saved[key] === typeof settings[key]) {
        (settings[key] as Settings[keyof Settings]) = saved[key]!;
      }
    }
  } catch { /* ignore bad data */ }
}

// ── Settings keys for range sliders ───────────────────────────

export const sliders: ReadonlyArray<keyof Settings> = [
  "circleRadius", "fallSpeed",
  "trailLength", "maxPerColumn", "gap", "mouseRadius",
  "mouseRevealBrightness", "trailBrightness", "speedVariation",
];
