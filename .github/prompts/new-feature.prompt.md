---
description: "Add a new visual feature or interactive effect to the FallingCircles animation"
---

# Context

FallingCircles is a pure vanilla JS canvas animation (app.js) with hex-grid circle columns, background image compositing, and mouse interaction effects. There are no external dependencies or build tools.

# Requirements

When implementing a new feature:

1. **Read the existing code first.** Understand the `frame()` render loop, the `Drop` class, the `settings` object, and the grid geometry helpers (`columnWidth`, `rowStep`, `columnX`, `columnYOffset`).

2. **Follow the existing architecture:**
   - Add state variables near the top of the IIFE under a comment banner.
   - Add configurable values to the `settings` object with sensible defaults.
   - Wire up any new settings to the UI (slider in `index.html`, entry in the `sliders` array, and `syncUIFromSettings`).
   - Integrate rendering into the appropriate phase of `frame()`.

3. **Performance matters.** The animation must stay at 60 fps. Avoid allocations in the render loop. Reuse objects and cache computed values in local variables.

4. **No dependencies.** Use only native browser APIs (Canvas 2D, requestAnimationFrame, etc.).

5. **Update documentation.** Add the new setting to the readme's Settings table and update any affected sections.

6. **Test manually.** Open `index.html` in a browser and verify the feature works with different setting combinations, window resize, and mouse interaction.
