# Falling Circles

A mesmerizing, interactive canvas animation of circles cascading down tightly-packed columns. Built with vanilla HTML, CSS, and JavaScript — no frameworks or build steps required.

## 🚀 <a href="https://granterickson.github.io/FallingCircles/" target="_blank" rel="noopener noreferrer">Try it!</a>

---

## Inspiration

This project was inspired by a large piece of art hanging in the entry of [Perlo Construction](https://www.perlo.com/) near Portland, Oregon.

![Inspiration art at Perlo Construction](https://github.com/user-attachments/assets/f4474b0a-d741-41f7-81a3-ecf2b070a8bb)

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
| **Image-colored trails** | Trail circles are colored by a background image fetched from a curated image API. The image rotates every 30 seconds with a smooth crossfade transition. |
| **Dark theme** | Dark background (#0a0a0a) with white/light circles (or image-colored when a background image is loaded). |

### Adjustable Settings (⚙ panel)
Click the **⚙** button in the top-right corner to open the settings panel. All changes take effect immediately.

| Setting | What it controls |
|---|---|
| **Circle Radius** | Size of the falling circles (3 – 20 px). |
| **Fall Speed** | How fast circles descend (0.5 – 6). |
| **Speed Variation** | Random per-drop speed offset for an organic feel (0 = uniform, 1 = ±100%). |
| **Spawn Rate** | Probability a new circle appears per column per frame (controls density). |
| **Trail Length** | Number of trail dots left behind each circle. |
| **Max Circles per Column** | Cap on simultaneous drops in one column. |
| **Gap Between Circles** | Pixel gap between columns (keeps adjacent circles from touching). |
| **Mouse Effect Radius** | How far the mouse influence extends. |
| **Mouse Reveal Brightness** | Opacity of the background image revealed near the cursor. |

#### Image Trail

| Setting | What it controls |
|---|---|
| **White Circles Only** | Disables the background image coloring, rendering plain white circles instead. |
| **Trail Dim** | Trail circles fade in opacity in addition to shrinking. |
| **Trail Brightness** | Adjusts the brightness of image-colored trail circles (0 = dark, 1 = normal, 2 = bright). |

### Mouse Interaction
Move the mouse over the canvas to interact with the circles:

| Effect | Behaviour |
|---|---|
| **Glow** | Circles near the cursor glow brighter with a soft aura. |
| **Growth** | Circles smoothly grow larger near the cursor and shrink back when it moves away. |

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
