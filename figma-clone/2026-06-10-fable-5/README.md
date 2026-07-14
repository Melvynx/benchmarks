# Claude Fable 5 — a mini-Figma built from scratch

A design-tool editor with a real scene graph, command-pattern history, auto-layout,
smart guides, and a custom Canvas-2D rendering engine. No tldraw, no excalidraw, no
Konva/Pixi — every hard part (geometry, hit testing, rendering, input, layout,
persistence) is implemented in this repo.

```bash
npm install
npm run dev        # → http://localhost:5180
npm test           # 25 unit tests (geometry, resize math, commands, history)
npm run build      # tsc --noEmit && vite build
npm run lint
```

First launch opens a seeded "Welcome" file that exercises gradients, backdrop blur,
auto-layout (hug/fill), text styles, dashes, and effects. Press `⌘/` for the command
palette — including **"Insert 1,120-node stress test"** for the performance claim.

---

## Stack and why

| Choice | Why |
|---|---|
| **Vite + React 19 + TypeScript (strict, `noUncheckedIndexedAccess`)** | React renders the *chrome* (panels, inputs, menus). It never renders the canvas. |
| **Canvas 2D, hand-written renderer** | Full control over paint order, clipping, effects, and device-space shadow math. WebGL would buy fill-rate we don't need at this node count and cost a text/path stack. |
| **zustand (vanilla store + React hook)** | One store both worlds can use: the renderer subscribes directly (no React in the hot path); panels subscribe via selectors. 3 runtime deps total: react, react-dom, zustand. |
| **No id/color/geometry libraries** | They're small, and owning them keeps the math testable and consistent. |

## Architecture

```
geometry/    Vec2, Mat2d (affine TR matrices), rects, shape Path2D builders — pure, unit-tested
scene/       Node types (discriminated unions), factories, traversal, DraftDoc editing
             helpers, sceneIndex (per-version world matrices/bounds/paint order + spatial grid)
spatial/     Uniform hash grid (512px cells) → point/rect queries for hit tests & snapping
commands/    Serializable commands (update/insert/remove/roots/composite), pure apply/invert,
             History with merge windows (typing/scrubbing coalesce into one undo step)
layout/      Auto-layout resolver: bottom-up hug sizing, top-down placement + fill,
             group shrink-wrapping; iterates to a fixed point (≤3 rounds)
store/       zustand store + the single mutation pipeline (docEdit), high-level actions,
             viewport, clipboard, images, documents, autosave
render/      Renderer (2 stacked canvases, dirty flags, rAF), scene walker with culling
             and layer compositing, paints, effects, grid, rulers, overlay, cursors
interaction/ Selection box & handle hit testing, exact rotated-resize math, snapping
input/       PointerController (shared pan/zoom gestures) + tools as small state machines
persistence/ Versioned serialization + sanitizer, localStorage multi-doc store,
             PNG exporter (re-uses the renderer), SVG serializer
text/        Google Fonts loading, canvas-measured line breaking with caching
ui/          React panels, color picker, command palette, context menu, text-edit overlay
```

### The mutation pipeline (the load-bearing idea)

Every document change — typing in an input, dragging 40 nodes, drawing a shape,
alt-duplicating mid-drag, undo — flows through one path:

```
draft = shallow copy → mutate via helpers (nodes are immutable, always replaced)
→ runLayout(draft)   (derived: auto-layout placement, hug sizing, group shrink-wrap)
→ diff(before, after) → command → history (already applied)
```

Because node objects are replaced rather than mutated, the differ prunes by reference
and only field-diffs nodes that actually changed. Gestures call `beginGesture` /
`updateGesture` (transient frames, no history) / `endGesture` (one diff → **one undo
step**), which means alt-drag-duplicate, reparent-on-drop and the move itself collapse
into a single command for free. Layout results are included in commands, and the
layout pass is idempotent, so undo/redo can never desynchronize derived state.

History stores 250 entries of *commands*, not snapshots; merge keys coalesce rapid
same-field edits (arrow-key nudges, input typing) within a 900 ms window.

### Rendering

- Two stacked canvases: **scene** (repaints on doc/viewport changes) and **overlay**
  (selection chrome, guides, rulers, labels — repaints on hover/selection too). Hovering
  layer rows never re-renders 1k nodes.
- Culling via per-version **subtree render bounds** (own box + strokes + effect extents,
  unioned with unclipped children) from the scene index.
- **Layer compositing**: containers with opacity < 1, any blend mode, or layer blur render
  into a pooled scratch canvas and composite back — correct group opacity, not the
  multiply-down approximation. The scratch is clamped to the viewport so a zoomed-in
  giant frame stays cheap.
