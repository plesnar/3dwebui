# 3dwebui

A framework and component library for building user interfaces in 3D space, implemented with TypeScript and [Three.js](https://threejs.org/).

## Overview

3dwebui lets you compose interactive UI panels, windows, and labels as 3D meshes projected onto a camera-centered sphere. Widgets can be nested, dragged, clicked, and styled — all in a spatial environment rendered in the browser.

A standout capability is **hands-free head & eye tracking**: using your webcam, the camera view follows your head pose and gaze in real time, so you can look around a 3D interface without touching the mouse.

## Features

- **Head & eye tracking** — webcam-driven, hands-free camera control built on MediaPipe (see [Head & Eye Tracking](#head--eye-tracking)). Enabled by default and toggled live with the **H** key
- **Widgets** — rectangular 3D panels (`UIWidget`) that can be nested arbitrarily deep
- **Windows** — titled top-level panels (`UIWindow`) with borders, added directly to the app
- **Labels** — text widgets (`UILabel`) with configurable font, color, alignment, and ellipsis
- **Buttons** — procedurally extruded 3D buttons (`UIRectButton`) that physically depress on press, with configurable thickness, bevel, colors, and a centred label
- **Typed events** — `UIWidget` and `UIApp` extend a typed `EventEmitter`; subscribe with `on`/`once`/`off` to events like `click`, `pointerenter/leave`, `focus/blur`, `dragstart/move/end`, `sizechange`, `dispose`, and app-level `focuschange`, `update`, `close`
- **Widget state & transform** — `visible`, `enabled`, `opacity`, runtime `setSize`, `rotation`, and `scale`, plus identity (`id`, `name`) and `userData`
- **Hierarchy & traversal** — `parent`, `addWidget`/`removeWidget`, `traverse`, `findById`, `findByName`, `contains`
- **Lifecycle & disposal** — app `start`/`stop`/`close`, per-frame `update(delta)`, and recursive `dispose()` that frees geometry, materials, textures, and listeners
- **Drag controllers** — swappable drag modes: `SphereDragController` (orbit on a sphere) and `PlaneDragController` (slide on a local plane)
- **Pointer interaction** — click, hover, and drag dispatch with automatic camera-lock while a widget is active; disabled widgets opt out of picking
- **Camera orbit** — mouse drag, trackpad two-finger swipe, and touch gestures rotate the camera
- **Debug mode** — toggle with the **D** key (or the `debug` option / `app.debug` / `app.toggleDebug()`) to show the camera-feed overlay, an on-screen FPS counter, and the head-tracking status readout
- **Keyboard shortcuts** — **D** toggles debug mode, **H** toggles head/eye tracking (see [Keyboard Shortcuts](#keyboard-shortcuts))

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

## Default Sci-Fi Showcase

`src/main.ts` starts `createSciFiShowcaseApp()` from `src/examples/sciFiShowcase.ts`.
Three glass stations use only `UISciFiWindow`, `UISciFiButton`, and matching
monospace labels against a generated, deterministic starfield panorama:

- **Sensor array**: animated sweep, timed scans, contact readouts, and reset/disabled states.
- **Navigation**: a plane-draggable target, live coordinates, and a recenter command.
- **Systems**: adjustable power that changes scan speed, Hold/Resume for the live
  instruments, and Restore layout for the sphere-draggable windows.

Desktop shows all three stations; portrait screens use matching station tabs.
Drag a window to reposition it, or drag empty space to turn the camera. The
starfield needs no downloaded assets, and its texture and instrument resources
are released when the app closes. Readouts are simulated; no external service or
webcam is required.

Optional head and eye tracking uses the same setup as the original showcase.
Allow webcam access, then press **H** to toggle hands-free camera control.
Press **D** to show the debug camera feed while tracking is enabled. Turning
tracking off clears the head offset and resets neutral-pose calibration.
Tracking requires webcam permission and network access to load the MediaPipe
model; the instruments remain usable when tracking is unavailable.

The original mixed-component demo remains available through `createShowcaseApp()`
in `src/examples/showcase.ts`; import and call that factory in `src/main.ts` to
switch back.

## Project Structure

```
src/
  main.ts                      # App bootstrap and demo scene
  core/                        # Framework-agnostic primitives
    EventEmitter.ts            # Generic typed event emitter
  app/                         # App orchestration and controllers
    UIApp.ts                   # Main app class (scene, render loop, registry)
    UIAppOptions.ts            # App configuration options
    AppEventMap.ts             # App event payload types
    PointerInteractionController.ts
    CameraOrbitController.ts
    TopLevelSphereProjector.ts
    WidgetRegistry.ts
    CornerBoundsOverlay.ts
    EyeTrackingController.ts
    EyeTrackingOverlay.ts
    FpsOverlay.ts
    HeadGazeCameraController.ts
    TrackingStatusOverlay.ts
  widgets/                     # Widget domain models
    UIWidget.ts
    UIWindow.ts
    UILabel.ts
    UIButton.ts                # Abstract procedural 3D button base
    UIRectButton.ts            # Rectangular extruded + beveled button
    UIWidgetOptions.ts
    WidgetEventMap.ts          # Widget event payload types
    UIWindowOptions.ts
    UILabelOptions.ts
    UIButtonOptions.ts
    UIRectButtonOptions.ts
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

// Configure the app via options (all optional).
const app = new UIApp({
  backgroundColor: 0x111827,
  camera: { position: { x: 0, y: 0, z: 5 } },
  debug: true, // show camera-feed overlay + FPS counter (toggle with "D")
})

const drag = new SphereDragController()

const panel = new UIWindow({ name: 'panel', width: 2.9, height: 1.6, title: 'My Panel' })
panel.setPosition(0, 0, 0)
panel.setDragController(drag)

const button = new UIWidget({ backgroundColor: 0x6366f1, width: 0.8, height: 0.4 })
button.setPosition(0, 0, 0.1)
button.on('pointerenter', () => (button.opacity = 0.7))
button.on('pointerleave', () => (button.opacity = 1))
button.onClick((w) => w.setBackgroundColor(Math.random() * 0xffffff))
panel.addWidget(button)

app.add(panel)

// React to app-level events.
app.on('focuschange', (event) => console.log('focused:', event.focused?.name))
app.on('update', (event) => {
  button.rotation.z += event.delta // animate per frame
})

// Tear everything down when finished.
// app.close()
```

## Buttons

Buttons are procedural 3D meshes (not flat planes) that physically depress when pressed. `UIButton` is the abstract base — it owns the extruded mesh, the press animation, and an optional centred label — while `UIRectButton` renders a rounded-rectangle face extruded and beveled along Z.

- **Press feedback** — pointer-down smoothly reduces the extruded height and shifts to `pressedColor`; pointer-up/leave releases it. Read the live state via `button.pressed`.
- **Geometry** — tune `thickness` (extruded height), `pressDepth` (how far the top face drops), and the rounded-rectangle `cornerRadius`.
- **Bevel** — `bevelThickness`, `bevelSize`, `bevelOffset`, and `bevelSegments` map directly onto Three.js `ExtrudeGeometry` bevel settings.
- **Color & label** — `color`/`pressedColor` style the face; `text`, `textColor`, and `font` render a label that sits on (and drops with) the top face.
- **Clicks** — use `button.onClick((b) => ...)`; the handler receives the button instance. Clicks on the label still resolve to the button.

```typescript
import { UIRectButton } from './widgets/UIRectButton'

const button = new UIRectButton({
  name: 'primary-button',
  text: 'Click Me',
  width: 1.6,
  height: 0.6,
  thickness: 0.3,
  bevelThickness: 0.06,
  bevelSize: 0.04,
  bevelSegments: 4,
  color: 0x2563eb,
  pressedColor: 0x1e3a8a,
  textColor: 0xffffff,
})
button.setPosition(-2.4, 2.2, 0)
button.setDragController(new SphereDragController())

let clicks = 0
button.onClick((b) => {
  clicks += 1
  b.text = `Clicked ${clicks}`
})

app.add(button)
```

## Flat Sci-Fi Windows

`UISciFiWindow` is a separate flat alternative to `UIWindow`, which remains unchanged.
It has asymmetrically clipped corners, blue-tinted frosted glass, light borders,
and optional line/status decorations. Its physical transmission material refracts
and softly blurs the scene behind it while keeping the controls crisp.
`UISciFiButton` provides matching flat controls with hover, press, and disabled feedback.

```typescript
import { UISciFiWindow } from './widgets/UISciFiWindow'
import { UISciFiButton } from './widgets/UISciFiButton'

const window = new UISciFiWindow({
  title: 'ORBITAL / TELEMETRY',
  width: 3.2,
  height: 2.2,
  color: 0x729bb7,
  gradientColor: 0xc3e2ef,
  transmission: 0.96,
  roughness: 0.28,
  ior: 1.45,
  glassThickness: 0.32,
  borderColor: 0x9ae7f2,
  accentColor: 0xf2c879,
  cornerCut: 0.22,
})
window.setDragController(new SphereDragController())
const scan = new UISciFiButton({ text: 'Scan' })
scan.setPosition(0, -0.5, window.depth + 0.01)
scan.onClick(() => { window.title = 'SCAN COMPLETE' })
window.addWidget(scan)
app.add(window)
```

Increase `roughness` for more frosting, or decrease it toward zero for clear glass.
`ior` and `glassThickness` control refraction; thickness is optical only, so the
window geometry stays flat. Keep `opacity` at its default of `1` for glass; use
`transmission` to control how much light passes through. Scene lighting and an
environment map provide reflections (both are present in the showcase).
`UIApp` captures the scene behind each visible sci-fi window, including transparent
text labels and widgets, for refraction and blur. Foreground objects and the
window's own controls are excluded from that capture and stay sharp. This adds one
background render per visible sci-fi window at the canvas's CSS resolution; captures
resize with the canvas and are released when the window is removed or the app closes.
Outside `UIApp`, the material falls back to Three.js's standard transmission buffer,
which only includes the scene background and opaque objects.

Both window styles participate in the same global active-window tracking; the
`activeWindow` property and event now return `UIWindow | UISciFiWindow | undefined`.
The new window supports `title`, `opacity`, `setSize`, recursive disposal, and
top-level dragging. Set `decorations: false` or `closable: false` to omit those
elements. Cut-off corners and decorative objects do not intercept pointer input.
The showcase includes a simulated telemetry scan with scan/reset controls and keeps
the new panel centered and scaled to fit narrow viewports.

## Lifecycle & Disposal

- `app.start()` / `app.stop()` control the render loop; `autoStart` (default `true`) starts it on construction.
- `app.close()` (alias `app.dispose()`) is idempotent: it stops the loop, removes DOM/event listeners, disposes controllers, overlays, widgets, and the renderer.
- `widget.dispose()` recursively disposes descendants, detaches from its parent, and frees geometry, materials, textures, and listeners. Use `app.remove(widget)` to detach a widget for reuse without freeing its GPU resources.

## Debug Mode

Debug mode overlays diagnostic visuals on top of the scene:

- A live **camera-feed overlay** (the eye/gaze-tracking view) in the corner, shown only while tracking is enabled.
- An **FPS counter** pinned to the top-left of the screen.
- A **tracking status** readout (`Tracking: ON` / `Tracking: OFF`) directly below the FPS counter.

Toggle it at runtime by pressing **D** (ignored while typing in inputs), or control it from code:

```typescript
const app = new UIApp({ debug: true }) // start with debug mode on

app.debug = false      // disable
app.toggleDebug()      // flip the current state
app.on('debugchange', (event) => console.log('debug:', event.debug))
```

## Keyboard Shortcuts

| Key | Action |
|---|---|
| **D** | Toggle debug mode (camera-feed overlay, FPS counter, tracking status) |
| **H** | Toggle head/eye tracking on/off |

Shortcuts are ignored while typing into an `input`, `textarea`, `select`, or any `contentEditable` element. Each shortcut has a programmatic equivalent (`app.toggleDebug()`, `app.toggleTracking()`).

## Head & Eye Tracking

3dwebui can drive the camera **hands-free** from your webcam. The `EyeTrackingController` runs MediaPipe's face-landmark model to estimate head pose and gaze, and the `HeadGazeCameraController` maps those into camera-orbit angles — so turning your head or shifting your gaze pans the view, like looking through a window into the 3D scene.

- **Enabled by default** — tracking starts as soon as the webcam is granted.
- **Toggle live with the H key**, or from code via `app.trackingEnabled` / `app.toggleTracking()`.
- **Self-calibrating** — the neutral pose is captured from the first frames; toggling tracking off re-centres the camera and re-calibrates on the next enable.
- **Privacy-aware** — webcam inference pauses while the tab is hidden (`pauseWhenHidden`), and the frame rate is capped (`fps`) to limit CPU/GPU load.
- **Visualized in debug mode** — enable debug to see the live camera feed with iris circles plus head- and gaze-direction vectors, and the on-screen tracking status.

```typescript
import { EyeTrackingController } from './app/EyeTrackingController'
import { HeadGazeCameraController } from './app/HeadGazeCameraController'

const app = new UIApp({
  enableTracking: true, // default; press "H" to toggle at runtime
})

const eyeTracker = new EyeTrackingController({ fps: 15, pauseWhenHidden: true })
await eyeTracker.init() // prompts for webcam access

if (app.orbitController) {
  const headGaze = new HeadGazeCameraController(eyeTracker, app.orbitController)
  app.registerUpdateCallback(() => {
    if (app.trackingEnabled) headGaze.update()
  })
}

app.on('trackingchange', (event) => console.log('tracking:', event.enabled))
```

## Architecture

- **Event-driven** — widgets and the app extend a typed `EventEmitter`; interaction, lifecycle, and state changes are exposed as events with multiple-listener `on`/`once`/`off` support.
- **Controller pattern** — pointer events and drag behaviour live in dedicated controller classes, not in widgets.
- **Registry pattern** — `WidgetRegistry` maps Three.js objects back to widget instances for raycasting.
- **Composition over inheritance** — drag controllers are assigned per-widget rather than baked into the widget hierarchy.
- **Sphere projection** — top-level widgets are placed on a sphere centred on the camera; their world positions are independent of camera orientation.
