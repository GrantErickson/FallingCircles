/* ================================================================
   Falling Circles – Main Application
   ================================================================ */

(() => {
  "use strict";

  // ── Canvas setup ──────────────────────────────────────────────
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  function resize() {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
  }
  window.addEventListener("resize", resize);
  resize();

  const W = () => window.innerWidth;
  const H = () => window.innerHeight;

  // ── Settings ──────────────────────────────────────────────────
  const settings = {
    circleRadius: 10,
    fallSpeed: 1.25,
    spawnRate: 0.025,    // probability per column per frame
    trailLength: 24,
    maxPerColumn: 3,
    gap: 1,              // px gap between adjacent circles
    mouseRadius: 120,
    trailBrightness: 1,  // brightness of image-colored trail circles (0=dark, 1=normal, 2=bright)
    trailDim: false,     // whether trail circles fade (dim) in addition to shrinking
    whiteCirclesOnly: false, // disable picture, use plain white circles
    speedVariation: 0.25,    // random speed offset per drop (0 = uniform, 1 = ±100% variation)
  };

  // Keep a copy of the defaults for the reset button
  const defaultSettings = Object.assign({}, settings);

  // ── LocalStorage persistence ──────────────────────────────────
  const STORAGE_KEY = "fallingCirclesSettings";

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (_) { /* storage unavailable */ }
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      for (const key of Object.keys(settings)) {
        if (key in saved && typeof saved[key] === typeof settings[key]) {
          settings[key] = saved[key];
        }
      }
    } catch (_) { /* ignore bad data */ }
  }

  loadSettings();

  // Wire up UI controls
  const sliders = [
    "circleRadius", "fallSpeed", "spawnRate",
    "trailLength", "maxPerColumn", "gap", "mouseRadius",
    "trailBrightness", "speedVariation"
  ];

  /** Sync all UI controls to reflect current settings values */
  function syncUIFromSettings() {
    sliders.forEach(id => {
      const el = document.getElementById(id);
      const valEl = document.getElementById(id + "Val");
      if (!el) return;
      el.value = settings[id];
      valEl.textContent = settings[id];
    });
    // Checkboxes
    const tdEl = document.getElementById("trailDim");
    if (tdEl) tdEl.checked = settings.trailDim;
    const wcEl = document.getElementById("whiteCirclesOnly");
    if (wcEl) wcEl.checked = settings.whiteCirclesOnly;
  }

  syncUIFromSettings();

  sliders.forEach(id => {
    const el = document.getElementById(id);
    const valEl = document.getElementById(id + "Val");
    if (!el) return;
    el.addEventListener("input", () => {
      settings[id] = parseFloat(el.value);
      valEl.textContent = el.value;
      saveSettings();
    });
  });

  // Trail dim checkbox
  const trailDimEl = document.getElementById("trailDim");
  if (trailDimEl) {
    trailDimEl.addEventListener("change", () => {
      settings.trailDim = trailDimEl.checked;
      saveSettings();
    });
  }

  // White circles only checkbox
  const whiteCirclesOnlyEl = document.getElementById("whiteCirclesOnly");
  if (whiteCirclesOnlyEl) {
    whiteCirclesOnlyEl.addEventListener("change", () => {
      settings.whiteCirclesOnly = whiteCirclesOnlyEl.checked;
      saveSettings();
    });
  }

  // Reset button
  const resetBtn = document.getElementById("resetSettings");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      Object.assign(settings, defaultSettings);
      syncUIFromSettings();
      saveSettings();
    });
  }

  // Settings panel toggle
  document.getElementById("settingsToggle").addEventListener("click", () => {
    document.getElementById("settingsPanel").classList.toggle("hidden");
  });

  // ── Mouse tracking ────────────────────────────────────────────
  const mouse = { x: -9999, y: -9999 };
  window.addEventListener("mousemove", e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener("mouseleave", () => { mouse.x = -9999; mouse.y = -9999; });

  // ── Column geometry helpers ───────────────────────────────────
  function columnWidth() {
    return settings.circleRadius * 2 + settings.gap;
  }

  function columnCount() {
    return Math.floor(W() / columnWidth());
  }

  function columnX(index) {
    const cw = columnWidth();
    const totalW = columnCount() * cw;
    const offsetX = (W() - totalW) / 2 + cw / 2; // centre grid
    return offsetX + index * cw;
  }

  // Offset every other column by half a row step so adjacent circles interlock
  function columnYOffset(index) {
    return (index % 2 === 0) ? 0 : rowStep() / 2;
  }

  // ── Vertical grid step (distance between row centres) ────────
  function rowStep() {
    return settings.circleRadius * 2 + settings.gap;
  }

  // ── Spawn cooldown range (frames) to stagger column spawns ────
  const COOLDOWN_MIN = 30;
  const COOLDOWN_MAX = 90;
  function randomCooldown() {
    return COOLDOWN_MIN + Math.floor(Math.random() * (COOLDOWN_MAX - COOLDOWN_MIN));
  }

  // ── Circle (drop) class ───────────────────────────────────────
  class Drop {
    constructor(colIndex, startRow) {
      this.col = colIndex;
      this.x = columnX(colIndex);
      this.alive = true;
      // Per-drop random speed multiplier for speed variation setting.
      // Math.random() * 2 - 1 produces a value in [-1, 1]; multiplied by
      // speedVariation and added to 1 this yields a range of [1-v, 1+v].
      this.speedMultiplier = 1 + (Math.random() * 2 - 1) * settings.speedVariation;
      // Accumulated offset from globalFallDistance for individual speed
      this.speedOffset = 0;

      if (startRow !== undefined && startRow !== null) {
        // Pre-seeded drop: place at a specific row with a partial trail
        this.row = startRow;
        this.y = startRow * rowStep();
        this.continuousY = this.y;   // pixel-level y for continuous mode
        this.spawnGridBase = 0;      // pre-seeded drops bypass grid-snap; row is absolute
        // Build a trail of preceding rows (only non-negative rows)
        const trailLen = Math.min(
          settings.trailLength,
          Math.max(0, startRow)  // can't trail above row 0
        );
        this.trail = [];
        for (let r = startRow - trailLen; r < startRow; r++) {
          this.trail.push(r * rowStep());
        }
      } else {
        // Snap spawn to the nearest grid boundary of globalFallDistance
        // so this drop is phase-locked with every other drop.
        const step = rowStep();
        this.spawnGridBase = Math.floor(globalFallDistance / step) * step;
        this.row = -1;                // current grid row (0 = top visible row)
        this.y = -step;               // pixel y of the leading circle
        this.continuousY = this.y;    // pixel-level y for continuous mode
        this.trail = [];              // array of grid-row y positions visited
      }
    }

    update() {
      // Continuous head mode: compute continuousY from globalFallDistance,
      // grid-snapped to this drop's spawn base.
      const step = rowStep();
      const speed = settings.fallSpeed * 1.2;
      this.speedOffset += speed * (this.speedMultiplier - 1);

      this.continuousY = (globalFallDistance + this.speedOffset - this.spawnGridBase) - step;
      const newRow = Math.floor(this.continuousY / step);

      // Advance row(s) and leave grid-snapped trail entries
      while (this.row < newRow) {
        this.row++;
        this.y = this.row * step;
        this.trail.push(this.y);
        if (this.trail.length > settings.trailLength) this.trail.shift();
      }

      // Off screen? (leading circle plus trail all off-screen)
      const headPos = this.continuousY;
      const trailTop = this.trail.length > 0 ? this.trail[0] : headPos;
      if (trailTop > H() + rowStep() * 2) {
        this.alive = false;
      }
    }

    /* Helper: compute mouse proximity influence for glow + growth */
    _mouseInfluence(px, py) {
      const mr = settings.mouseRadius;
      const dist = Math.hypot(px - mouse.x, py - mouse.y);
      const influence = dist < mr ? 1 - dist / mr : 0;
      const extra = influence > 0 ? influence * 0.5 : 0;
      return { extra, influence };
    }

    drawTrail(ctx) {
      const yOff = columnYOffset(this.col);
      const r = settings.circleRadius;
      const trailLen = this.trail.length;

      // Draw trail circles (oldest first, smallest first)
      for (let i = 0; i < trailLen; i++) {
        const ty = this.trail[i] + yOff;
        const t = (i + 1) / (trailLen + 1);
        const tCurve = t * t;
        const circleR = r * (0.1 + 0.9 * tCurve);
        const alpha = settings.trailDim ? (0.05 + 0.6 * tCurve) : 0.65;

        const mi = this._mouseInfluence(this.x, ty);
        const finalAlpha = alpha + mi.extra;

        ctx.beginPath();
        ctx.arc(this.x, ty, Math.max(circleR, 1), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${finalAlpha})`;
        ctx.fill();

        if (mi.influence > 0) {
          ctx.beginPath();
          ctx.arc(this.x, ty, circleR * 1.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${mi.influence * 0.08})`;
          ctx.fill();
        }
      }
    }

    drawHead(ctx) {
      const yOff = columnYOffset(this.col);
      const r = settings.circleRadius;

      // Draw leading (head) circle – always continuous mode
      const headY = this.continuousY + yOff;
      const headScale = 1;
      const headFade = 1;

      const mi = this._mouseInfluence(this.x, headY);
      const headAlpha = headFade * (0.95 + mi.extra);

      ctx.beginPath();
      ctx.arc(this.x, headY, r * headScale, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${headAlpha})`;
      ctx.fill();

      if (mi.influence > 0) {
        ctx.beginPath();
        ctx.arc(this.x, headY, r * headScale * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${mi.influence * 0.12})`;
        ctx.fill();
      }
    }
  }

  // ── Background image for circle coloring ──────────────────────
  let bgImage = null;       // offscreen canvas with cover-fitted image
  let _bgRawImg = null;

  // ── Image crossfade transition state ─────────────────────────
  let nextBgImage = null;      // offscreen canvas for the incoming image
  let _nextBgRawImg = null;
  let transitionAlpha = 0;     // 0 = showing old image, 1 = fully transitioned
  let transitioning = false;
  const TRANSITION_DURATION = 2000; // ms for the fade-in
  let transitionStart = 0;

  /** Fit image to a new offscreen canvas (cover mode) and return it. */
  function fitImageToCanvas(img) {
    const sw = W();
    const sh = H();
    const offscreen = document.createElement("canvas");
    offscreen.width = sw;
    offscreen.height = sh;
    const octx = offscreen.getContext("2d");

    const imgAspect = img.naturalWidth / img.naturalHeight;
    const scrAspect = sw / sh;
    let drawW, drawH, drawX, drawY;
    if (imgAspect > scrAspect) {
      drawH = sh;
      drawW = sh * imgAspect;
      drawX = (sw - drawW) / 2;
      drawY = 0;
    } else {
      drawW = sw;
      drawH = sw / imgAspect;
      drawX = 0;
      drawY = (sh - drawH) / 2;
    }
    octx.drawImage(img, drawX, drawY, drawW, drawH);
    return offscreen;
  }

  function fitImageToScreen(img) {
    bgImage = fitImageToCanvas(img);
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
            // First load – show immediately
            _bgRawImg = img;
            fitImageToScreen(img);
          } else {
            // Subsequent loads – crossfade into the new image
            _nextBgRawImg = img;
            nextBgImage = fitImageToCanvas(img);
            transitioning = true;
            transitionStart = performance.now();
            transitionAlpha = 0;
          }
        };
        img.src = url;
      })
      .catch(() => { /* silently fall back to white circles */ });
  }

  window.addEventListener("resize", () => {
    if (_bgRawImg) fitImageToScreen(_bgRawImg);
    if (_nextBgRawImg) nextBgImage = fitImageToCanvas(_nextBgRawImg);
  });
  loadBackgroundImage();

  // ── Rotate image every 30 seconds ────────────────────────────
  setInterval(loadBackgroundImage, 30000);

  // ── State ─────────────────────────────────────────────────────
  let drops = [];
  // Per-column spawn cooldowns to prevent synchronised spawns
  let columnCooldowns = [];

  // Global fall distance for synchronized falling in continuous mode.
  // All drops snap their spawn to the nearest grid boundary of this distance,
  // ensuring their positions always differ by integer multiples of rowStep.
  let globalFallDistance = 0;

  // Track how many active drops per column for spawn-limiting
  function dropsInColumn(ci) {
    let n = 0;
    for (const d of drops) if (d.col === ci) n++;
    return n;
  }

  // Check that no existing drop in the same column is within 3 vertical
  // row steps of a newly spawned drop (which starts near the top).
  function canSpawnInColumn(ci) {
    const minSpacing = 3 * rowStep();
    const spawnY = -rowStep(); // new drops start at row -1
    for (const d of drops) {
      if (d.col !== ci) continue;
      const headY = d.continuousY;
      if (Math.abs(headY - spawnY) < minSpacing) return false;
    }
    return true;
  }

  // ── Initialise column cooldowns ────────────────────────────────
  function initCooldowns() {
    const cols = columnCount();
    columnCooldowns = Array.from({ length: cols }, () => randomCooldown());
  }
  initCooldowns();

  // ── Ghost image overlay (cached offscreen canvas for mouse hover) ──────
  let _ghostCanvas = null;
  let _ghostCtx = null;
  let _ghostSize = 0;

  function getGhostCanvas(radius) {
    const size = Math.ceil(radius * 2);
    if (!_ghostCanvas || _ghostSize !== size) {
      _ghostCanvas = document.createElement("canvas");
      _ghostCanvas.width = size;
      _ghostCanvas.height = size;
      _ghostCtx = _ghostCanvas.getContext("2d");
      _ghostSize = size;
    }
    return { canvas: _ghostCanvas, ctx: _ghostCtx, size };
  }

  // ── Residual circle growth state (for smooth grow/shrink near mouse) ───
  const residualGrowth = new Map(); // key: "col,trailY" → current growth factor (0..1)
  const GROWTH_SPEED = 0.08;  // how fast circles grow toward target
  const SHRINK_SPEED = 0.04;  // how fast circles shrink back
  const MAX_GROWTH = 1.8;     // maximum scale multiplier when mouse is directly on circle

  // ── Main loop ─────────────────────────────────────────────────
  function frame() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.clearRect(0, 0, W(), H());

    // Background image is NOT drawn directly; circles are composited with it.

    const cols = columnCount();

    // Ensure cooldown array matches column count (e.g. after resize)
    while (columnCooldowns.length < cols) columnCooldowns.push(randomCooldown());

    // Advance global fall distance for grid synchronisation
    {
      const speed = settings.fallSpeed * 1.2;
      globalFallDistance += speed;
    }

    for (let c = 0; c < cols; c++) {
      if (columnCooldowns[c] > 0) {
        columnCooldowns[c]--;
        continue;
      }
      if (dropsInColumn(c) < settings.maxPerColumn && canSpawnInColumn(c) && Math.random() < settings.spawnRate) {
        drops.push(new Drop(c));
        columnCooldowns[c] = randomCooldown();
      }
    }

    // Update all drops
    for (const d of drops) {
      d.update();
    }

    // Pass 1: Draw trail circles (these get image-colored)
    // Collect all trail circles and deduplicate by position so that
    // overlapping residual circles at the same grid slot are drawn only once,
    // with the largest circle winning.
    const trailMap = new Map();
    const activeKeys = new Set();
    for (const d of drops) {
      const yOff = columnYOffset(d.col);
      const r = settings.circleRadius;
      const trailLen = d.trail.length;

      for (let i = 0; i < trailLen; i++) {
        const ty = d.trail[i] + yOff;
        const t = (i + 1) / (trailLen + 1);
        const tCurve = t * t;
        const circleR = r * (0.1 + 0.9 * tCurve);
        const alpha = settings.trailDim ? (0.05 + 0.6 * tCurve) : 0.65;

        const mi = d._mouseInfluence(d.x, ty);
        const finalAlpha = alpha + mi.extra;

        const drawX = d.x;
        const drawY = ty;

        const key = d.col + "," + d.trail[i];
        activeKeys.add(key);
        const existing = trailMap.get(key);
        if (!existing || circleR > existing.circleR) {
          trailMap.set(key, { drawX, drawY, circleR, finalAlpha, influence: mi.influence, key });
        }
      }
    }

    // Clean up growth entries for circles that no longer exist
    for (const key of residualGrowth.keys()) {
      if (!activeKeys.has(key)) residualGrowth.delete(key);
    }

    // Draw trail circles with smooth grow/shrink near mouse
    for (const tc of trailMap.values()) {
      // Compute target growth based on mouse proximity
      const targetGrowth = tc.influence;
      // Smoothly interpolate current growth toward target
      const currentGrowth = residualGrowth.get(tc.key) || 0;
      let newGrowth;
      if (targetGrowth > currentGrowth) {
        newGrowth = currentGrowth + (targetGrowth - currentGrowth) * GROWTH_SPEED;
      } else {
        newGrowth = currentGrowth + (targetGrowth - currentGrowth) * SHRINK_SPEED;
      }
      // Snap to zero if very small to avoid lingering micro-growth
      if (newGrowth < 0.001) newGrowth = 0;
      residualGrowth.set(tc.key, newGrowth);

      // Apply growth: scale the radius up
      const growScale = 1 + newGrowth * (MAX_GROWTH - 1);
      const grownR = tc.circleR * growScale;

      ctx.beginPath();
      ctx.arc(tc.drawX, tc.drawY, Math.max(grownR, 1), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255," + tc.finalAlpha + ")";
      ctx.fill();

      // Glow ring for circles near mouse
      if (newGrowth > 0.01) {
        ctx.beginPath();
        ctx.arc(tc.drawX, tc.drawY, grownR * 1.4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255," + (newGrowth * 0.1) + ")";
        ctx.fill();
      }
    }

    // Composite background image through trail circles so each trail circle
    // shows the image color at its position (avoids getImageData / CORS).
    if (!settings.whiteCirclesOnly) {
      // Advance crossfade transition
      if (transitioning && nextBgImage) {
        const elapsed = performance.now() - transitionStart;
        transitionAlpha = Math.min(elapsed / TRANSITION_DURATION, 1);
        if (transitionAlpha >= 1) {
          // Transition complete – promote next image to current
          bgImage = nextBgImage;
          _bgRawImg = _nextBgRawImg;
          nextBgImage = null;
          _nextBgRawImg = null;
          transitioning = false;
          transitionAlpha = 0;
        }
      }

      if (bgImage) {
        ctx.globalCompositeOperation = "source-atop";

        if (transitioning && nextBgImage) {
          // Blend old and new images during crossfade
          ctx.globalAlpha = 1 - transitionAlpha;
          ctx.drawImage(bgImage, 0, 0, W(), H());
          ctx.globalAlpha = transitionAlpha;
          ctx.drawImage(nextBgImage, 0, 0, W(), H());
          ctx.globalAlpha = 1;
        } else {
          ctx.drawImage(bgImage, 0, 0, W(), H());
        }

        // Adjust brightness of image-colored trail circles
        const brightness = settings.trailBrightness;
        if (brightness < 1) {
          const darkenAmount = 1 - brightness;
          ctx.fillStyle = `rgba(0,0,0,${darkenAmount})`;
          ctx.fillRect(0, 0, W(), H());
        } else if (brightness > 1) {
          const brightenAmount = Math.min(brightness - 1, 1);
          ctx.fillStyle = `rgba(255,255,255,${brightenAmount})`;
          ctx.fillRect(0, 0, W(), H());
        }

        ctx.globalCompositeOperation = "source-over";
      }
    }

    // Pass 2: Draw head circles on top (these stay white)
    for (const d of drops) {
      d.drawHead(ctx);
    }

    // Prune dead drops
    drops = drops.filter(d => d.alive);

    // Draw subtle column guides (very faint vertical lines)
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let c = 0; c < cols; c++) {
      const x = columnX(c);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H());
      ctx.stroke();
    }

    // ── Ghost image reveal near mouse cursor ────────────────────
    if (!settings.whiteCirclesOnly && bgImage && mouse.x > -9000) {
      const ghostR = settings.mouseRadius;
      const ghostAlpha = 0.18;
      const { canvas: gc, ctx: gctx, size: gSize } = getGhostCanvas(ghostR);

      gctx.clearRect(0, 0, gSize, gSize);

      // Radial gradient mask: semi-transparent at centre, transparent at edge
      const grad = gctx.createRadialGradient(ghostR, ghostR, 0, ghostR, ghostR, ghostR);
      grad.addColorStop(0, "rgba(255,255,255," + ghostAlpha + ")");
      grad.addColorStop(0.6, "rgba(255,255,255," + (ghostAlpha * 0.4) + ")");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      gctx.globalCompositeOperation = "source-over";
      gctx.fillStyle = grad;
      gctx.fillRect(0, 0, gSize, gSize);

      // Composite background image through the gradient mask
      gctx.globalCompositeOperation = "source-in";
      const gx = mouse.x - ghostR;
      const gy = mouse.y - ghostR;

      if (transitioning && nextBgImage) {
        gctx.globalAlpha = 1 - transitionAlpha;
        gctx.drawImage(bgImage, -gx, -gy, W(), H());
        gctx.globalAlpha = transitionAlpha;
        gctx.drawImage(nextBgImage, -gx, -gy, W(), H());
        gctx.globalAlpha = 1;
      } else {
        gctx.drawImage(bgImage, -gx, -gy, W(), H());
      }

      gctx.globalCompositeOperation = "source-over";

      // Stamp ghost onto main canvas
      ctx.drawImage(gc, gx, gy);
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
