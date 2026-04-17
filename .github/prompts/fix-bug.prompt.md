---
description: "Fix a bug in the FallingCircles animation or UI"
---

# Context

FallingCircles is a TypeScript canvas animation. Source files live in `src/`. There are no automated tests — changes must be verified visually in a browser after serving locally with `npx serve .`.

# Requirements

When fixing a bug:

1. **Identify the root cause.** Read the relevant source files carefully before making changes. Key files: `src/main.ts` (render loop, UI wiring), `src/drop.ts` (Drop class lifecycle), `src/grid.ts` (grid geometry), `src/background.ts` (image compositing), `src/settings.ts` (settings persistence).

2. **Make the minimal fix.** Change only what is necessary to resolve the bug. Do not refactor or add features in the same change.

3. **Run `npm run build` after every change.** All TypeScript must compile without errors under strict mode.

4. **Check for related issues.** If the bug is in spawning logic, verify that `columnNextSpawn`, `dropsInColumn`, and `canSpawnInColumn` are all consistent. If it is a rendering bug, check composite operations, alpha values, and `beginPath()` calls.

5. **Preserve grid alignment.** Drops must remain snapped to integer multiples of `rowStep()`. The hex-offset pattern (odd columns shifted by `rowStep()/2`) must be maintained.

6. **Security considerations:**
   - Validate external URLs (http/https only).
   - Never use `innerHTML` or `document.write` with external data.
   - Wrap `localStorage` and `fetch` in try/catch.

7. **Test manually.** Serve with `npx serve .` and verify:
   - The bug is fixed.
   - No regressions in animation smoothness, settings, mouse effects, or image compositing.
   - Window resize still works correctly.
