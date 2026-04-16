---
description: "Fix a bug in the FallingCircles animation or UI"
---

# Context

FallingCircles is a pure vanilla JS canvas animation. All logic is in app.js. There are no automated tests — changes must be verified visually in a browser.

# Requirements

When fixing a bug:

1. **Identify the root cause.** Read the relevant code paths in app.js carefully before making changes. Understand the render loop (`frame()`), the `Drop` class lifecycle, grid geometry, and settings wiring.

2. **Make the minimal fix.** Change only what is necessary to resolve the bug. Do not refactor or add features in the same change.

3. **Check for related issues.** If the bug is in spawning logic, verify that `columnNextSpawn`, `dropsInColumn`, and `canSpawnInColumn` are all consistent. If it is a rendering bug, check composite operations, alpha values, and `beginPath()` calls.

4. **Preserve grid alignment.** Drops must remain snapped to integer multiples of `rowStep()`. The hex-offset pattern (odd columns shifted by `rowStep()/2`) must be maintained.

5. **Security considerations:**
   - Validate external URLs (http/https only).
   - Never use `innerHTML` or `document.write` with external data.
   - Wrap `localStorage` and `fetch` in try/catch.

6. **Test manually.** Open `index.html` and verify:
   - The bug is fixed.
   - No regressions in animation smoothness, settings, mouse effects, or image compositing.
   - Window resize still works correctly.
