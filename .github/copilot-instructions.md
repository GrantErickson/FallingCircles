# Copilot Instructions for FallingCircles

## Project Overview

FallingCircles is a browser-based canvas animation of circles cascading down hex-grid columns, colored by a rotating background image. It is written in **TypeScript**, compiled to a single `app.js` bundle via **esbuild**, with no runtime dependencies.

### File Structure

| File | Purpose |
|---|---|
| `src/types.ts` | Shared TypeScript interfaces: `Settings`, `MouseState`, `TrailCircle`, `GhostCanvas`, `MouseInfluence` |
| `src/constants.ts` | Shared constants: `SPEED_SCALE`, `MOUSE_OFFSCREEN`, `TRANSITION_DURATION`, growth animation constants |
| `src/settings.ts` | `settings` object with defaults, `loadSettings`/`saveSettings` (localStorage), `sliders` list |
| `src/grid.ts` | Viewport helpers (`W`, `H`) and grid geometry: `columnWidth`, `rowStep`, `columnCount`, `columnX`, `columnYOffset`, `spawnInterval` |
| `src/drop.ts` | `Drop` class: constructor, `update`, `drawHead`, `mouseInfluence`, `rowFraction` |
| `src/background.ts` | Background image state (`bgState`), `loadBackgroundImage`, `fitImageToCanvas`, `tickTransition`, `drawBackground`, `drawGhost` |
| `src/main.ts` | Entry point: canvas setup, UI wiring, mouse tracking, animation state, `frame()` render loop |
| `index.html` | Page structure, settings panel markup, and slider/checkbox controls |
| `src/style.scss` | SCSS styles with variables, nesting, and mixins. Compiled to `style.css` by Dart Sass. |
| `image.html` | Standalone image viewer page opened via the 🖼 button |
| `package.json` | Dev dependencies (`typescript`, `esbuild`) and build scripts |
| `tsconfig.json` | TypeScript compiler configuration |
| `readme.md` | Project documentation |

## Architecture

- **TypeScript modules** — Source is split into focused modules in `src/`. Each module exports only what other modules need.
- **esbuild bundler** — `npm run build` runs `tsc --noEmit` (type checking), `sass src/style.scss style.css` (SCSS compilation), then `esbuild src/main.ts --bundle --outfile=app.js` to produce a single browser-ready `app.js`.
- **Canvas 2D API** — Rendering uses `requestAnimationFrame` for the main loop. Offscreen canvases are used for compositing (ghost image reveal near cursor).
- **Hex-grid layout** — Columns are one circle-diameter wide plus a configurable gap. Odd columns are offset vertically by half a row step for an interlocking pattern.
- **Deterministic spawning** — Drop spawn timing is derived from `spawnInterval()` (viewport height / maxPerColumn), not random probability. Per-column `columnNextSpawn` thresholds track `globalFallDistance` with ±20% random jitter.
- **Grid-synced rendering** — Drops snap their spawn position to the nearest grid boundary of `globalFallDistance` so trails stay phase-locked to integer multiples of `rowStep`.
- **Settings persistence** — All user-configurable values live in the `settings` object (`src/settings.ts`), persisted to `localStorage`, and synced to the HTML range sliders and checkboxes in `src/main.ts`.
- **Background image compositing** — Trail circles are drawn white, then a `source-atop` composite operation overlays a fetched curated image. Images rotate every 30 seconds with a 2-second crossfade managed by `bgState` in `src/background.ts`.

## Build & Development

```bash
npm install          # Install dev dependencies (typescript, esbuild, sass)
npm run build        # Type-check, compile SCSS, then bundle JS → app.js + style.css
npm run typecheck    # Type-check only (no output)
npm run dev          # Watch mode: rebuild app.js and style.css on file changes
```

Serve the project root with a local HTTP server for testing (ES modules require HTTP):
```bash
npx serve .
```

## Coding Standards

### General Principles

- **Zero runtime dependencies.** Do not introduce npm packages, CDN scripts, or any external libraries. Every feature must be implemented with native browser APIs. Dev dependencies (build tools) are fine.
- **TypeScript strict mode.** All source files must pass `tsc --noEmit` with `strict: true`. Use explicit types for function parameters and return values. Avoid `any`.
- **Modular structure.** Keep related logic together. Add new modules only when there is a clear architectural boundary. Prefer adding to an existing module over creating a new one unless the new concern is genuinely separate.
- **Keep it clean.** Remove dead code, unused variables, and commented-out blocks. Do not leave TODO comments or placeholder code.

### TypeScript Style

- Use `const` by default; use `let` only when reassignment is necessary. Never use `var`.
- Use arrow functions for short callbacks and closures. Use `function` declarations for top-level named functions.
- Use template literals for string interpolation (e.g., `` `rgba(255,255,255,${alpha})` ``).
- Prefer `for...of` loops over `.forEach()` for iteration over arrays.
- Use early returns to reduce nesting.
- Use descriptive variable names: `columnNextSpawn`, `globalFallDistance`, `transitionAlpha` — not `cns`, `gfd`, `ta`.
- Group related constants and helpers under comment banners (e.g., `// ── Grid geometry ───`).
- Avoid magic numbers. Extract meaningful values as named constants in `src/constants.ts`.
- Prefer `interface` over `type` for object shapes. Use `type` for unions and aliases.

