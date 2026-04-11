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
    maxPerColumn: 8,
    gap: 1,              // px gap between adjacent circles
    mouseRadius: 120,
    continuousHead: true, // head falls continuously without smoothing
    headSmoothing: 0.8,  // 0 = snap to grid row, 1 = fully interpolated glide
    headScaleMin: 0.3,   // minimum scale when head first appears at new row
    headFadeMin: 0.4,    // minimum opacity when head first appears at new row
    trailBrightness: 1,  // brightness of image-colored trail circles (0=dark, 1=normal, 2=bright)
    trailDim: false,     // whether trail circles fade (dim) in addition to shrinking
    whiteCirclesOnly: false, // disable picture, use plain white circles
  };

  // Wire up UI controls
  const sliders = [
    "circleRadius", "fallSpeed", "spawnRate",
    "trailLength", "maxPerColumn", "gap", "mouseRadius",
    "headSmoothing", "headScaleMin", "headFadeMin",
    "trailBrightness"
  ];
  sliders.forEach(id => {
    const el = document.getElementById(id);
    const valEl = document.getElementById(id + "Val");
    if (!el) return;
    el.addEventListener("input", () => {
      settings[id] = parseFloat(el.value);
      valEl.textContent = el.value;
    });
  });

  // Trail dim checkbox
  const trailDimEl = document.getElementById("trailDim");
  if (trailDimEl) {
    trailDimEl.addEventListener("change", () => {
      settings.trailDim = trailDimEl.checked;
    });
  }

  // White circles only checkbox
  const whiteCirclesOnlyEl = document.getElementById("whiteCirclesOnly");
  if (whiteCirclesOnlyEl) {
    whiteCirclesOnlyEl.addEventListener("change", () => {
      settings.whiteCirclesOnly = whiteCirclesOnlyEl.checked;
    });
  }

  // Continuous head checkbox
  const continuousHeadEl = document.getElementById("continuousHead");
  if (continuousHeadEl) {
    continuousHeadEl.addEventListener("change", () => {
      settings.continuousHead = continuousHeadEl.checked;
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

  // Offset every other column by half a diameter so adjacent circles interlock
  function columnYOffset(index) {
    return (index % 2 === 0) ? 0 : settings.circleRadius;
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
      // frame counter for quantized movement
      this.tickCounter = 0;
      // ticks between each grid step (derived from fallSpeed)
      this.tickInterval = Math.max(2, Math.round(12 / Math.max(settings.fallSpeed, 0.1)));
      // slight variation for organic feel
      this.tickInterval += Math.floor(Math.random() * 3) - 1;
      // randomise starting tick so drops in different columns don't step in sync
      this.tickCounter = Math.floor(Math.random() * this.tickInterval);

      if (startRow !== undefined && startRow !== null) {
        // Pre-seeded drop: place at a specific row with a partial trail
        this.row = startRow;
        this.y = startRow * rowStep();
        this.continuousY = this.y;   // pixel-level y for continuous mode
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
        this.row = -1;                // current grid row (0 = top visible row)
        this.y = -rowStep();          // pixel y of the leading circle
        this.continuousY = this.y;    // pixel-level y for continuous mode
        this.trail = [];              // array of grid-row y positions visited
      }
    }

    update() {
      if (settings.continuousHead) {
        // Continuous mode: head moves every frame by a pixel speed
        const speed = settings.fallSpeed * 1.2;
        this.continuousY += speed;

        // Check if we crossed into a new grid row
        const step = rowStep();
        const nextRowY = (this.row + 1) * step;
        if (this.continuousY >= nextRowY) {
          this.row++;
          this.y = this.row * step;

          // Leave a quantized trail circle at this grid position
          this.trail.push(this.y);
          if (this.trail.length > settings.trailLength) this.trail.shift();
        }
      } else {
        // Original quantized mode
        this.tickCounter++;
        if (this.tickCounter >= this.tickInterval) {
          this.tickCounter = 0;
          // Advance one grid row
          this.row++;
          this.y = this.row * rowStep();

          // Push current position into trail (trail stores y values)
          this.trail.push(this.y);
          if (this.trail.length > settings.trailLength) this.trail.shift();

          // Recalculate tick interval in case fallSpeed changed
          this.tickInterval = Math.max(2, Math.round(12 / Math.max(settings.fallSpeed, 0.1)));
        }
      }

      // Off screen? (leading circle plus trail all off-screen)
      const headPos = settings.continuousHead ? this.continuousY : this.y;
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

      // Draw leading (head) circle
      let headY;
      let headScale;
      let headFade;

      if (settings.continuousHead) {
        headY = this.continuousY + yOff;
        headScale = 1;
        headFade = 1;
      } else {
        const tickProgress = Math.min(this.tickCounter / Math.max(this.tickInterval - 1, 1), 1);
        const ease = 1 - Math.pow(1 - tickProgress, 3);
        const scaleMin = settings.headScaleMin;
        const fadeMin = settings.headFadeMin;
        headScale = scaleMin + (1 - scaleMin) * ease;
        headFade = fadeMin + (1 - fadeMin) * ease;

        const smoothing = settings.headSmoothing;
        const prevRowY = (this.row - 1) * rowStep();
        const currRowY = this.row * rowStep();
        const interpY = prevRowY + (currRowY - prevRowY) * (1 - smoothing + smoothing * ease);
        headY = interpY + yOff;
      }

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

  // Alternating column parity for hex-grid spawning in continuous mode
  let spawnParity = 0; // 0 = even columns, 1 = odd columns
  let spawnParityTimer = 0;

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
      const headY = settings.continuousHead ? d.continuousY : d.y;
      if (Math.abs(headY - spawnY) < minSpacing) return false;
    }
    return true;
  }

  // ── Pre-seed the screen so it starts looking populated ────────
  function seedDrops() {
    const cols = columnCount();
    const maxRow = Math.ceil(H() / rowStep());
    columnCooldowns = new Array(cols).fill(0);

    for (let c = 0; c < cols; c++) {
      // Randomly decide how many drops to pre-place in this column (0 to maxPerColumn)
      const count = Math.floor(Math.random() * (settings.maxPerColumn + 1));
      for (let n = 0; n < count; n++) {
        const startRow = Math.floor(Math.random() * maxRow);
        drops.push(new Drop(c, startRow));
      }
      columnCooldowns[c] = randomCooldown();
    }
  }
  seedDrops();

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

    // Spawn new drops with per-column cooldowns
    // In continuous mode, alternate between even/odd columns for hex-grid spacing
    const SPAWN_PARITY_INTERVAL = 60; // frames between parity switches
    if (settings.continuousHead) {
      spawnParityTimer += 1;
      if (spawnParityTimer >= SPAWN_PARITY_INTERVAL) {
        spawnParityTimer = 0;
        spawnParity = 1 - spawnParity;
      }
    }

    for (let c = 0; c < cols; c++) {
      // In continuous mode, only spawn in columns matching current parity
      if (settings.continuousHead && (c % 2) !== spawnParity) {
        continue;
      }
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

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
