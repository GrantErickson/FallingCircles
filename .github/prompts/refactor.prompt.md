---
description: "Refactor or clean up code in the FallingCircles project"
---

# Context

FallingCircles is a single-file vanilla JS canvas animation (app.js). The codebase has been iteratively built through 35+ PRs and should stay clean and readable.

# Requirements

When refactoring:

1. **Do not change behavior.** The animation, settings, and mouse effects must work identically before and after the refactoring. Verify visually in a browser.

2. **Remove dead code.** Delete unused functions, variables, and commented-out blocks. Do not leave TODOs or placeholder code.

3. **Eliminate magic numbers.** Extract repeated literal values into named constants at the top of the IIFE (follow the `SPEED_SCALE`, `MOUSE_OFFSCREEN`, `TRANSITION_DURATION` pattern).

4. **Keep comment banners.** Preserve the `// ── Section Name ───` banner style for code organization.

5. **Preserve the single-file architecture.** Do not split app.js into modules unless the file exceeds ~1000 lines and there is a clear separation boundary.

6. **Follow existing style:**
   - `const` by default, `let` only when reassignment is needed.
   - Arrow functions for short callbacks; `function` for top-level declarations.
   - Template literals for string interpolation.
   - `for...of` over `.forEach()`.
   - Descriptive variable names, not abbreviations.

7. **Update readme.md** if any user-visible behavior, settings, or file structure changes.