### Canvas & Rendering Best Practices

- Always call `ctx.beginPath()` before drawing a new shape to avoid path accumulation bugs.
- Use `Math.hypot()` for distance calculations instead of manual `sqrt(dx*dx + dy*dy)`.
- Cache expensive computations (e.g., `columnWidth()`, `rowStep()`, `columnCount()`) in local variables within hot loops when they are called repeatedly per frame.
- Use offscreen canvases for multi-pass compositing rather than reading back pixels with `getImageData()` (which fails on cross-origin images).
- Reset composite operations to `"source-over"` after any non-default composite pass.
- Be HiDPI aware: scale the canvas by `devicePixelRatio` and use CSS dimensions for layout.

### Performance

- The animation must maintain 60 fps on modern hardware. Avoid allocations in the main loop (`frame()`) — reuse objects, arrays, and Maps.
- Minimize DOM reads inside `requestAnimationFrame`. Read `innerWidth`/`innerHeight` via the `W()`/`H()` helpers from `src/grid.ts`.
- Use `Map` and `Set` for O(1) lookups in the render loop (e.g., `trailMap`, `residualGrowth`, `activeKeys`).
- Prefer integer arithmetic for grid calculations where possible.

### CSS

- Use `rgba()` for semi-transparent colors.
- Use `backdrop-filter: blur()` for glassmorphism UI effects.
- Use CSS transitions for smooth UI state changes (panel show/hide, button hover).
- Keep all styles in `src/style.scss` — do not use inline styles in HTML except for dynamically computed values in JavaScript.

### HTML

- Use semantic elements where appropriate.
- Keep `index.html` focused on structure and settings controls. All behavior lives in `src/`.
- Settings controls follow the pattern: `<label>` wrapping a `<input type="range">` and a `<span>` for the current value display.

### Security

- Validate all external URLs before use (see `image.html` for the URL scheme validation pattern: only allow `http:` and `https:` protocols).
- Never use `innerHTML` or `document.write` with user-supplied or external data. Use `textContent` or `createElement`.
- Use `noopener,noreferrer` when opening external URLs with `window.open`.
- Wrap `localStorage` and `fetch` calls in try/catch to handle unavailable storage or network errors gracefully.

## How to Add a New Setting

1. Add the property and its default value to the `Settings` interface in `src/types.ts`.
2. Add the default value to the `settings` object in `src/settings.ts`.
3. Add the setting key to the `sliders` array in `src/settings.ts` (for range inputs) or handle it separately (for checkboxes) in `src/main.ts`.
4. Add the corresponding `<label>`, `<input>`, and `<span>` in `index.html` inside `#settingsPanel`.
5. Wire up persistence by ensuring `saveSettings()` is called on change (already covered for sliders; add explicitly for checkboxes in `src/main.ts`).
6. Update `syncUIFromSettings()` in `src/main.ts` if the control is a checkbox.
7. Update `readme.md` to document the new setting in the appropriate table.

## How to Add a New Visual Effect

1. Add any needed state variables in `src/main.ts` near the top, grouped under a comment banner.
2. If the effect has significant logic, consider a new module (e.g., `src/effects.ts`).
3. Integrate into the `frame()` function in `src/main.ts` at the appropriate rendering phase:
   - **Before trail drawing** — for background effects.
   - **Trail drawing loop** — for per-circle modifications.
   - **After trail drawing, before heads** — for overlay effects.
   - **After heads** — for post-processing effects.
4. If the effect uses mouse position, use the existing `mouse` object and pass it as a parameter following the `mouseInfluence()` pattern.
5. If the effect requires compositing, use an offscreen canvas (follow the `getGhostCanvas()` pattern in `src/main.ts`).

## Common Patterns

### Adding to the Render Loop

```typescript
// In src/main.ts, frame(), after existing trail drawing:
// ── My New Effect ──────────────────────────────────────
// ... effect code here ...
```

### Settings Slider Wiring

```typescript
// In src/types.ts, add to Settings interface:
myNewSetting: number;

// In src/settings.ts, add default value and slider key:
export const settings: Settings = { ..., myNewSetting: 0.5 };
export const sliders = [...existing, "myNewSetting"] as const;

// In index.html, add inside #settingsPanel:
// <label>My New Setting
//   <input type="range" id="myNewSetting" min="0" max="1" value="0.5" step="0.05">
//   <span id="myNewSettingVal">0.5</span>
// </label>
```

## Testing

There are no automated tests. Verify all changes manually:

1. Run `npm run build` — must complete with no errors.
2. Serve locally (`npx serve .`) and open in a browser.
3. Animation runs smoothly at 60 fps.
4. Settings panel opens/closes and all sliders respond.
5. Settings persist across page reloads (localStorage).
6. Mouse hover effects (glow, growth, ghost image reveal) work correctly.
7. Background images load and crossfade every 30 seconds.
8. "White Circles Only" mode disables image compositing.
9. Window resize adjusts columns and canvas correctly.
10. The 🖼 button opens the background image in a new tab via `image.html`.

## Commit & PR Conventions

- Each PR should address a single concern (one feature, one bug fix, or one refactoring task).
- PR titles should be concise and descriptive of the change.
- PR descriptions should explain _what_ changed and _why_, with a bulleted list of specific changes.
- Keep commits small and focused.
