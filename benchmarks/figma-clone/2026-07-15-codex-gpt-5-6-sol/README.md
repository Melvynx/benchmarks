# GPT-5.6 Sol

A production-minded mini design editor built from scratch with React, strict TypeScript, and Canvas 2D. It runs with:

```bash
pnpm dev
```

The development server is fixed to `http://127.0.0.1:9144` and refuses to silently choose another port.

## What is implemented

- Infinite canvas navigation from 10% to 6400%, adaptive minor/major grid, world-space rulers, cursor-aware zoom, panning, fit-all, and fit-selection.
- Typed scene graph with frames, groups, components, instances, rectangles, ellipses, lines, stars, text, and images. Frames clip children and can resolve horizontal/vertical auto-layout with gap, padding, alignment, fixed sizing, or hug contents.
- Solid, linear, and radial paints; independent strokes and dash arrays; opacity; rotation; per-corner radii; drop shadows; layer blur; image cover/contain/fill.
- Spatial-grid accelerated hit testing and marquee selection. Rendering and picking use the same parent-aware affine transforms.
- Eight resize handles plus a rotation handle. Resize deltas are projected into the layer's local axis and the opposite anchor is solved in parent space, so rotated resize does not drift. Shift preserves ratio, Option resizes from center, and Shift snaps rotation to 15 degrees.
- Smart alignment guides, multi-selection, nudge/big-nudge, stacking order, grouping, ungrouping, duplicate, copy, cut, paste, delete, and direct text editing.
- Drag/drop and clipboard image insertion with intrinsic dimensions and data-URL persistence.
- Searchable, nested layer tree with rename, visibility, locking, reorder, and Option-drop reparenting. Properties include mixed multi-selection values, position, dimensions, rotation, opacity, fills, recent colors, stroke, effects, typography, frame clipping, and auto-layout.
- Reversible graph-delta command history capped at 150 operations. Undo does not store whole-document snapshots. Transient drag previews live outside the document and commit once on pointer-up.
- Debounced, serialized-change-aware local persistence, a 12-document index, and periodic version checkpoints separate from undo history.
- JSON import/export, SVG export, and 2x PNG export for selection or the full canvas.
- Full keyboard workflow, quick-command palette, shortcut reference, responsive panel collapsing, reduced-motion handling, and a recovery error boundary.

## Architecture

The project deliberately separates editor concerns:

- `src/core/types.ts` defines the discriminated scene graph and editor state.
- `src/core/geometry.ts` contains pure affine matrix, transformed bounds, local/world conversion, and shape hit tests.
- `src/core/commands.ts` owns reversible graph deltas and bounded history.
- `src/core/spatial-index.ts` is a world-space uniform grid used for hit testing, marquee queries, and snapping candidates.
- `src/core/layout.ts` resolves auto-layout without involving React or rendering.
- `src/core/store.ts` is the command boundary and external store; persistent document mutations enter through commands.
- `src/render/canvas-renderer.ts` owns Canvas drawing, layered overlays, image caching, rulers, selection chrome, and guides.
- `src/features/editor/EditorCanvas.tsx` translates pointer/keyboard gestures into previews and commands.
- Focused panel components own the application shell without leaking scene math into UI code.

Canvas 2D was selected over DOM/SVG because it keeps the object-count cost predictable, makes the adaptive world grid cheap, and allows a single transform model to drive rendering and hit testing. React owns chrome, accessibility, and input controls; it does not reconcile a component for every scene node.

## Performance notes

- React does not rerender scene nodes. Canvas is invalidated through `requestAnimationFrame` and draws from the current store snapshot.
- Hit testing and snapping query a spatial grid instead of scanning the scene.
- Pointer drags write to a small preview map and produce one history command, avoiding localStorage/history churn at pointer frequency.
- Images are decoded once and cached by source.
- Grid density adapts to zoom, keeping line count bounded.
- Scene traversal is ordered and clipped per frame. A future WebGL renderer can consume the same scene, geometry, command, and spatial-index layers.

## Honest boundaries

This build prioritizes a correct editing core. It does not include real network multiplayer, a pen/bezier network editor, boolean path operations, or a sandboxed third-party plugin runtime. Components and instances exist in the scene schema and UI, but instance override editing is intentionally limited. Background blur is represented in the model but Canvas 2D cannot reproduce Figma's composited backdrop blur exactly. SVG export preserves the principal geometry, hierarchy, paint, text, and image data; complex Canvas-only effects are not bit-identical in SVG.

For a second phase I would add a retained WebGL render backend, an R-tree tuned for highly nonuniform scenes, path boolean operations backed by a robust geometry kernel, Yjs document operations at the command boundary, font file embedding for deterministic exports, accessibility narration for canvas selection, and Playwright interaction/performance suites covering 10,000-node files.

## Validation

```bash
pnpm typecheck
pnpm test
pnpm build
```

Geometry tests cover affine inversion, center rotation, rotated AABBs, and local-axis projection. The compiler runs with strict mode, exact optional properties, unchecked-index protection, and no implicit fallthrough.
