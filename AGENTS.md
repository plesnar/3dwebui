# AGENTS.md

This document defines implementation guidance for AI coding agents working in this repository.

## Project Overview

3dwebui is a framework and components library that allows building user interfaces in 3d space.
Project is implemented using TypeScript and Three.js as a main library.

- The app (`UIApp` class) is the main component which is reponsible for handling the 3d scene, the hierarchy of ui components, the rendering, interactions...
- Widgets (`UIWidget` class) are ui components that can be nested. Widgets are displayed as 3d meshes (including planes).
- Windows (`UIWindow` class) are special top-level widgets, which can be added only directly to an app.
- Buttons (`UIButton` abstract base, `UIRectButton` concrete) are procedural extruded 3d meshes that depress on press. The base owns the mesh, press animation, and optional label; subclasses supply the extruded geometry.
- Drag behavior is controller-driven and separated from widget models.
- Top-level widgets are projected onto a camera-centered sphere using a fixed `sceneOrientation` (identity). Widget world positions do not depend on camera orientation.
- The app tracks one focused widget and one active window globally.

## Core Goals

- Keep interactions predictable and visually clear.
- Preserve modular separation between app orchestration, widget models, and drag logic.
- Prefer small, composable classes over large multi-responsibility files.

## Tech Stack

- TypeScript (bundler mode via Vite)
- Three.js for rendering and scene graph
- No framework runtime (plain TS modules)

## Commands

- Install: npm install
- Dev: npm run dev
- Build/type-check: npm run build

Run `npm run build` after meaningful changes.

## Source Structure

- src/main.ts: app bootstrap and demo scene composition
- src/core: framework-agnostic primitives (e.g. `EventEmitter`)
- src/app: app-level orchestration and interaction plumbing
- src/widgets: widget and window domain models
- src/drag: drag contracts and drag controller implementations
Key app-layer classes:
- `UIApp` — scene, render loop, widget registry, interaction wiring
- `PointerInteractionController` — pointer/click/drag dispatch; fires a camera-lock callback when a widget is active
- `CameraOrbitController` — rotates `camera.quaternion` in place on empty-space drag, trackpad two-finger swipe (wheel events), and two-touch mobile gestures; disabled while a widget interaction is active
- `TopLevelSphereProjector` — places top-level widgets on a sphere centered on the camera using an independent `sceneOrientation` quaternion (currently always identity)
- `WidgetRegistry` — object-to-widget lookup

## Event & Lifecycle Model

- `UIWidget` and `UIApp` both extend the typed `EventEmitter` from `src/core`.
  Use `on(type, listener)` (returns a disposer), `once`, `off`, `emit`.
- Widget events: `click`, `pointerdown/up/enter/leave`, `focus`, `blur`,
  `dragstart/move/end`, `childadded/removed`, `added/removed`, `visibilitychange`,
  `enabledchange`, `sizechange`, `dispose`. `onClick` is sugar over `on('click')`.
- App events: `widgetadded/removed`, `focuschange`, `activewindowchange`, `update`
  (per-frame, carries `delta`), `beforerender/afterrender`, `resize`, `close`.
- Event payloads are defined in `WidgetEventMap`/`AppEventMap` (declared as `type`
  aliases so they satisfy the emitter's `Record<string, unknown>` constraint).
- Lifecycle: `UIApp` exposes `start()`/`stop()` and `close()`/`dispose()`
  (idempotent teardown of loop, listeners, controllers, overlays, widgets, renderer).
  Widgets expose `update(delta)`, `handleAttached/handleDetached`, and overridable
  `onAdded/onRemoved/onResize` hooks.
- Disposal contract: `widget.dispose()` recursively disposes children, detaches from
  its parent, frees geometry/material/textures, and clears listeners. Subclasses free
  their own resources via the protected `disposeResources()` hook. `remove` detaches a
  widget (reusable); `dispose` frees GPU resources. Resizable widgets rebuild
  geometry-dependent decorations in the protected `onResize()` hook.

## Naming conventions

- directories are always lower case
- files should be named exactly as classes, types, interfaces they contain
- main UI component classes (eveything that extends UIWidget) should have `UI` prefix

## Architecture Patterns

- Controller pattern for pointer and drag handling.
- Registry pattern for object-to-widget lookup.
- Composition over inheritance for behavior assignment (drag controllers).
- Explicit top-level vs nested widget behavior.

## Data and Interaction Rules

- `UIWidget` can be nested; `UIWindow` cannot be nested (has to be added to UIApp directly).
- Only one focused widget exists app-wide.
- Only one active window exists app-wide.
- Last interacted element becomes focused/active (window derived from containment).
- Pick/raycast should ignore non-interactive helper objects (overlays, guides, debug scene elements).
- Camera rotation (via `CameraOrbitController`) is suppressed whenever a pointer-down lands on a widget. It resumes on pointer-up/cancel.
- Widget world positions are fixed and do not depend on `camera.quaternion`. `SphereDragController` uses `sceneOrientation` (passed via `DragStartContext`) for its coordinate frame, which must stay in sync with `TopLevelSphereProjector`.

## Coding Conventions

- Keep files focused on a single class or concept.
- Use explicit types for public APIs.
- Prefer immutable `readonly` fields where possible.
- Avoid hidden side effects in getters.
- Keep methods short and responsibility-driven.
- Reuse shared helpers instead of duplicating math/scene logic.

## Visual and Rendering Conventions

- Keep focus/active indicators subtle.
- Prefer corner bounds overlays over fully enclosed boxes for selection cues.
- Use render-order/depth settings carefully to avoid z-fighting and input interference.

## Change Constraints

- Do not rename public classes/files without clear benefit.
- Do not rewrite module boundaries unless needed by the task.
- Avoid broad reformatting unrelated to the requested change.
- Preserve existing interaction semantics unless task explicitly changes them.

## Agent Working Agreement

When implementing tasks:

1. Read affected modules first and preserve established patterns.
2. Make minimal, targeted edits.
3. Validate with `npm run build`.
4. If behavior changes, document it in PR/summary notes.

## Preferred Extension Points

- Add new interaction behavior in src/app controllers first.
- Add new drag modes as additional src/drag controllers.
- Extend visuals in widgets or dedicated app overlay helpers.
- Keep main.ts as composition/demo wiring, not core logic.
