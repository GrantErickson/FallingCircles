# Copilot Instructions for FallingCircles

## Project Overview

FallingCircles is a browser-based canvas animation of circles cascading down hex-grid columns, colored by a rotating background image. It is built with **pure vanilla HTML, CSS, and JavaScript** — no frameworks, no build tools, no transpilation, no package manager.

### File Structure

| File | Purpose |
|---|---|
| `app.js` | All animation logic: canvas rendering, physics, spawning, mouse effects, settings UI wiring, background image loading |
| `index.html` | Page structure, settings panel markup, and slider/checkbox controls |
| `style.css` | Styling for the overlay UI (settings panel, buttons) and the full-screen canvas |
| `image.html` | Standalone image viewer page opened via the 🖼 button |
| `readme.md` | Project documentation |

## Architecture

- **Single IIFE** — All JavaScript lives in one immediately-invoked function expression in `app.js` using `"use strict"`. There is no module system.
- **Canvas 2D API** — Rendering uses `requestAnimationFrame` for the main loop. Offscreen canvases are used for compositing (ghost image reveal near cursor).
- **Hex-grid layout** — Columns are one circle-diameter wide plus a configurable gap. Odd columns are offset vertically by half a row step for an interlocking pattern.
- **Deterministic spawning** — Drop spawn timing is derived from `spawnInterval()` (viewport height / maxPerColumn), not random probability. Per-column `columnNextSpawn` thresholds track `globalFallDistance` with ±20% random jitter.
- **Grid-synced rendering** — Drops snap their spawn position to the nearest grid boundary of `globalFallDistance` so trails stay phase-locked to integer multiples of `rowStep`.
- **Settings persistence** — All user-configurable values live in the `settings` object, persisted to `localStorage`, and synced to the HTML range sliders and checkboxes.
- **Background image compositing** — Trail circles are drawn white, then a `source-atop` composite operation overlays a fetched curated image. Images rotate every 30 seconds with a 2-second crossfade.

## Coding Standards

### General Principles