- **Effects** are done in device space (canvas shadows ignore the CTM): drop shadows use
  the off-canvas-shift trick; inner shadows fill the inverted silhouette clipped to the
  shape; **background blur** snapshots the already-painted backdrop, blurs it with
  `ctx.filter`, and clips it to the node — translucent fills tint it like Figma.
- Stroke alignment: center strokes directly; inside via clip + 2× width; outside via an
  even-odd inverse clip.
- One set of `Path2D` builders is shared by the renderer, hit testing, and effects, so
  the three can never disagree about an outline.

### Geometry / transform model

Nodes store `x, y, width, height, rotation` (degrees, pivot = box center) in parent
space; matrices are translation+rotation only, so decomposition is exact. The rotated
resize works in the node's gesture-start local frame: un-project the pointer, move the
dragged edges, then recover placement as `M_old · T(originShift)` — the anchor
(opposite corner/edge, or center with `⌥`) stays world-stationary for any node nested
under any rotated ancestor. This is unit-tested, including flip-across-anchor and
shift-aspect cases.

### Hit testing & snapping

Spatial hash grid → candidates sorted by paint order → precise per-shape tests
(`isPointInPath`/`isPointInStroke` in local space, with zoom-compensated slop for thin
strokes) → clip-ancestor rejection. Click selection bubbles to the top-level node like
Figma; double-click drills one level; `⌘`-click deep-selects; `Enter` enters a
container; marquee scopes to the frame you started in.

Smart guides collect edge/center candidates from visible nodes (capped at 240, parents
always included), snap within 6 screen px, draw pink alignment lines plus **distance
badges**, and pixel-round unsnapped axes. `⌥`-hover shows measured gaps between the
selection and the hovered node.

## Feature checklist

**Canvas** — infinite pan/zoom 10%–6400% (wheel, pinch, space/middle-drag, `⌘0/⌘1/⌘2`),
adaptive 1-2-5 grid + pixel grid above 800%, rulers with selection extents (`⇧R`),
top-level frame name labels (clickable).

**Objects** — Frame (clipping toggle, auto-layout: direction/gap/4-side padding/main &
cross alignment, hug/fill/fixed child sizing, drag-to-reorder inside auto-layout),
Group (shrink-wraps), Rectangle (per-corner radius), Ellipse, Line (dash/gap), Polygon
(3–60 sides), Star (points + inner ratio), Text, Image (paste/drop/place → rectangle
with image fill, like Figma). All nodes: position/size/rotation/opacity/blend mode,
multiple fills (solid, linear & radial gradients with a stop editor, image), strokes
(weight, inside/center/outside, dash), effects (drop shadow, inner shadow, layer blur,
background blur — all with live controls).

**Text** — in-place editing through a matrix-transformed textarea with identical
metrics; Inter/Roboto/Poppins/Playfair Display/JetBrains Mono/Space Grotesk at their
real Google-Fonts weights (100–900 where available); size, line-height (auto/px),
letter-spacing, horizontal + vertical alignment, auto-width/auto-height/fixed modes;
late font loads re-measure and re-layout the document.

**Selection & transform** — click/shift-click/marquee, 8 resize handles + corner
rotation rings, rotation-aware double-arrow and rotate cursors, `⇧` aspect/15°-snap,
`⌥` from-center / duplicate-drag, live reparenting into frames with drop highlight,
arrow nudge 1/10 px, W×H badge, rotation HUD.

**Panels** — layers tree (drag reorder/reparent with between/inside indicators, hover
hide/lock, double-click rename, search, auto-expand to selection), properties panel
with **Mixed** states across multi-selection everywhere, scrubbable number inputs that
evaluate arithmetic (`120/3+8`), align/distribute row, color picker (SV square, hue,
alpha, hex, opacity, recent colors, EyeDropper API where available), export section.

