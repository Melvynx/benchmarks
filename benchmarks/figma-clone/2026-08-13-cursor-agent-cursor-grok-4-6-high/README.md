# Cursor Grok 4.6

A from-scratch design editor: React chrome, Canvas 2D scene, command-pattern history, and a typed scene graph. Not a wrapper around tldraw or Excalidraw.

```bash
pnpm install
pnpm dev
```

Dev server is pinned to `http://127.0.0.1:9303` (`strictPort`). Other scripts: `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Stack choice

- **Vite + React 19 + TypeScript (strict)** for the shell. Panels, color picker, and menus are DOM problems; React is the right tool.
- **Canvas 2D** for the document. Reconciling a React node per layer dies at a few hundred objects. One scene canvas plus one overlay canvas keeps 1000+ layers at 60fps with viewport culling.
- **No Zustand / Yjs / Konva.** A small external store sits on the command boundary. Fewer moving parts, easier undo, easier to swap a renderer later.
- **Spatial hash** instead of a quadtree. Design files are mostly similarly sized frames; a uniform grid is simpler and faster to rebuild than a tree.

## Architecture

| Layer | Role |
|---|---|
| `src/core/types.ts` | Discriminated scene graph |
| `src/core/geometry.ts` | Affine matrices, rotated AABB, local-axis resize |
| `src/core/scene.ts` | Parent/world transforms, hit testing, clone |
| `src/core/layout.ts` | Auto-layout hug/fill/place + constraints |
| `src/core/commands.ts` | Graph patches, 150-step undo |
| `src/core/spatial-index.ts` | Hit/snap candidates |
| `src/core/store.ts` | Command dispatch, preview, persistence |
| `src/render/*` | Scene + overlay drawing |
| `src/input/*` | Camera, shortcuts |
| `src/ui/*` | Chrome |

Mutations that should undo go through `dispatch(command)`. Camera, selection, and hover do not. Pointer drags write a live preview map and commit one command on pointer-up, so history and localStorage are not spammed at pointer frequency.

Resize of rotated layers projects the pointer into the node's local space, updates width/height, then solves x/y so the opposite handle stays fixed in parent space. That is covered by `geometry.test.ts`.

## What works

Canvas: infinite pan/zoom 10%–6400%, adaptive grid, rulers, 60fps path with 1000 rectangles (`⌘K` → "Insert 1000 rectangles").

Objects: Frame (clip + auto-layout), rectangle, ellipse, line, polygon, star, text, image (drop/paste), path (pen). Fills (solid + linear/radial), strokes, drop shadow, inner shadow, layer blur. Per-corner radius. Opacity, rotation.

Text: in-place edit, Inter / Roboto / Poppins / Playfair Display / JetBrains Mono / Space Grotesk, weights 100–900, size, line-height, letter-spacing, align, wrapping.

Selection: click, shift-click, marquee, 8 handles + rotation, shift ratio, alt from center, 15° rotation snap, arrow nudge 1/10, pink smart guides.

Panels: layers (search, hide, lock, rename, drag reorder), properties with Mixed, color picker (hex/HSL/recent/EyeDropper), toolbar, command palette (`⌘K`), shortcut sheet (`⌘/`).

Shortcuts: undo/redo, copy/cut/paste/duplicate, select all, group/ungroup, reorder, delete, zoom 100%/fit, tool letters.

Persistence: debounced localStorage, multi-file index, JSON import/export, PNG + SVG export, version checkpoints every 12s.

Stretch that shipped: auto-layout hug/fill, constraints, alignment/distribution, components (promote frame), instances in the demo file, color styles, comments, prototype links + play mode, pen paths, convex boolean ops, 1000-node stress insert.

## Cut, on purpose

- **Vector networks / full bezier editor.** Pen creates and closes paths; point-handle editing after commit is not a full Figma pen.
- **Boolean ops** are convex-polygon (Sutherland–Hodgman + hull). Concave path booleans are best-effort.
- **Background blur** is in the model; Canvas 2D cannot composite a true backdrop-filter behind a clipped shape the way Figma does.
- **Instance overrides** are stored (`characters`, `fills`, size) but the renderer still draws the instance as a styled frame, not a live expanded tree.
- **Multiplayer.** No Yjs. The command log is the collab seam.
- **Plugin API.** Not present.

## Performance notes

React never renders scene nodes. The canvas rAF loop samples the store. Drags use `setPreviewLive` / `setCameraLive` so panels do not re-render per pointer event. Hit testing queries the spatial hash, then precise local tests. Images decode once. Grid step scales with zoom.

## Known bugs / sharp edges

- Text editor overlay is not yet matrix-aligned to the rotated layer; it sits as a DOM textarea.
- Play mode is a frame-to-frame navigator, not a pixel-perfect presentation of the canvas.
- SVG export approximates gradients and skips blur/shadow fidelity.
- Middle-click pan works; trackpad pinch is mapped through ctrl+wheel where the browser allows it.

## Next

WebGL retained renderer on the same scene/command/geometry layers, R-tree for huge nonuniform files, Yjs at the command boundary, real instance expansion, and Playwright suites at 10k nodes.