- **Zero dependencies.** Do not introduce npm packages, CDN scripts, or any external libraries. Every feature must be implemented with native browser APIs.
- **No build step.** There is no bundler, transpiler, or minifier. Code must run directly in modern browsers (Chrome, Firefox, Edge, Safari) as written.
- **Single-file JavaScript.** All logic stays in `app.js`. Do not split into modules unless the file exceeds ~1000 lines and there is a clear architectural boundary.
- **Keep it clean.** Remove dead code, unused variables, and commented-out blocks. Do not leave TODO comments or placeholder code. (See PR #30 for context.)

### JavaScript Style

- Use `const` by default; use `let` only when reassignment is necessary. Never use `var`.
- Use arrow functions for short callbacks and closures. Use `function` declarations for top-level named functions.
- Use template literals for string interpolation (e.g., `` `rgba(255,255,255,${alpha})` ``).
- Prefer `for...of` loops over `.forEach()` for iteration over arrays.
- Use early returns to reduce nesting.
- Use descriptive variable names: `columnNextSpawn`, `globalFallDistance`, `transitionAlpha` — not `cns`, `gfd`, `ta`.
- Group related constants and helpers under comment banners (e.g., `// ── Grid geometry ───`).
- Avoid magic numbers. Extract meaningful values as named constants (e.g., `SPEED_SCALE`, `MOUSE_OFFSCREEN`, `TRANSITION_DURATION`).

### Canvas & Rendering Best Practices

- Always call `ctx.beginPath()` before drawing a new shape to avoid path accumulation bugs.
- Use `Math.hypot()` for distance calculations instead of manual `sqrt(dx*dx + dy*dy)`.
- Cache expensive computations (e.g., `columnWidth()`, `rowStep()`, `columnCount()`) in local variables within hot loops when they are called repeatedly per frame.
- Use offscreen canvases for multi-pass compositing rather than reading back pixels with `getImageData()` (which fails on cross-origin images).
- Reset composite operations to `"source-over"` after any non-default composite pass.
- Be HiDPI aware: scale the canvas by `devicePixelRatio` and use CSS dimensions for layout.

### Performance

- The animation must maintain 60 fps on modern hardware. Avoid allocations in the main loop (`frame()`) — reuse objects, arrays, and Maps.
- Minimize DOM reads inside `requestAnimationFrame`. Read `innerWidth`/`innerHeight` via the `W()`/`H()` helpers.
- Use `Map` and `Set` for O(1) lookups in the render loop (e.g., `trailMap`, `residualGrowth`, `activeKeys`).
- Prefer integer arithmetic for grid calculations where possible.

### CSS

- Use `rgba()` for semi-transparent colors.
- Use `backdrop-filter: blur()` for glassmorphism UI effects.
- Use CSS transitions for smooth UI state changes (panel show/hide, button hover).
- Keep all styles in `style.css` — do not use inline styles in HTML except for dynamically computed values in JavaScript.

### HTML

- Use semantic elements where appropriate.
- Keep `index.html` focused on structure and settings controls. All behavior lives in `app.js`.
- Settings controls follow the pattern: `<label>` wrapping a `<input type="range">` and a `<span>` for the current value display.

### Security

- Validate all external URLs before use (see `image.html` for the URL scheme validation pattern: only allow `http:` and `https:` protocols).
- Never use `innerHTML` or `document.write` with user-supplied or external data. Use `textContent` or `createElement`.
- Use `noopener,noreferrer` when opening external URLs with `window.open`.
- Wrap `localStorage` and `fetch` calls in try/catch to handle unavailable storage or network errors gracefully.

## How to Add a New Setting

1. Add the default value to the `settings` object in `app.js`.
2. Add the setting key to the `sliders` array (for range inputs) or handle it separately (for checkboxes).
3. Add the corresponding `<label>`, `<input>`, and `<span>` in `index.html` inside `#settingsPanel`.
4. Wire up persistence by ensuring `saveSettings()` is called on change.
5. Update `syncUIFromSettings()` if the control is a checkbox.
6. Update `readme.md` to document the new setting in the appropriate table.

## How to Add a New Visual Effect

1. Add any needed state variables near the top of the IIFE, grouped under a comment banner.
2. Integrate into the `frame()` function at the appropriate rendering phase:
   - **Before trail drawing** — for background effects.
   - **Trail drawing loop** — for per-circle modifications.
   - **After trail drawing, before heads** — for overlay effects.
   - **After heads** — for post-processing effects.
3. If the effect uses mouse position, use the existing `mouse` object and the `mouseInfluence()` method pattern.
4. If the effect requires compositing, use an offscreen canvas (follow the `getGhostCanvas()` pattern).

## Common Patterns

### Adding to the Render Loop

```
// In frame(), after existing trail drawing:
// ── My New Effect ──────────────────────────────────────
// ... effect code here ...
```

### Settings Slider Wiring

```javascript
// In app.js, add to sliders array:
const sliders = [...existing, "myNewSetting"];

// In index.html, add inside #settingsPanel:
// <label>My New Setting
//   <input type="range" id="myNewSetting" min="0" max="1" value="0.5" step="0.05">
//   <span id="myNewSettingVal">0.5</span>
// </label>
```

## Testing

There are no automated tests. Verify all changes manually by opening `index.html` in a browser and checking:

1. Animation runs smoothly at 60 fps.
2. Settings panel opens/closes and all sliders respond.
3. Settings persist across page reloads (localStorage).
4. Mouse hover effects (glow, growth, ghost image reveal) work correctly.
5. Background images load and crossfade every 30 seconds.
6. "White Circles Only" mode disables image compositing.
7. Window resize adjusts columns and canvas correctly.
8. The 🖼 button opens the background image in a new tab via `image.html`.

## Commit & PR Conventions

- Each PR should address a single concern (one feature, one bug fix, or one refactoring task).
- PR titles should be concise and descriptive of the change.
- PR descriptions should explain _what_ changed and _why_, with a bulleted list of specific changes.
- Keep commits small and focused.