**Shortcuts** — full set: `⌘Z/⇧⌘Z/⌘Y`, `⌘C/V/X/D`, `⌘A`, `⌘G/⇧⌘G/⌥⌘G`, `⌘]/⌘[/⇧⌘]/⇧⌘[`,
`Delete`, `⌘0/1/2`, `⇧1/⇧2`, `+/-`, `⌘/` palette, `⌘\` hide UI, `⇧⌘H/L` hide/lock,
`⇧⌘K` place image, `⇧⌘E` export, `Esc` cancel-gesture→exit-edit→deselect, `Enter`,
all tool letters (V H R O L T F P S), space-pan, alt-measure.

**Persistence** — debounced (500 ms) auto-save to localStorage plus flush on tab hide;
**multi-document** support (file menu: new/open/duplicate/rename/delete) with per-file
viewport restore; JSON export/import with a defensive sanitizer (orphan repair, type
filtering, numeric coercion); PNG export at 1–4× through the real renderer
(transparent background); SVG export with gradients, per-corner radii, transforms,
clips, dashes, text runs, drop shadows and layer blur as filters.

**Extras** — command palette (`⌘/`, ~45 fuzzy-searched commands with shortcuts),
context menu on canvas, toasts, crash screen with one-click recovery JSON download,
1,120-node stress-test generator.

## Performance notes

Measured headless (Chromium, 1600×1000, DPR 1) with the built-in stress test (1,120
nodes) while *continuously panning and zooming simultaneously*: **avg 16.6 ms/frame,
p95 17.6 ms, worst 17.7 ms — a locked 60 fps** with zero dropped frames over 150
frames.

What buys it: dirty-flag rAF (idle costs nothing), overlay/scene split, subtree-bounds
culling, layout/diff passes that are O(changed) thanks to immutable node identity,
Path2D + text-layout caches keyed on node identity, and grid-accelerated queries for
hit testing and snapping. The scene index is rebuilt per document version in one O(n)
pass (~0.2 ms at 1k nodes); the obvious next step at 50k+ nodes is incremental dirty
propagation plus tile-based scene caching, neither needed at this scale.

## Deliberate cuts (and why)

- **Pen tool / vector networks / boolean ops** — each is a project on its own (bezier
  hit testing & editing UX; polygon clipping). Cut entirely rather than stubbed.
- **Components/instances, variants, styles/tokens, prototyping, comments, multiplayer**
  — out of budget. The command layer was designed for it: commands are serializable
  and invertible, which is exactly the shape a CRDT/OT bridge or a plugin API
  (`applyCommand` as the single write surface) would consume.
- **Constraints (pin/scale on frame resize)** — auto-layout covers the responsive
  story; mixing both correctly is large.
- **Lasso select, text-on-path** — listed optional; skipped.

## Known limitations (honest list)

- **Leaf opacity** multiplies into each paint instead of compositing fill+stroke as one
  layer; visible only when a translucent node's stroke overlaps its fill. Containers
  composite correctly.
- **Multi-selection resize of rotated nodes** scales each node's width/height by the
  box factors (no skew is introduced) — same approximation most tools ship; single-node
  rotated resize is exact.
- **Auto-layout** ignores child rotation when measuring (uses the unrotated box), and a
  `fill` child inside a `hug` parent resolves as fixed (Figma flags this combination as
  invalid too).
- **Background blur inside a composited layer** (e.g. backdrop blur in a half-opacity
  group) only sees content within that layer, because the backdrop snapshot is taken
  from the layer's scratch canvas.
- **SVG export** approximates inside/outside strokes as centered, and skips inner
  shadows and backdrop blur (no clean SVG equivalent without foreignObject hacks).
- **Text editing overlay** relies on the browser's greedy wrap matching the canvas
  layouter; rare divergence is possible at exotic letter-spacing values. Vertical
  centering of fixed-height text isn't reflected while editing (it is after commit).
- **Letter spacing on canvas** requires `ctx.letterSpacing` (Chrome 99+, Safari 17.4+,
  Firefox 126+); on older engines it degrades to 0 rather than mis-measuring. Blur
  effects need `ctx.filter` and degrade gracefully without it.
- Large embedded images can hit the localStorage quota; auto-save reports the failure
  via toast and JSON export remains available.

## What I'd do next

1. Incremental scene-index updates + tiled scene caching (10⁵-node ceilings).
2. Components & instances — the draft/diff pipeline already treats subtrees as values,
   so instancing is a controlled re-materialization pass.
3. Yjs adapter: map `update/insert/remove/roots` commands onto a shared map + order
   CRDT; selection/cursor presence over awareness.
4. Pen tool with on-curve/off-curve editing reusing the existing overlay + gesture
   machinery.

## Testing

`vitest` covers the math the editor lives on: matrix compose/invert/decompose
round-trips, the rotated-resize anchor invariant (including flips, center-resize and
aspect lock), document diffing/inversion round-trips, history merging, color
conversions, and the expression parser. Interaction layers were verified end-to-end in
a real browser (selection bubbling, drill-down, smart-guide drags, text editing,
grouping, undo of a 1,121-node insert as one step, persistence across reload, the fps
measurement above).
