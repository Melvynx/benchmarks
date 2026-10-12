# Grok 4.7

A design editor: infinite canvas, real scene graph, command history, and a spatial index. The canvas is Canvas 2D. React only draws the panels.

```bash
pnpm install
pnpm dev
```

The dev server is fixed to `http://127.0.0.1:9336`.

```bash
pnpm test
pnpm exec tsc --noEmit
```

## Stack

- Vite, React 19, TypeScript
- Canvas 2D for the document. DOM panels would not hold 1,000 transformed objects with effects at 60fps
- A custom `Editor` kernel. Zustand was skipped so every mutation stays on the command stack the canvas and the panels share
- Yjs plus `BroadcastChannel` for same-machine multiplayer. The in-memory document is still the editor model; Yjs is the sync log, not the renderer
- `polygon-clipping` for boolean ops. The rest of the geometry is local so it can be unit tested

## Architecture

`Editor` owns the document, camera, selection, and history. Tools call `change()` or a gesture (`beginGesture` / `gesture` / `commitGesture`). A gesture restores the pre-drag snapshot on each move, so a drag is one undo step, not a snapshot per pixel.

Undo stores per-node before/after patches (and page metadata when the page list changes). It does not clone the whole document on every nudge.

Rendering is two layers. The scene canvas invalidates when the document or camera changes. The overlay canvas draws selection, rulers, guides, and snap lines. That is the practical form of dirty rendering here: blur, transparency, and shadows make tile dirty-rects fight the compositor. Viewport culling uses each subtree's world AABB. Hit testing and snap queries go through a quadtree.

Layout is a pure pass. Auto-layout writes a geometry cache; it does not mutate stored positions until a command does. Text measurement uses canvas `measureText` when the DOM exists and a width estimate in tests.

## What works

- Pan and zoom from 10% to 6400%, adaptive grid, rulers, drag-out guides
- Frame, rectangle, ellipse, line, polygon, star, text, image (drop or paste), pen paths
- Fills (solid, linear, radial), strokes (width, align, dash), drop shadow, inner shadow, layer blur, background blur, per-corner radius, opacity
- In-place text editing. Inter, Roboto, Poppins, Playfair Display, JetBrains Mono, and Space Grotesk are loaded
- Click, shift-click, marquee (contain vs intersect by drag direction), 8 handles, rotation handle, shift aspect / 15° rotate, alt-from-center, arrow nudge
- Smart guides with pink lines and distance badges
- Layers: reorder, reparent, hide, lock, rename, search. Pages. Color and text styles
- Auto-layout (row/column, gap, padding, hug, fill) and child constraints when a freeform frame is resized
- Group, ungroup, z-order, align, distribute
- Components and instances with property overrides and detach
- Boolean union, subtract, intersect, exclude
- Prototype click-through on frames (Play)
- Comments, session version history (20), JSON import/export, PNG and SVG export
- Undo/redo, copy/paste/cut/duplicate, the shortcut set in the Shortcuts modal (`⌘/`)
- Local multiplayer: open the same document in two tabs
- `Object → Insert 1,200 rectangles` for the load case

## Cuts

- Vector networks (one contour per pen path; booleans can emit several contours)
- Text on a path, lasso select, variants as a component property matrix
- Blend modes, video fills, PDF export
- Sandboxed plugins. The Object menu is the plugin surface (`insertStress` is the sample)
- Multi-select resize does not flip the selection; single-object resize does
- Version history is session memory, not a second persisted timeline. Persisting every snapshot next to images blows past `localStorage`
- Concurrent edits to the same node are last-write-wins after Yjs orders the transactions. This is not a CRDT field merge for text
- Outside stroke is a double-width stroke drawn after the fill, so it sits on the edge rather than strictly outside when the fill is transparent
- Background blur samples what has already been painted, then blurs it inside the shape

## Performance

Plain rectangles stay on the direct draw path: no layer allocation, quadtree hit tests, subtree culling. A frame with layer blur or opacity under 1 is flattened to a scratch canvas. Shadows use the canvas shadow pass. 1,200 solid rectangles are comfortable; the same count with blur on every node is not, and should not be.

## Known bugs

- Auto-layout children jump into the flow when a frame's layout is turned on; their stored x/y are ignored until layout is turned off
- Pen handles are created with Alt, but point editing after the path exists is only "enter the path", not a full bezier widget
- Group bounds use each child's unrotated box transformed in parent space. Deeply nested rotated groups can leave a pixel of slack
- The first two tabs that open before the first autosave can each seed Yjs and then merge. After one save, reopen is stable
- Eyedropper needs the EyeDropper API (Chromium)
