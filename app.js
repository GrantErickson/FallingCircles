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
    circleRadius: 8,
    fallSpeed: 2,
    spawnRate: 0.025,    // probability per column per frame
    trailLength: 20,
    maxPerColumn: 5,
    gap: 2,              // px gap between adjacent circles
    mouseEffect: "glow",
    mouseRadius: 120,
    headSmoothing: 0.8,  // 0 = snap to grid row, 1 = fully interpolated glide
    headScaleMin: 0.3,   // minimum scale when head first appears at new row
    headFadeMin: 0.4,    // minimum opacity when head first appears at new row
  };

  // Wire up UI controls
  const sliders = [
    "circleRadius", "fallSpeed", "spawnRate",
    "trailLength", "maxPerColumn", "gap", "mouseRadius",
    "headSmoothing", "headScaleMin", "headFadeMin"
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

  document.querySelectorAll('input[name="mouseEffect"]').forEach(r => {
    r.addEventListener("change", () => { settings.mouseEffect = r.value; });
  });

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
        this.trail = [];              // array of grid-row y positions visited
      }
    }

    update() {
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

      // Off screen? (leading circle plus trail all off-screen)
      const trailTop = this.trail.length > 0 ? this.trail[0] : this.y;
      if (trailTop > H() + rowStep() * 2) {
        this.alive = false;
      }
    }

    /* Helper: apply mouse effect and return draw adjustments */
    _mouseInfluence(px, py) {
      const mr = settings.mouseRadius;
      const effect = settings.mouseEffect;
      const dist = Math.hypot(px - mouse.x, py - mouse.y);
      const influence = dist < mr ? 1 - dist / mr : 0;
      let dx = 0, dy = 0, extra = 0, hue = -1, freeze = 1;

      if (influence > 0) {
        if (effect === "repel") {
          const angle = Math.atan2(py - mouse.y, px - mouse.x);
          dx = Math.cos(angle) * influence * 12;
          dy = Math.sin(angle) * influence * 12;
        } else if (effect === "attract") {
          const angle = Math.atan2(mouse.y - py, mouse.x - px);
          dx = Math.cos(angle) * influence * 8;
          dy = Math.sin(angle) * influence * 8;
        } else if (effect === "glow") {
          extra = influence * 0.5;
        } else if (effect === "color") {
          hue = influence * 220 + 180;
        } else if (effect === "freeze") {
          freeze = 1 - influence * 0.95;
        }
      }
      return { dx, dy, extra, hue, freeze, influence };
    }

    draw(ctx) {
      const yOff = columnYOffset(this.col);
      const r = settings.circleRadius;
      const effect = settings.mouseEffect;
      const trailLen = this.trail.length;

      // Draw trail circles (oldest first, smallest first)
      for (let i = 0; i < trailLen; i++) {
        const ty = this.trail[i] + yOff;
        // i=0 is oldest/top, i=trailLen-1 is newest (just behind head)
        // Scale: use a power curve so more circles are small/faded at the tail
        const t = (i + 1) / (trailLen + 1); // 0→1 approaching head
        const tCurve = t * t; // power curve: more circles stay small/faint
        const circleR = r * (0.1 + 0.9 * tCurve);
        const alpha = 0.05 + 0.6 * tCurve;

        const mi = this._mouseInfluence(this.x, ty);
        const finalAlpha = alpha * (mi.freeze < 1 ? Math.max(mi.freeze, 0.3) : 1) + mi.extra;

        ctx.beginPath();
        ctx.arc(this.x + mi.dx, ty + mi.dy, Math.max(circleR, 1), 0, Math.PI * 2);
        if (mi.hue >= 0) {
          ctx.fillStyle = `hsla(${mi.hue}, 80%, 70%, ${finalAlpha})`;
        } else {
          ctx.fillStyle = `rgba(255,255,255,${finalAlpha})`;
        }
        ctx.fill();

        if (effect === "glow" && mi.influence > 0) {
          ctx.beginPath();
          ctx.arc(this.x + mi.dx, ty + mi.dy, circleR * 1.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${mi.influence * 0.08})`;
          ctx.fill();
        }
      }

      // Draw leading (head) circle – expand quickly from small to full size
      // tickProgress goes from 0 (just moved) to 1 (about to move again)
      const tickProgress = Math.min(this.tickCounter / Math.max(this.tickInterval - 1, 1), 1);
      // Fast ease-out curve: reaches ~90% size within first 30% of interval
      const ease = 1 - Math.pow(1 - tickProgress, 3);
      const scaleMin = settings.headScaleMin;
      const fadeMin = settings.headFadeMin;
      const headScale = scaleMin + (1 - scaleMin) * ease;
      const headFade = fadeMin + (1 - fadeMin) * ease;

      // Smooth position interpolation between previous and current grid row
      const smoothing = settings.headSmoothing;
      const prevRowY = (this.row - 1) * rowStep();
      const currRowY = this.row * rowStep();
      const interpY = prevRowY + (currRowY - prevRowY) * (1 - smoothing + smoothing * ease);
      const headY = interpY + yOff;
      const mi = this._mouseInfluence(this.x, headY);
      const headAlpha = headFade * (0.95 + mi.extra);

      ctx.beginPath();
      ctx.arc(this.x + mi.dx, headY + mi.dy, r * headScale, 0, Math.PI * 2);
      if (mi.hue >= 0) {
        ctx.fillStyle = `hsla(${mi.hue}, 90%, 80%, ${headAlpha})`;
      } else {
        ctx.fillStyle = `rgba(255,255,255,${headAlpha})`;
      }
      ctx.fill();

      if (effect === "glow" && mi.influence > 0) {
        ctx.beginPath();
        ctx.arc(this.x + mi.dx, headY + mi.dy, r * headScale * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${mi.influence * 0.12})`;
        ctx.fill();
      }
    }
  }

  // ── State ─────────────────────────────────────────────────────
  let drops = [];
  // Per-column spawn cooldowns to prevent synchronised bursts
  let columnCooldowns = [];

  // Track how many active drops per column for spawn-limiting
  function dropsInColumn(ci) {
    let n = 0;
    for (const d of drops) if (d.col === ci) n++;
    return n;
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

  // ── Burst effect bookkeeping ──────────────────────────────────
  let burstCooldown = 0;

  // ── Main loop ─────────────────────────────────────────────────
  function frame() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.clearRect(0, 0, W(), H());

    const cols = columnCount();

    // Ensure cooldown array matches column count (e.g. after resize)
    while (columnCooldowns.length < cols) columnCooldowns.push(randomCooldown());

    // Spawn new drops with per-column cooldowns
    for (let c = 0; c < cols; c++) {
      if (columnCooldowns[c] > 0) {
        columnCooldowns[c]--;
        continue;
      }
      if (dropsInColumn(c) < settings.maxPerColumn && Math.random() < settings.spawnRate) {
        drops.push(new Drop(c));
        columnCooldowns[c] = randomCooldown();
      }
    }

    // Burst effect: spawn extra near mouse
    if (settings.mouseEffect === "burst" && mouse.x > 0) {
      burstCooldown--;
      if (burstCooldown <= 0) {
        burstCooldown = 4; // every 4 frames
        const cw = columnWidth();
        for (let c = 0; c < cols; c++) {
          const cx = columnX(c);
          if (Math.abs(cx - mouse.x) < settings.mouseRadius * 0.5) {
            if (dropsInColumn(c) < settings.maxPerColumn + 2 && Math.random() < 0.35) {
              drops.push(new Drop(c));
            }
          }
        }
      }
    }

    // Update & draw
    for (const d of drops) {
      // If freeze effect, temporarily slow the tick counter
      if (settings.mouseEffect === "freeze") {
        const yOff = columnYOffset(d.col);
        const dist = Math.hypot(d.x - mouse.x, (d.y + yOff) - mouse.y);
        const mr = settings.mouseRadius;
        const influence = dist < mr ? 1 - dist / mr : 0;
        if (!(influence > 0.5 && Math.random() < influence * 0.9)) {
          d.update();
        }
      } else {
        d.update();
      }
      d.draw(ctx);
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
