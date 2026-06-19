# 3dwebui

A framework and component library for building user interfaces in 3D space, implemented with TypeScript and [Three.js](https://threejs.org/).

## Overview

3dwebui lets you compose interactive UI panels, windows, and labels as 3D meshes projected onto a camera-centered sphere. Widgets can be nested, dragged, clicked, and styled — all in a spatial environment rendered in the browser.

## Features

- **Widgets** — rectangular 3D panels (`UIWidget`) that can be nested arbitrarily deep
- **Windows** — titled top-level panels (`UIWindow`) with borders, added directly to the app
- **Labels** — text widgets (`UILabel`) with configurable font, color, alignment, and ellipsis
- **Drag controllers** — swappable drag modes: `SphereDragController` (orbit on a sphere) and `PlaneDragController` (slide on a local plane)
- **Pointer interaction** — click and drag dispatch with automatic camera-lock while a widget is active
- **Camera orbit** — mouse drag, trackpad two-finger swipe, and touch gestures rotate the camera
- **Eye/gaze tracking** — optional `EyeTrackingController` and `HeadGazeCameraController` using MediaPipe

## Tech Stack

| Tool | Purpose |
|---|---|
| TypeScript | Language (bundler mode) |
| Three.js | Rendering and scene graph |
| Vite | Dev server and bundler |
| MediaPipe Tasks Vision | Eye/head gaze tracking |

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build / type-check
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
  main.ts                      # App bootstrap and demo scene
  app/                         # App orchestration and controllers
    UIApp.ts                   # Main app class (scene, render loop, registry)
    PointerInteractionController.ts
    CameraOrbitController.ts
    TopLevelSphereProjector.ts
    WidgetRegistry.ts
    CornerBoundsOverlay.ts
    EyeTrackingController.ts
    EyeTrackingOverlay.ts
    HeadGazeCameraController.ts
  widgets/                     # Widget domain models
    UIWidget.ts
    UIWindow.ts
    UILabel.ts
  drag/                        # Drag controller implementations
    SphereDragController.ts
    PlaneDragController.ts
    UIDragController.ts
    DragStartContext.ts
    DragMoveContext.ts
    DragTypes.ts
```

## Usage Example

```typescript
import { UIApp } from './app/UIApp'
import { UIWindow } from './widgets/UIWindow'
import { UIWidget } from './widgets/UIWidget'
import { SphereDragController } from './drag/SphereDragController'

const app = new UIApp()
const drag = new SphereDragController()

const window = new UIWindow({ width: 2.9, height: 1.6, title: 'My Panel' })
window.setPosition(0, 0, 0)
window.setDragController(drag)

const button = new UIWidget({ backgroundColor: 0x6366f1, width: 0.8, height: 0.4 })
button.setPosition(0, 0, 0.1)
button.onClick((w) => w.setBackgroundColor(Math.random() * 0xffffff))
window.addWidget(button)

app.addWindow(window)
```

## Architecture

- **Controller pattern** — pointer events and drag behaviour live in dedicated controller classes, not in widgets.
- **Registry pattern** — `WidgetRegistry` maps Three.js objects back to widget instances for raycasting.
- **Composition over inheritance** — drag controllers are assigned per-widget rather than baked into the widget hierarchy.
- **Sphere projection** — top-level widgets are placed on a sphere centred on the camera; their world positions are independent of camera orientation.
