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

  // ── Circle (drop) class ───────────────────────────────────────
  class Drop {
    constructor(colIndex) {
      this.col = colIndex;
      this.x = columnX(colIndex);
      this.baseY = -settings.circleRadius * 2;
      this.y = this.baseY;
      this.trail = [];           // {x, y, r, alpha}
      this.alive = true;
      // slight speed variation for organic feel
      this.speedMul = 0.85 + Math.random() * 0.3;
    }

    update() {
      const r = settings.circleRadius;
      const speed = settings.fallSpeed * this.speedMul;

      // Record trail before moving
      this.trail.push({ x: this.x, y: this.y, r, alpha: 1 });
      if (this.trail.length > settings.trailLength) this.trail.shift();

      // Move
      this.y += speed;

      // Fade / shrink trail
      const len = this.trail.length;
      for (let i = 0; i < len; i++) {
        const t = (i + 1) / len;  // 0→1, newest = 1
        this.trail[i].alpha = t * 0.6;
        this.trail[i].r = r * (0.2 + 0.8 * t);
      }

      // Off screen?
      if (this.y - r > H() + settings.trailLength * speed * 2) {
        this.alive = false;
      }
    }

    draw(ctx) {
      const yOff = columnYOffset(this.col);
      const mr = settings.mouseRadius;
      const effect = settings.mouseEffect;

      // Draw trail
      for (const t of this.trail) {
        let dx = 0, dy = 0;
        let extra = 0;
        let hue = -1;
        let freeze = 1;
        const dist = Math.hypot(t.x - mouse.x, (t.y + yOff) - mouse.y);
        const influence = dist < mr ? 1 - dist / mr : 0;

        if (influence > 0) {
          if (effect === "repel") {
            const angle = Math.atan2((t.y + yOff) - mouse.y, t.x - mouse.x);
            dx = Math.cos(angle) * influence * 12;
            dy = Math.sin(angle) * influence * 12;
          } else if (effect === "attract") {
            const angle = Math.atan2(mouse.y - (t.y + yOff), mouse.x - t.x);
            dx = Math.cos(angle) * influence * 8;
            dy = Math.sin(angle) * influence * 8;
          } else if (effect === "glow") {
            extra = influence * 0.5;
          } else if (effect === "color") {
            hue = influence * 220 + 180; // cyan → blue shift
          } else if (effect === "freeze") {
            freeze = 1 - influence * 0.95;
          }
        }

        const alpha = t.alpha * (freeze < 1 ? Math.max(freeze, 0.3) : 1) + extra;

        ctx.beginPath();
        ctx.arc(t.x + dx, t.y + yOff + dy, Math.max(t.r * 0.95, 1), 0, Math.PI * 2);
        if (hue >= 0) {
          ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${alpha})`;
        } else {
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        }
        ctx.fill();

        // Glow aura
        if (effect === "glow" && influence > 0) {
          ctx.beginPath();
          ctx.arc(t.x + dx, t.y + yOff + dy, t.r * 1.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${influence * 0.08})`;
          ctx.fill();
        }
      }

      // Draw main circle
      let dx = 0, dy = 0;
      let extra = 0;
      let hue = -1;
      const dist = Math.hypot(this.x - mouse.x, (this.y + yOff) - mouse.y);
      const influence = dist < mr ? 1 - dist / mr : 0;

      if (influence > 0) {
        if (effect === "repel") {
          const angle = Math.atan2((this.y + yOff) - mouse.y, this.x - mouse.x);
          dx = Math.cos(angle) * influence * 14;
          dy = Math.sin(angle) * influence * 14;
        } else if (effect === "attract") {
          const angle = Math.atan2(mouse.y - (this.y + yOff), mouse.x - this.x);
          dx = Math.cos(angle) * influence * 10;
          dy = Math.sin(angle) * influence * 10;
        } else if (effect === "glow") {
          extra = influence * 0.4;
        } else if (effect === "color") {
          hue = influence * 220 + 180;
        }
      }

      ctx.beginPath();
      ctx.arc(this.x + dx, this.y + yOff + dy, settings.circleRadius, 0, Math.PI * 2);
      if (hue >= 0) {
        ctx.fillStyle = `hsla(${hue}, 90%, 80%, ${1})`;
      } else {
        ctx.fillStyle = `rgba(255,255,255,${0.95 + extra})`;
      }
      ctx.fill();

      // Glow aura on main circle
      if (effect === "glow" && influence > 0) {
        ctx.beginPath();
        ctx.arc(this.x + dx, this.y + yOff + dy, settings.circleRadius * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${influence * 0.12})`;
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

    // Freeze effect: slow down drops near mouse
    const mr = settings.mouseRadius;

    // Update & draw
    for (const d of drops) {
      // If freeze effect, modulate speed temporarily
      if (settings.mouseEffect === "freeze") {
        const yOff = columnYOffset(d.col);
        const dist = Math.hypot(d.x - mouse.x, (d.y + yOff) - mouse.y);
        const influence = dist < mr ? 1 - dist / mr : 0;
        const origMul = d.speedMul;
        d.speedMul = origMul * (1 - influence * 0.95);
        d.update();
        d.speedMul = origMul;
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
