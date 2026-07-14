# Atelier Vector

Atelier Vector is a mini-Figma clone built as a production-style React + Canvas 2D editor. The code is split around editor subsystems instead of screens: geometry, scene graph, spatial indexing, commands, rendering, persistence, input tools, and UI panels.

## Stack

- Vite, React 18, strict TypeScript
- Canvas 2D renderer for a large infinite workspace
- Zustand for explicit editor state without pushing every canvas object through React
- Lucide icons for compact, recognizable tool controls
- Vitest coverage for geometry primitives

Canvas was chosen because the editor needs pan/zoom, hit testing, guides, handles, clipping, and 1000+ object rendering without a DOM node per object. The UI shell remains React because panels, tabs, inputs, and keyboard affordances are better expressed as components.

## Implemented

- Infinite pan/zoom from 10% to 6400%, adaptive grid, rulers, and zoom badge
- Scene graph with frames, rectangles, ellipses, lines, stars/polygons, text, and images
- Fills, gradients, strokes, opacity, rotation, corner radius, shadows, image fit, and frame clipping
- Text editing in place, Google font loading for Inter, Roboto, Poppins, Playfair, JetBrains Mono, and Space Grotesk
- Selection, shift selection, marquee selection, drag, 8 resize handles, rotation handle, shift constraints, alt resize from center, 15 degree rotation snap
- Spatial hash for hit-test candidate lookup and smart alignment guides while dragging
- Layers panel with search, rename, hide, lock, and same-parent drag reorder
- Inspector with mixed multi-selection fields, fill/stroke controls, text controls, auto-layout controls, align/distribute, recent colors, and exports
- Command-pattern undo/redo history capped at 100 commands
- Clipboard copy/cut/paste/duplicate, grouping, layer ordering, nudge, select all, zoom reset, grid toggle, and tool shortcuts
- Debounced localStorage persistence, multi-document tabs, JSON import/export hooks, PNG/SVG selection export
- Image insertion by toolbar, file picker, paste/drop path support in the canvas drop handler
- Error boundary and responsive panel behavior

## Architecture

- `src/types` defines the discriminated scene-node union and serialized document format.
- `src/geometry` contains matrix math, bounds, rotated corners, and hit testing.
- `src/scene` owns graph traversal, auto-layout resolution, spatial indexing, node factories, and Canvas rendering.
- `src/commands` implements reversible mutation commands. Commands store targeted before/after patches or deleted subtree payloads, not whole-document snapshots.
- `src/state` owns document state, viewport state, history stacks, clipboard, and index rebuilding.
- `src/tools` contains pointer hit testing, handle detection, local-axis transforms, marquee, and smart snapping.
- `src/ui` contains the React shell and panels.

## Trade-offs And Cuts

This is intentionally deep, but not a full Figma replacement. The main cuts are boolean operations, pen/vector-network editing, component instances, multiplayer CRDT sync, true dirty-rect rendering, and a fully dynamic constraint solver. Auto-layout resolves real child positions and can hug contents, but it does not yet model every Figma resizing mode. SVG export covers the common primitive subset and intentionally omits Canvas-only effects like blurred shadows.

## Performance Notes

The renderer draws directly to Canvas, and the spatial hash avoids full-scene scans for pointer hit testing. The current renderer redraws the full viewport on state changes; the next step would be layer caching and dirty-rect invalidation around changed node bounds. The app is structured so that can be added inside `src/scene/render.ts` without changing tools or panels.

## Commands

```bash
npm install
npm run dev
npm run build
npm run test
```

## Known Bugs

- Text editing uses an axis-aligned DOM textarea over the canvas, so editing rotated text does not rotate the textarea.
- Background blur is represented in the model but not faithfully composited in Canvas.
- Drag reorder supports siblings; arbitrary reparenting is left for a focused tree-drop pass.
