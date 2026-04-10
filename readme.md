# Falling Circles

A mesmerizing, interactive canvas animation of circles cascading down tightly-packed columns. Built with vanilla HTML, CSS, and JavaScript — no frameworks or build steps required.

## 🚀 [Try it live on GitHub Pages!](https://granterickson.github.io/FallingCircles/)

---

## Features

### Core Animation
| Feature | Description |
|---|---|
| **Column grid** | The viewport is divided into many narrow columns, each exactly one circle-diameter wide plus a configurable gap. |
| **Staggered offset** | Even/odd columns are offset vertically by half a circle radius so that adjacent circles interlock without overlapping. |
| **Falling drops** | Circles spawn at the top of random columns and fall at a slightly randomised speed for an organic, harmonious feel. |
| **Fading trail** | Each falling circle leaves a trail of smaller circles that progressively shrink and fade to transparent. |
| **Multiple drops per column** | More than one circle can be active in the same column simultaneously, creating a busy-but-balanced look. |
| **Dark theme** | Dark background (#0a0a0a) with white/light circles. |

### Adjustable Settings (⚙ panel)
Click the **⚙** button in the top-right corner to open the settings panel. All changes take effect immediately.

| Setting | What it controls |
|---|---|
| **Circle Radius** | Size of the falling circles (3 – 20 px). |
| **Fall Speed** | How fast circles descend (0.5 – 6). |
| **Spawn Rate** | Probability a new circle appears per column per frame (controls density). |
| **Trail Length** | Number of trail dots left behind each circle. |
| **Max Circles per Column** | Cap on simultaneous drops in one column. |
| **Gap Between Circles** | Pixel gap between columns (keeps adjacent circles from touching). |
| **Mouse Effect** | Choose from six interaction modes (see below). |
| **Mouse Effect Radius** | How far the mouse influence extends. |

### Mouse Interaction Effects
Move the mouse over the canvas to trigger the selected effect:

| Effect | Behaviour |
|---|---|
| **Glow** | Circles near the cursor glow brighter with a soft aura. |
| **Repel** | Circles push away from the cursor. |
| **Attract** | Circles pull toward the cursor. |
| **Color Wave** | Circles near the cursor shift from white to a cyan-blue hue. |
| **Freeze** | Circles near the cursor slow down and nearly stop. |
| **Burst** | Extra circles spawn in columns near the cursor. |

---

## File Structure

```
FallingCircles/
├── index.html   – Page structure & settings UI
├── style.css    – Styling for overlay UI & canvas
├── app.js       – All animation logic (canvas, physics, effects)
└── readme.md    – This file
```

---

## Technical Notes

* **Pure vanilla JS** — no dependencies, no build step, no transpilation.
* Uses the **Canvas 2D API** for rendering; runs at 60 fps on modern hardware.
* Responsive — automatically adjusts the column count and canvas size on window resize.
* HiDPI / Retina aware (`devicePixelRatio` scaling).

---

## Running Locally

Because the project is pure static HTML, no server or build step is needed:

1. Clone the repository:
   ```bash
   git clone https://github.com/GrantErickson/FallingCircles.git
   ```
2. Open **`index.html`** in any modern browser (Chrome, Firefox, Edge, Safari):
   ```bash
   cd FallingCircles
   open index.html        # macOS
   xdg-open index.html    # Linux
   start index.html       # Windows
   ```

That's it — no dependencies to install.
