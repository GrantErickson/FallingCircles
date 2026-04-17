---
description: "Add a new visual feature or interactive effect to the FallingCircles animation"
---

# Context

FallingCircles is a TypeScript canvas animation (`src/`) with hex-grid circle columns, background image compositing, and mouse interaction effects. Source is compiled to `app.js` by esbuild. There are no runtime dependencies.

# Requirements

When implementing a new feature:

1. **Read the existing code first.** Understand the `frame()` render loop in `src/main.ts`, the `Drop` class in `src/drop.ts`, the `settings` object in `src/settings.ts`, and the grid geometry helpers in `src/grid.ts`.

2. **Follow the existing architecture:**
   - Add state variables near the top of `src/main.ts` under a comment banner, or add a new module for significant new logic.
   - Add configurable values to the `Settings` interface (`src/types.ts`) and `settings` object (`src/settings.ts`) with sensible defaults.
   - Wire up any new settings to the UI (slider in `index.html`, entry in the `sliders` array in `src/settings.ts`, and `syncUIFromSettings` in `src/main.ts`).
   - Integrate rendering into the appropriate phase of `frame()` in `src/main.ts`.

3. **Run `npm run build` after every change.** All TypeScript must compile without errors under strict mode.

4. **Performance matters.** The animation must stay at 60 fps. Avoid allocations in the render loop. Reuse objects and cache computed values in local variables.

5. **No runtime dependencies.** Use only native browser APIs (Canvas 2D, requestAnimationFrame, etc.).

6. **Update documentation.** Add the new setting to the readme's Settings table and update any affected sections.

7. **Test manually.** Serve locally with `npx serve .` and verify the feature works with different setting combinations, window resize, and mouse interaction.
