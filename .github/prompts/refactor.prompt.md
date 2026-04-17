---
description: "Refactor or clean up code in the FallingCircles project"
---

# Context

FallingCircles is a TypeScript canvas animation with source in `src/`. It is compiled to `app.js` via esbuild. The codebase has been iteratively built and should stay clean and readable.

# Requirements

When refactoring:

1. **Do not change behavior.** The animation, settings, and mouse effects must work identically before and after the refactoring. Verify visually in a browser.

2. **Run `npm run build` after every change.** All TypeScript must compile without errors under strict mode.

3. **Remove dead code.** Delete unused functions, variables, and commented-out blocks. Do not leave TODOs or placeholder code.

4. **Eliminate magic numbers.** Extract repeated literal values into named constants in `src/constants.ts`.

5. **Keep comment banners.** Preserve the `// ── Section Name ───` banner style for code organization.

6. **Respect module boundaries.** Each module has a clear responsibility. Do not move logic between modules without a strong reason. Avoid circular imports.

7. **Follow existing style:**
   - `const` by default, `let` only when reassignment is needed.
   - Arrow functions for short callbacks; `function` for top-level declarations.
   - Template literals for string interpolation.
   - `for...of` over `.forEach()`.
   - Descriptive variable names, not abbreviations.
   - `interface` over `type` for object shapes.

8. **Update readme.md** if any user-visible behavior, settings, or file structure changes.
