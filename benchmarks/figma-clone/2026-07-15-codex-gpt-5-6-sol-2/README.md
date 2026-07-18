# GPT-5.6 Sol

A local-first vector design editor built from first principles with React, strict TypeScript, and an imperative Canvas 2D renderer. It has a normalized scene graph, reversible operation commands, local-axis transforms, spatially indexed hit testing, structured layers and properties panels, durable browser persistence, and portable JSON/SVG/PNG output.

No prebuilt design-tool framework is used.

## Run it

Requirements: a recent Node.js release and pnpm.

```bash
pnpm install
pnpm dev
```

Open [http://127.0.0.1:9157](http://127.0.0.1:9157). The development server uses a strict port, so it fails clearly instead of silently selecting another one.

Production verification is available as one command:

```bash
pnpm check
```

This runs the strict TypeScript build, ESLint, unit tests, and the Vite production build. `pnpm preview` serves the production bundle on the same port.

## What is implemented

### Canvas and direct manipulation

- Infinite pan and zoom from 10% to 6400%, with pointer-centered zoom, trackpad panning, space-drag and middle-button panning, zoom controls, 100% zoom, fit-all, and fit-selection.
- Adaptive 1/2/5-step grid and rulers whose spacing remains legible across zoom levels.
- High-DPI, two-layer Canvas rendering with a separate interaction overlay, animation-frame coalescing, viewport culling, and asynchronous image caching.
- Frame, rectangle, ellipse, line, star, and text drawing tools. The scene model and renderer also support polygon nodes.
- Images from paste or drag-and-drop, stored as portable data URLs, with a 20 MB input guard and aspect-preserving placement.
- Click, additive click, marquee selection, hover outlines, and locked/hidden-layer-aware hit testing.
- Eight resize handles and a rotation handle for a single selection. Resize and rotation are calculated in the node's local axes, including inside rotated parent hierarchies.
- Shift aspect lock, Alt resize/draw from center, Shift axis-constrained movement, and Shift 15-degree rotation snapping.
- Non-destructive transform previews: pointer movement updates a small override map, then one command is committed on release.
- Smart edge/center alignment guides, live dimensions, magenta guide lines, and 1 px, 10 px, or 0.1 px keyboard nudging.
- In-place multiline text editing by double-clicking a text layer or drawing with the Text tool.
- A local presentation view for the selected top-level frame or layer tree.

### Scene content and styling

The discriminated scene model covers frames, groups, rectangles, ellipses and arcs, lines, text, images, polygons, and stars. Every node carries parent-relative geometry, rotation, opacity, blend mode, visibility, locking, constraints, layout metadata, per-corner radii, fill stacks, stroke stacks, and effect stacks.

The current renderer supports:

- nested transforms and frame clipping;
- resolved horizontal and vertical auto-layout;
- solid, linear-gradient, and radial-gradient paints;
- multiple fills and strokes, closed-shape inside/center/outside alignment, width/join/cap/dash, opacity, and Canvas blend modes;
- drop shadows, clipped inner shadows, layer blur, and backdrop blur inside closed silhouettes;
- text fill and stroke stacks, grapheme-aware letter spacing, wrapping, justification, decoration, horizontal and vertical alignment, case transforms, line height, and browser font weights;
- image fill, fit, and centered crop behavior;
- ellipse arcs, rings, polygons, and stars.

Google-hosted Inter, Roboto, Poppins, Playfair Display, JetBrains Mono, and Space Grotesk are requested at startup, with system fallbacks when they are unavailable.

### Layers and properties

- Searchable hierarchical layer tree with disclosure, keyboard navigation, range/toggle selection, inline rename, visibility and lock controls.
- Drag reorder and drag reparent at root, sibling, or container level. Reparenting rejects cycles and preserves the layer's world-space position and rotation.
- Properties for position, size, rotation, linked or independent corner radii, opacity, blend mode, alignment, fills, strokes, effects, frame clipping, typography, and export.
- Multi-selection properties expose mixed values instead of inventing a representative value.
- Color controls include native visual picking, validated hex plus alpha, and the browser EyeDropper API when available.
- Fill controls convert between solid, linear, and radial paints; gradient editing includes an ordered stop rail, add/remove, stop position and color, plus linear/radial geometry.
- Typography controls include the bundled font list, weights 100-900, size, line height, letter spacing, alignment, italic, decoration, and auto-resize metadata.
- Frame controls expose live auto-layout direction, gaps, padding, alignment, wrapping, reversal, and sizing modes.
- Six alignment commands operate in world space and convert their deltas back through each node's parent transform.

### Auto-layout

Auto-layout is resolved as ephemeral runtime geometry, leaving the authored scene document and its revision untouched. The engine supports:

- horizontal and vertical flow, four-sided padding, fixed gap, and deterministic wrapping with a separate counter-axis gap;
- start, center, end, and space-between primary alignment;
- start, center, end, and stretch counter alignment, plus per-child alignment overrides;
- fixed, hug, and fill sizing on both frame axes;
- main-axis fill allocation, weighted grow, child min/max clamps, and cross-axis fill/stretch;
- visual reverse order without mutating persisted child order;
- nested auto-layout frames with parent fill constraints propagated into their children;
- absolute-positioned children that stay in place and do not participate in layout or hug measurement.

### Editing workflow

- A searchable keyboard command palette with disabled-state explanations.
- Context menu actions for clipboard, grouping, stacking, visibility, locking, export, and deletion.
- Clipboard duplicate/cut/copy/paste preserves complete subtrees and assigns collision-free IDs.
- Group, ungroup, reorder, and reparent commands preserve hierarchy and transform semantics.
- Save-state feedback, compact success/error toasts, empty states, focus-visible controls, ARIA labels, trapped/restored dialog focus, roving menu navigation, reduced-motion styling, and a top-level recovery boundary.

## Keyboard shortcuts

`Cmd` below maps to `Ctrl` on non-macOS platforms.

| Action                                            | Shortcut                                                |
| ------------------------------------------------- | ------------------------------------------------------- |
| Move, Frame, Rectangle, Ellipse, Line, Text, Hand | `V`, `F`, `R`, `O`, `L`, `T`, `H`                       |
| Undo / redo                                       | `Cmd Z` / `Cmd Shift Z`                                 |
| Cut / copy / paste / duplicate                    | `Cmd X` / `Cmd C` / `Cmd V` / `Cmd D`                   |
| Select all top-level layers                       | `Cmd A`                                                 |
| Group / ungroup                                   | `Cmd G` / `Cmd Shift G`                                 |
| Forward / backward one level                      | `Cmd ]` / `Cmd [`                                       |
| Bring to front / send to back                     | `Cmd Shift ]` / `Cmd Shift [`                           |
| Delete selection                                  | `Delete` or `Backspace`                                 |
| Nudge                                             | Arrow: `1`; `Shift` + Arrow: `10`; `Alt` + Arrow: `0.1` |
| Fit document / 100% / fit selection               | `Cmd 0` / `Cmd 1` / `Cmd 2`                             |
| Command palette                                   | `Cmd /` or `Cmd K`                                      |
| Toggle grid / rulers                              | `Shift G` / `Shift R`                                   |
| New document / import JSON / export               | `Cmd N` / `Cmd Shift O` / `Cmd Shift E`                 |
| Cancel the current transient state                | `Esc`                                                   |

Available shortcuts are also surfaced in tooltips, menus, and the command palette.

## Architecture

The editor keeps serializable document state separate from ephemeral interaction state. A committed edit follows this pipeline:

```text
pointer / keyboard / property control
              |
              v
     non-destructive preview
              |
              v
       operation command  <---->  undo / redo stack
              |
              v
 normalized SceneDocument + graph invariants + revision
              |
        +-----+-------------------------+
        |                               |
        v                               v
 auto-layout resolver            debounced persistence
        |                         + document manifest
        v
 SceneRuntime + spatial grid ---> Canvas renderer + overlay
```

### Model and scene graph

`src/core/model` owns the versioned schema, node factories, deep cloning, traversal, and graph invariants. Documents are normalized as an ID-to-node record plus ordered root IDs; frames and groups own ordered child ID arrays. This makes structural edits explicit, avoids recursive object replacement, and gives persistence a stable format.

Runtime checks reject duplicate IDs, dangling parents or children, inconsistent parent/child links, cycles, invalid geometry, invalid paint/effect values, and malformed auto-layout metadata.

Groups are normalized bottom-up to tight descendant bounds after edits. Their local origins and direct children are rebased together, preserving every descendant's world transform while keeping group hit areas, selection bounds, and fit-selection current.

### Commands and history

`src/core/commands` implements reversible node and root-order operation patches. Create, update, delete, reorder, reparent, group, ungroup, clipboard paste, direct transforms, and property edits enter a 300-command history. Commands retain only the affected before/after nodes or order arrays, not a full-document snapshot. Batch commands compose atomic multi-node changes, redo is cleared on divergent edits, and document revisions advance as patches apply.

Structural commands run against model invariants. World transforms are decomposed when moving a node between parents, so hierarchy changes do not visually jump.

### Geometry

`src/core/geometry` is framework-free and unit-testable. It contains affine matrix composition/inversion, point and vector transforms, rotated bounds, AABB operations, shape-aware hit testing, resize-handle math, and center-based rotation with angular snapping. Pointer math is converted between screen, world, parent, and node-local coordinate spaces deliberately.

### Runtime and spatial index

Before indexing, `src/core/layout` resolves auto-layout into an ephemeral node record. Its axis-independent layout algorithm handles line formation, flexible allocation, sizing clamps, alignment, hug sizing, nested constraints, and absolute children without changing the persisted source document.

`SceneRuntime` then derives world matrices, rotated world bounds, paint order, clipping ancestry, and a 256-unit uniform spatial grid from that resolved document. Point and rectangle queries only inspect nearby cells; results retain reverse paint order for topmost hit testing. The same index feeds marquee selection, viewport culling, and nearby smart-guide candidates.

Entries spanning more than a bounded cell budget use a separate oversized-entry path, and oversized queries fall back to a bounded full scan. Pathological imported coordinates therefore cannot allocate millions of grid buckets.

The runtime is immutable for a document revision and is rebuilt only after a committed document mutation. Pointer transforms use lightweight render overrides instead.

### Renderer and input

`SceneRenderer` owns all Canvas 2D painting. It renders the scene and interaction overlay on separate high-DPI canvases, walks the hierarchy with save/restore transform boundaries, applies frame clips, culls offscreen layer drawing, and keeps selection handles at a constant screen-space size.

`CanvasStage` owns gestures. Pointer state lives in refs rather than the serialized document; the store exposes typed session states for idle, panning, marquee, drawing, transforming, and text editing. Tool creation, hit testing, preview calculation, and command commit remain separate stages, which keeps a new drawing tool localized.

### State and UI shell

`EditorStore` coordinates the document, command history, derived runtime, session state, clipboard, render overrides, save state, and toasts through a small external-store API. React renders the panels, dialogs, menus, and controls; Canvas painting stays imperative. No global state or immutable-update dependency is required.

### Persistence and files

`src/editor/persistence` provides a typed local repository with one key per document, a recent-document manifest, and an active-document pointer. Autosave is debounced by 450 ms, skips identical serialized document writes, flushes when the page becomes hidden or unloads, and reports quota or storage failures rather than swallowing them.

Imports are parsed as `unknown`, limited to 25 MB, checked against the current schema, and graph-validated before entering the editor. Unknown schema versions are rejected explicitly. The app can create and switch among multiple locally stored documents from the main menu.

`src/editor/export` provides:

- complete, pretty-printed, versioned JSON documents;
- camera-independent SVG for the document or current selection, including nested transforms, clips, gradients, text, safe images, blend modes, and portable SVG filters where possible;
- PNG at 0.25x-4x by rasterizing the generated SVG offscreen, with 16,384-pixel and roughly 67-megapixel safety limits;
- content-derived export bounds, selection-root deduplication, safe filenames, and structured error results.

## Performance strategy

- Canvas paint is scheduled through `requestAnimationFrame`, so repeated input invalidations coalesce into one frame.
- The persistent scene and transient transform override map are separate; dragging does not rebuild the scene graph or create history entries on every pointer event.
- High-frequency camera, hover, cursor, gesture, and preview notifications repaint canvas/status subscribers without rerendering the layers and properties panels.
- The spatial grid avoids full-scene scans for pointer hits, marquee candidate lookup, snapping, and viewport visibility.
- Offscreen nodes are omitted from actual shape painting while hierarchy traversal retains clipping correctness.
- Image elements are cached and decoded asynchronously.
- Canvas backing stores track device pixel ratio while UI-sized handles and guides remain crisp and stable.
- Model and runtime structures are read-only at their public boundaries; committed updates replace only changed node records.

The code is designed for dense scenes, but this build does not claim a measured 1,000-layer/60 fps benchmark. Rendering currently clears and repaints the visible scene rather than using dirty rectangles, and committed edits rebuild the derived runtime. Those are the next performance boundaries to instrument and optimize.

## Tests and quality gates

Vitest covers:

- matrix algebra, transformed resize/rotate behavior, and shape-aware hit testing;
- spatial-grid insertion, ordering, updates, and queries;
- 1,500-node runtime construction, viewport culling, and indexed hit testing;
- oversized spatial-entry/query safety, smart-guide badge data, ancestor-lock enforcement, and transient/UI notification separation;
- model construction, traversal, invariants, and cloning;
- rotated group-bound normalization, descendant world preservation, and undo/redo integration;
- auto-layout flow, alignment, fill/grow sizing, wrap, hug, reversal, nested constraints, min/max clamps, and absolute positioning;
- reversible structural commands and world-preserving hierarchy edits;
- persistence schema and graph validation;
- SVG serialization, nested transforms, gradients, clipping, effects, selection bounds, and warnings.

TypeScript enables `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, unused-code checks, and override/fallthrough checks. ESLint uses type-aware strict and stylistic rules and forbids non-null assertions. The production build is part of `pnpm check`.

There is not yet an automated browser interaction or performance suite; runtime gesture, export-download, and accessibility regression coverage should be added before shipping this as a hosted product.

## Project tree

```text
.
├── DESIGN.md
├── PRODUCT.md
├── README.md
├── eslint.config.js
├── index.html
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── src
    ├── main.tsx
    ├── styles.css
    ├── app
    │   ├── App.tsx
    │   ├── EditorErrorBoundary.tsx
    │   ├── editorOperations.ts
    │   └── useWorkspacePersistence.ts
    ├── core
    │   ├── commands
    │   │   ├── command.ts
    │   │   ├── commands.test.ts
    │   │   ├── history.ts
    │   │   ├── index.ts
    │   │   ├── operations.ts
    │   │   ├── patches.ts
    │   │   └── transform.ts
    │   ├── geometry
    │   │   ├── bounds.ts
    │   │   ├── hit-test.test.ts
    │   │   ├── hit-test.ts
    │   │   ├── index.ts
    │   │   ├── matrix2d.test.ts
    │   │   ├── matrix2d.ts
    │   │   ├── rect.ts
    │   │   ├── resize-rotate.test.ts
    │   │   ├── resize-rotate.ts
    │   │   ├── transforms.ts
    │   │   └── vec2.ts
    │   ├── layout
    │   │   ├── axis.ts
    │   │   ├── index.ts
    │   │   ├── layoutFrame.ts
    │   │   ├── resolveAutoLayout.test.ts
    │   │   ├── resolveAutoLayout.ts
    │   │   └── types.ts
    │   ├── model
    │   │   ├── clone.ts
    │   │   ├── factories.ts
    │   │   ├── groupBounds.test.ts
    │   │   ├── groupBounds.ts
    │   │   ├── index.ts
    │   │   ├── invariants.ts
    │   │   ├── model.test.ts
    │   │   ├── traversal.ts
    │   │   └── types.ts
    │   └── spatial
    │       ├── SpatialGrid.test.ts
    │       ├── SpatialGrid.ts
    │       └── index.ts
    ├── editor
    │   ├── CanvasStage.tsx
    │   ├── EditorStore.test.ts
    │   ├── EditorStore.ts
    │   ├── sceneRuntime.test.ts
    │   ├── sceneRuntime.ts
    │   ├── seedDocument.ts
    │   ├── sessionTypes.ts
    │   ├── useEditorShortcuts.ts
    │   ├── rendering
    │   │   └── SceneRenderer.ts
    │   ├── persistence
    │   │   ├── autosave.ts
    │   │   ├── errors.ts
    │   │   ├── index.ts
    │   │   ├── schema.test.ts
    │   │   ├── schema.ts
    │   │   └── storage.ts
    │   └── export
    │       ├── download.ts
    │       ├── errors.ts
    │       ├── index.ts
    │       ├── json.ts
    │       ├── png.ts
    │       ├── svg.test.ts
    │       └── svg.ts
    └── ui
        ├── CommandPalette.tsx
        ├── ContextMenu.tsx
        ├── ExportDialog.tsx
        ├── MainMenu.tsx
        ├── PreviewModal.tsx
        ├── StatusBar.tsx
        ├── TopBar.tsx
        ├── useFocusManagement.ts
        ├── panels
        │   ├── LayersPanel.tsx
        │   ├── PropertiesPanel.tsx
        │   ├── index.ts
        │   └── panels.css
        └── primitives
            ├── ColorInput.tsx
            ├── IconButton.tsx
            ├── Menu.tsx
            ├── NumberField.tsx
            ├── PanelSection.tsx
            ├── Popover.tsx
            ├── SegmentedControl.tsx
            ├── Toast.tsx
            ├── Toggle.tsx
            ├── VisuallyHidden.tsx
            ├── index.ts
            ├── internal.ts
            └── primitives.css
```

## Stack rationale

- **React 19** is used for accessible application chrome, forms, menus, dialogs, and composition. It is intentionally not used to represent every canvas node as DOM.
- **Canvas 2D** offers predictable browser support, fast retained-data/immediate-paint rendering, text and image APIs, blend modes, filters, and direct control over screen-space interaction affordances. A custom renderer keeps scene semantics independent of a third-party design framework.
- **Strict TypeScript** makes node variants, commands, geometry, persistence failures, and exports explicit. The model has no `any` escape hatch.
- **Vite** keeps startup and production bundling small and direct.
- **Vitest** exercises the framework-independent core without requiring a browser for deterministic geometry and serialization tests.
- **Lucide React** supplies consistent accessible iconography; it does not contribute editor behavior.
- **localStorage** makes the editor immediately durable and offline-capable without a backend. The repository boundary can later be replaced by IndexedDB or remote storage.

## Honest limitations

- Auto-layout measures text and images from their stored node bounds rather than intrinsic font/image metrics. Baseline alignment currently falls back to start; overflow has no flex-shrink pass; wrapping chooses lines from intrinsic sizes and does not implement advanced align-content semantics; rotated children participate through their unrotated layout boxes.
- Constraint settings are schema metadata; non-auto-layout parent resizing does not yet resolve pin/center/scale constraints. In-place text edits resolve height or width-and-height auto-resize with browser font metrics.
- Inside/outside strokes are exact for closed silhouettes; line and text strokes remain centered because Canvas 2D exposes no glyph/path-side clipping primitive. Shadow spread is stored but not modeled live. Background blur is clipped to closed shapes, images, and frames, not text, lines, or groups.
- SVG export intentionally reports approximations for inside/outside stroke alignment, arrow/triangle caps, justified/wrapped text, non-default image crops, shadow blend modes, and inner-shadow spread. Background blur is omitted. The current download UI does not surface those non-fatal warnings.
- PNG export inherits SVG fidelity and browser canvas security constraints. Remote images can taint or fail rasterization; pasted data-URL images are the portable path.
- Canvas text uses browser font metrics and grapheme segmentation rather than a shaping engine. Tracking, decoration, wrapping, and justification are implemented, but complex-script shaping and advanced OpenType controls do not have exact Figma parity. Google Fonts require network access on first load.
- Image crop offsets and tile behavior are represented in the model and SVG serializer, but the live Canvas image renderer currently provides fill, fit, and centered crop behavior.
- Single-selection move, resize, and rotation are complete for directly sizable nodes. Groups and lines intentionally omit resize handles; groups normalize around descendant bounds, and lines avoid ambiguous degenerate-axis scaling. Multi-selection supports moving and property/alignment edits but not group-bounds resize or rotation.
- Polygon nodes are supported by the model/renderer/export path but do not yet have a dedicated toolbar entry.
- There is no pen or Bézier editor, vector network, boolean path engine, components/instances/variants, prototype-link graph, plugin runtime, multiplayer/CRDT layer, or named version history.
- History is in-memory and resets when a different document is opened or the page reloads; the current document itself is persisted.
- localStorage is appropriate for a self-contained editor but is quota-limited, especially with many embedded images. There is no cross-tab conflict resolution or remote sync.
- Full-frame Canvas repaint and full derived-runtime rebuild after commits are deliberate first-pass trade-offs. Dirty rectangles, incremental spatial updates, and a measured large-scene benchmark remain open performance work.

## Next steps

1. Extend layout with intrinsic text/image measurement, typographic baselines, flex shrink, advanced wrapped-line alignment, rotated footprints, and a resolver for non-auto-layout constraints.
2. Instrument 1,000/10,000-layer workloads, split scene and overlay invalidation, update the runtime/spatial index incrementally, and adopt dirty rectangles or tiled caching where measurements justify it.
3. Add browser-level tests for every gesture, shortcut, local-storage recovery path, import/export download, keyboard focus route, and reduced-motion mode.
4. Replace browser text approximation with a shaping and measurement layer; add an image crop editor, shadow-spread compositing, text/path-side stroke alignment, and advanced OpenType controls.
5. Build a vector path representation, pen editing, boolean operations, and path-aware SVG round trips.
6. Add component/instance semantics, design styles and variables, prototype connections, comments, and persistent version checkpoints.
7. Move large assets to IndexedDB and introduce a collaboration-ready operation log before adding CRDT-backed multiplayer.
