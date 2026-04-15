(() => {
  "use strict";

  // ── Canvas ────────────────────────────────────────────────────
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  function resize() {
    canvas.width = innerWidth * devicePixelRatio;
    canvas.height = innerHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
  }
  addEventListener("resize", resize);
  resize();

  const W = () => innerWidth;
  const H = () => innerHeight;

  // ── Constants ─────────────────────────────────────────────────
  const SPEED_SCALE = 1.2;
  const MOUSE_OFFSCREEN = -9999;

  // ── Settings ──────────────────────────────────────────────────
  const settings = {
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

  const defaultSettings = { ...settings };

  // ── LocalStorage persistence ──────────────────────────────────
  const STORAGE_KEY = "fallingCirclesSettings";

  function saveSettings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); }
    catch { /* storage unavailable */ }
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved) return;
      for (const key of Object.keys(settings)) {
        if (key in saved && typeof saved[key] === typeof settings[key]) {
          settings[key] = saved[key];
        }
      }
    } catch { /* ignore bad data */ }
  }

  loadSettings();

  // Wire up range sliders
  const sliders = [
    "circleRadius", "fallSpeed",
    "trailLength", "maxPerColumn", "gap", "mouseRadius",
    "mouseRevealBrightness", "trailBrightness", "speedVariation"
  ];

  function syncUIFromSettings() {
    for (const id of sliders) {
      const el = document.getElementById(id);
      const valEl = document.getElementById(id + "Val");
      if (!el) continue;
      el.value = settings[id];
      if (valEl) valEl.textContent = settings[id];
    }
    const tdEl = document.getElementById("trailDim");
    if (tdEl) tdEl.checked = settings.trailDim;
    const wcEl = document.getElementById("whiteCirclesOnly");
    if (wcEl) wcEl.checked = settings.whiteCirclesOnly;
  }

  syncUIFromSettings();

  for (const id of sliders) {
    const el = document.getElementById(id);
    const valEl = document.getElementById(id + "Val");
    if (!el) continue;
    el.addEventListener("input", () => {
      settings[id] = parseFloat(el.value);
      if (valEl) valEl.textContent = el.value;
      saveSettings();
    });
  }

  const trailDimEl = document.getElementById("trailDim");
  if (trailDimEl) {
    trailDimEl.addEventListener("change", () => {
      settings.trailDim = trailDimEl.checked;
      saveSettings();
    });
  }

  const whiteCirclesOnlyEl = document.getElementById("whiteCirclesOnly");
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

  document.getElementById("settingsToggle").addEventListener("click", () => {
    document.getElementById("settingsPanel").classList.toggle("hidden");
  });

  const openImageBtn = document.getElementById("openImageBtn");
  openImageBtn.addEventListener("click", () => {
    const url = bgRawImg ? bgRawImg.src : null;
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  });

  function updateOpenImageBtn() {
    const visible = !settings.whiteCirclesOnly && !!bgRawImg;
    openImageBtn.classList.toggle("hidden", !visible);
  }

  // ── Mouse tracking ────────────────────────────────────────────
  const mouse = { x: MOUSE_OFFSCREEN, y: MOUSE_OFFSCREEN };
  addEventListener("mousemove", e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  addEventListener("mouseleave", () => { mouse.x = MOUSE_OFFSCREEN; mouse.y = MOUSE_OFFSCREEN; });

  // ── Grid geometry ───────────────────────────────────────────
  const columnWidth = () => settings.circleRadius * 2 + settings.gap;
  const rowStep     = () => settings.circleRadius * 2 + settings.gap;
  const columnCount = () => Math.floor(W() / columnWidth());

  function columnX(index) {
    const cw = columnWidth();
    const totalW = columnCount() * cw;
    const offset = (W() - totalW) / 2 + cw / 2;
    return offset + index * cw;
  }

  // Offset odd columns by half a row step for hex-style interlocking
  function columnYOffset(index) {
    return index % 2 ? rowStep() / 2 : 0;
  }

  // ── Deterministic spawn interval ─────────────────────────────
  // Calculate the fall-distance interval at which to spawn a new drop
  // so that exactly maxPerColumn drops are visible per column.
  function spawnInterval() {
    const visibleDistance = H() + (settings.trailLength + 1) * rowStep();
    return visibleDistance / settings.maxPerColumn;
  }

  // ── Drop ───────────────────────────────────────────────────────
  class Drop {
    constructor(colIndex, startRow) {
      this.col = colIndex;
      this.x = columnX(colIndex);
      this.alive = true;
      this.speedMultiplier = 1 + (Math.random() * 2 - 1) * settings.speedVariation;
      this.speedOffset = 0;

      if (startRow != null) {
        // Pre-seeded: place at a specific row with a partial trail
        this.row = startRow;
        this.y = startRow * rowStep();
        this.continuousY = this.y;
        this.spawnGridBase = 0;
        const trailLen = Math.min(settings.trailLength, Math.max(0, startRow));
        this.trail = [];
        for (let r = startRow - trailLen; r < startRow; r++) {
          this.trail.push(r * rowStep());
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

    update() {
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
      if (trailTop > H() + step * 2) this.alive = false;
    }

    get rowFraction() {
      const step = rowStep();
      return step > 0 ? (this.continuousY / step) - this.row : 0;
    }

    mouseInfluence(px, py) {
      const dist = Math.hypot(px - mouse.x, py - mouse.y);
      const influence = dist < settings.mouseRadius ? 1 - dist / settings.mouseRadius : 0;
      return { extra: influence * 0.5, influence };
    }

    drawHead(ctx) {
      const headY = this.continuousY + columnYOffset(this.col);
      const r = settings.circleRadius;
      const mi = this.mouseInfluence(this.x, headY);

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

  // ── Background image for circle coloring ──────────────────────
  let bgImage = null;
  let bgRawImg = null;

  // Crossfade transition state
  let nextBgImage = null;
  let nextBgRawImg = null;
  let transitionAlpha = 0;
  let transitioning = false;
  const TRANSITION_DURATION = 2000;
  let transitionStart = 0;

  function fitImageToCanvas(img) {
    const sw = W(), sh = H();
    const offscreen = document.createElement("canvas");
    offscreen.width = sw;
    offscreen.height = sh;
    const octx = offscreen.getContext("2d");

    const imgAspect = img.naturalWidth / img.naturalHeight;
    const scrAspect = sw / sh;
    let drawW, drawH, drawX, drawY;
    if (imgAspect > scrAspect) {
      drawH = sh; drawW = sh * imgAspect;
      drawX = (sw - drawW) / 2; drawY = 0;
    } else {
      drawW = sw; drawH = sw / imgAspect;
      drawX = 0; drawY = (sh - drawH) / 2;
    }
    octx.drawImage(img, drawX, drawY, drawW, drawH);
    return offscreen;
  }

  function loadBackgroundImage() {
    fetch("https://app.ais.team/api/ImageSearchService/getRandomCuratedImageUrls?count=1")
      .then(r => r.json())
      .then(data => {
        const urls = data?.wasSuccessful && data.object ? data.object : data;
        const url = Array.isArray(urls) ? urls[0] : urls;
        if (!url) return;
        const img = new Image();
        img.onload = () => {
          if (!bgImage) {
            bgRawImg = img;
            bgImage = fitImageToCanvas(img);
            updateOpenImageBtn();
          } else {
            nextBgRawImg = img;
            nextBgImage = fitImageToCanvas(img);
            transitioning = true;
            transitionStart = performance.now();
            transitionAlpha = 0;
          }
        };
        img.src = url;
      })
      .catch(() => { /* fall back to white circles */ });
  }

  addEventListener("resize", () => {
    if (bgRawImg) bgImage = fitImageToCanvas(bgRawImg);
    if (nextBgRawImg) nextBgImage = fitImageToCanvas(nextBgRawImg);
  });
  loadBackgroundImage();
  setInterval(loadBackgroundImage, 30000);

  // ── State ─────────────────────────────────────────────────────
  let drops = [];

  // Per-column: globalFallDistance at which to next spawn a drop.
  // Initialized with staggered offsets so columns don't all fire at once.
  let columnNextSpawn = [];

  // All drops snap their spawn to the nearest grid boundary of this value,
  // keeping positions aligned to integer multiples of rowStep.
  let globalFallDistance = 0;

  function dropsInColumn(ci) {
    let n = 0;
    for (const d of drops) if (d.col === ci) n++;
    return n;
  }

  function canSpawnInColumn(ci) {
    const minSpacing = 3 * rowStep();
    const spawnY = -rowStep();
    for (const d of drops) {
      if (d.col === ci && Math.abs(d.continuousY - spawnY) < minSpacing) return false;
    }
    return true;
  }

  function initColumnSpawns() {
    const cols = columnCount();
    const interval = spawnInterval();
    columnNextSpawn = Array.from({ length: cols }, () =>
      globalFallDistance + Math.random() * interval
    );
  }
  initColumnSpawns();

  // ── Ghost image overlay (offscreen canvas for mouse hover) ─────
  let ghostCanvas = null;
  let ghostCtx = null;
  let ghostSize = 0;

  function getGhostCanvas(radius) {
    const size = Math.ceil(radius * 2);
    if (!ghostCanvas || ghostSize !== size) {
      ghostCanvas = document.createElement("canvas");
      ghostCanvas.width = size;
      ghostCanvas.height = size;
      ghostCtx = ghostCanvas.getContext("2d");
      ghostSize = size;
    }
    return { canvas: ghostCanvas, ctx: ghostCtx, size };
  }

  // ── Smooth grow/shrink near mouse ──────────────────────────────
  const residualGrowth = new Map();
  const GROWTH_SPEED = 0.08;
  const SHRINK_SPEED = 0.04;
  const MAX_GROWTH   = 1.8;

  // ── Main loop ─────────────────────────────────────────────────
  function frame() {
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
        drops.push(new Drop(c));
        columnNextSpawn[c] = globalFallDistance + interval * (0.8 + Math.random() * 0.4);
      }
    }

    for (const d of drops) d.update();

    // Collect trail circles, deduplicating by grid position (largest wins)
    const trailMap = new Map();
    const activeKeys = new Set();
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
        const mi = d.mouseInfluence(d.x, ty);

        const key = `${d.col},${d.trail[i]}`;
        activeKeys.add(key);
        const existing = trailMap.get(key);
        if (!existing || circleR > existing.circleR) {
          trailMap.set(key, {
            drawX: d.x, drawY: ty, circleR,
            finalAlpha: alpha + mi.extra, influence: mi.influence, key
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
      const current = residualGrowth.get(tc.key) || 0;
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
    if (!settings.whiteCirclesOnly && bgImage) {
      if (transitioning && nextBgImage) {
        const elapsed = performance.now() - transitionStart;
        transitionAlpha = Math.min(elapsed / TRANSITION_DURATION, 1);
        if (transitionAlpha >= 1) {
          bgImage = nextBgImage;
          bgRawImg = nextBgRawImg;
          nextBgImage = null;
          nextBgRawImg = null;
          transitioning = false;
          transitionAlpha = 0;
          updateOpenImageBtn();
        }
      }

      ctx.globalCompositeOperation = "source-atop";
      if (transitioning && nextBgImage) {
        ctx.globalAlpha = 1 - transitionAlpha;
        ctx.drawImage(bgImage, 0, 0, W(), H());
        ctx.globalAlpha = transitionAlpha;
        ctx.drawImage(nextBgImage, 0, 0, W(), H());
        ctx.globalAlpha = 1;
      } else {
        ctx.drawImage(bgImage, 0, 0, W(), H());
      }

      // Brightness adjustment
      const b = settings.trailBrightness;
      if (b < 1) {
        ctx.fillStyle = `rgba(0,0,0,${1 - b})`;
        ctx.fillRect(0, 0, W(), H());
      } else if (b > 1) {
        ctx.fillStyle = `rgba(255,255,255,${Math.min(b - 1, 1)})`;
        ctx.fillRect(0, 0, W(), H());
      }

      ctx.globalCompositeOperation = "source-over";
    }

    // Draw head circles on top (always white)
    for (const d of drops) d.drawHead(ctx);

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
    if (!settings.whiteCirclesOnly && bgImage && mouse.x > MOUSE_OFFSCREEN + 1) {
      const ghostR = settings.mouseRadius;
      const ghostAlpha = settings.mouseRevealBrightness;
      const { canvas: gc, ctx: gctx, size: gSize } = getGhostCanvas(ghostR);

      gctx.clearRect(0, 0, gSize, gSize);

      const grad = gctx.createRadialGradient(ghostR, ghostR, 0, ghostR, ghostR, ghostR);
      grad.addColorStop(0, `rgba(255,255,255,${ghostAlpha})`);
      grad.addColorStop(0.6, `rgba(255,255,255,${ghostAlpha * 0.4})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      gctx.globalCompositeOperation = "source-over";
      gctx.fillStyle = grad;
      gctx.fillRect(0, 0, gSize, gSize);

      // Blit only the visible sub-rectangle of the background
      gctx.globalCompositeOperation = "source-in";
      const gx = mouse.x - ghostR;
      const gy = mouse.y - ghostR;
      const sx = Math.max(0, gx);
      const sy = Math.max(0, gy);
      const sw = Math.min(W(), gx + gSize) - sx;
      const sh = Math.min(H(), gy + gSize) - sy;
      const dx = sx - gx;
      const dy = sy - gy;

      if (sw > 0 && sh > 0) {
        if (transitioning && nextBgImage) {
          gctx.globalAlpha = 1 - transitionAlpha;
          gctx.drawImage(bgImage, sx, sy, sw, sh, dx, dy, sw, sh);
          gctx.globalAlpha = transitionAlpha;
          gctx.drawImage(nextBgImage, sx, sy, sw, sh, dx, dy, sw, sh);
          gctx.globalAlpha = 1;
        } else {
          gctx.drawImage(bgImage, sx, sy, sw, sh, dx, dy, sw, sh);
        }
      }

      gctx.globalCompositeOperation = "source-over";
      ctx.drawImage(gc, gx, gy);
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
