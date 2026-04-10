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
    spawnRate: 0.04,     // probability per column per frame
    trailLength: 12,
    maxPerColumn: 3,
    gap: 2,              // px gap between adjacent circles
    mouseEffect: "glow",
    mouseRadius: 120,
  };

  // Wire up UI controls
  const sliders = [
    "circleRadius", "fallSpeed", "spawnRate",
    "trailLength", "maxPerColumn", "gap", "mouseRadius"
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

  // ── Circle (drop) class ───────────────────────────────────────
  class Drop {
    constructor(colIndex) {
      this.col = colIndex;
      this.x = columnX(colIndex);
      this.row = -1;                // current grid row (0 = top visible row)
      this.y = -rowStep();          // pixel y of the leading circle
      this.trail = [];              // array of grid-row y positions visited
      this.alive = true;
      // frame counter for quantized movement
      this.tickCounter = 0;
      // ticks between each grid step (derived from fallSpeed)
      this.tickInterval = Math.max(2, Math.round(12 / Math.max(settings.fallSpeed, 0.1)));
      // slight variation for organic feel
      this.tickInterval += Math.floor(Math.random() * 3) - 1;
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
        // Head is at this.y which is trail[trailLen-1] or newer
        // Scale: oldest = smallest, newest trail = second largest
        const t = (i + 1) / (trailLen + 1); // 0→1 approaching head
        const circleR = r * (0.2 + 0.8 * t);
        const alpha = 0.15 + 0.55 * t;

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

      // Draw leading (head) circle – the largest
      const headY = this.y + yOff;
      const mi = this._mouseInfluence(this.x, headY);
      const headAlpha = 0.95 + mi.extra;

      ctx.beginPath();
      ctx.arc(this.x + mi.dx, headY + mi.dy, r, 0, Math.PI * 2);
      if (mi.hue >= 0) {
        ctx.fillStyle = `hsla(${mi.hue}, 90%, 80%, ${headAlpha})`;
      } else {
        ctx.fillStyle = `rgba(255,255,255,${headAlpha})`;
      }
      ctx.fill();

      if (effect === "glow" && mi.influence > 0) {
        ctx.beginPath();
        ctx.arc(this.x + mi.dx, headY + mi.dy, r * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${mi.influence * 0.12})`;
        ctx.fill();
      }
    }
  }

  // ── State ─────────────────────────────────────────────────────
  let drops = [];
  // Track how many active drops per column for spawn-limiting
  function dropsInColumn(ci) {
    let n = 0;
    for (const d of drops) if (d.col === ci) n++;
    return n;
  }

  // ── Burst effect bookkeeping ──────────────────────────────────
  let burstCooldown = 0;

  // ── Main loop ─────────────────────────────────────────────────
  function frame() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.clearRect(0, 0, W(), H());

    const cols = columnCount();

    // Spawn new drops
    for (let c = 0; c < cols; c++) {
      if (dropsInColumn(c) < settings.maxPerColumn && Math.random() < settings.spawnRate) {
        drops.push(new Drop(c));
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
