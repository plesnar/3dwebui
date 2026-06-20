import './style.css'
import { PlaneDragController } from './drag/PlaneDragController'
import { SphereDragController } from './drag/SphereDragController'
import { UIApp } from './app/UIApp'
import { UILabel } from './widgets/UILabel'
import { UIWidget } from './widgets/UIWidget'
import { UIWindow } from './widgets/UIWindow'
import { EyeTrackingController } from './app/EyeTrackingController'
import { EyeTrackingOverlay } from './app/EyeTrackingOverlay'
import { HeadGazeCameraController } from './app/HeadGazeCameraController'

// ── app ───────────────────────────────────────────────────────────────────
// Construct the app with explicit options instead of relying on defaults.
const app = new UIApp({
  backgroundColor: 0x111827,
  camera: { position: { x: 0, y: 0, z: 5 } },
  debug: true,
})

// App-level events: react to focus/active-window changes globally.
app.on('focuschange', (event) => {
  console.log('focus:', event.focused?.name || event.focused?.id || '(none)')
})
app.on('activewindowchange', (event) => {
  console.log('active window:', event.activeWindow?.title ?? '(none)')
})
app.on('close', () => {
  document.body.style.background = '#000'
})

const sphereDragController = new SphereDragController()

// ── hover + click widget ────────────────────────────────────────────────────
// Demonstrates pointer hover events (scale pulse) and click recolouring.
const widgetA = new UIWidget({
  name: 'orange-tile',
  backgroundColor: 0xf97316,
  width: 1.8,
  height: 1.2,
})
widgetA.setPosition(-2, 0, 0)
widgetA.setDragController(sphereDragController)
widgetA.on('pointerenter', () => widgetA.setScale(1.1))
widgetA.on('pointerleave', () => widgetA.setScale(1))
widgetA.onClick((widget) => widget.setBackgroundColor(Math.random() * 0xffffff))

// ── opacity-on-hover widget ─────────────────────────────────────────────────
const widgetB = new UIWidget({
  name: 'green-tile',
  backgroundColor: 0x22c55e,
  width: 1.2,
  height: 1.8,
  opacity: 0.55,
})
widgetB.setPosition(2, 0, 0)
widgetB.setDragController(sphereDragController)
widgetB.on('pointerenter', () => (widgetB.opacity = 1))
widgetB.on('pointerleave', () => (widgetB.opacity = 0.55))
widgetB.onClick((widget) => widget.setBackgroundColor(Math.random() * 0xffffff))

// ── disabled widget ─────────────────────────────────────────────────────────
// `enabled: false` opts the widget out of picking, hover and clicks.
const disabledWidget = new UIWidget({
  name: 'disabled-tile',
  backgroundColor: 0x64748b,
  width: 1.0,
  height: 0.6,
  enabled: false,
})
disabledWidget.setPosition(-2, -2, 0)
disabledWidget.setDragController(sphereDragController)
disabledWidget.onClick(() => console.log('this should never fire while disabled'))

// ── window that resizes itself on click ─────────────────────────────────────
const windowA = new UIWindow({
  name: 'control-panel',
  width: 2.9,
  height: 1.6,
  borderSize: 0.01,
  borderColor: 0xf8fafc,
  title: 'Control Panel',
})
windowA.setPosition(0, 0, 0)
windowA.setDragController(sphereDragController)
let panelWide = false
windowA.onClick((win) => {
  panelWide = !panelWide
  win.setSize(panelWide ? 3.6 : 2.9, 1.6)
  win.title = panelWide ? 'Control Panel (wide)' : 'Control Panel'
})

// ── nested + deeply nested widgets ───────────────────────────────────────────
const nestedWidget = new UIWidget({
  name: 'nested',
  backgroundColor: 0x0ea5e9,
  width: 0.85,
  height: 0.5,
})
nestedWidget.setPosition(0, 0, 0.1)
nestedWidget.setDragController(new PlaneDragController())
nestedWidget.onClick((widget) => widget.setBackgroundColor(Math.random() * 0xffffff))
windowA.addWidget(nestedWidget)

const deepWidget = new UIWidget({
  name: 'deep',
  backgroundColor: 0xf43f5e,
  width: 0.35,
  height: 0.2,
})
deepWidget.setPosition(0, 0, 0.1)
deepWidget.setDragController(new PlaneDragController())
deepWidget.onClick((widget) => widget.setBackgroundColor(Math.random() * 0xffffff))
nestedWidget.addWidget(deepWidget)

// ── self-disposing widget ────────────────────────────────────────────────────
// Clicking removes the widget from the app and frees its GPU resources.
const disposableWidget = new UILabel({
  name: 'dispose-me',
  text: 'Click to remove me',
  textColor: 0x0b1120,
  backgroundColor: 0xfde047,
  width: 1.6,
  height: 0.4,
})
disposableWidget.setPosition(-3, 2, 0)
disposableWidget.setDragController(sphereDragController)
disposableWidget.on('dispose', () => console.log('disposed:', disposableWidget.id))
disposableWidget.onClick((label) => {
  app.remove(label)
  label.dispose()
})

// ── spinning widget driven by the update event ───────────────────────────────
const spinner = new UIWidget({
  name: 'spinner',
  backgroundColor: 0xa855f7,
  width: 0.6,
  height: 0.6,
})
spinner.setPosition(3, 2, 0)
app.on('update', (event) => {
  spinner.rotation.z += event.delta * 1.5
})

// ── close-app control ─────────────────────────────────────────────────────────
const closeButton = new UILabel({
  name: 'close-app',
  text: 'Close App',
  textColor: 0xffffff,
  backgroundColor: 0xdc2626,
  width: 1.4,
  height: 0.4,
})
closeButton.setPosition(3, -2, 0)
closeButton.setDragController(sphereDragController)
closeButton.on('pointerenter', () => (closeButton.backgroundColor = 0xef4444))
closeButton.on('pointerleave', () => (closeButton.backgroundColor = 0xdc2626))
closeButton.onClick(() => app.close())

// ── standalone labels ────────────────────────────────────────────────────────
const labelA = new UILabel({
  name: 'hello-label',
  text: 'Hello, 3D!',
  font: '600 48px "Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif',
  textColor: 0xf8fafc,
  backgroundColor: 0x6366f1,
  width: 2.0,
  height: 0.5,
  textAlign: 'left',
  verticalAlign: 'top',
})
labelA.setPosition(0, -2, 0)
labelA.setDragController(sphereDragController)
labelA.onClick((label) => (label.textColor = Math.random() * 0xffffff))

const nestedLabel = new UILabel({
  name: 'nested-label',
  text: 'Nested label',
  font: '400 36px "Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif',
  textColor: 0xffffff,
  width: 1.2,
  height: 0.28,
})
nestedLabel.setPosition(0, -0.45, 0.1)
windowA.addWidget(nestedLabel)

app.add(widgetA)
app.add(widgetB)
app.add(disabledWidget)
app.add(windowA)
app.add(disposableWidget)
app.add(spinner)
app.add(closeButton)
app.add(labelA)

// ── optional eye / head-gaze integration ──────────────────────────────────────
const eyeTracker = new EyeTrackingController({ fps: 15, pauseWhenHidden: true })
eyeTracker
  .init()
  .then(() => {
    const eyeOverlay = new EyeTrackingOverlay(app.sceneRoot, app.activeCamera, eyeTracker)
    // The camera feed is a debug-only visualization.
    eyeOverlay.setVisible(app.debug)
    app.on('debugchange', (event) => eyeOverlay.setVisible(event.debug))
    app.registerUpdateCallback(() => eyeOverlay.update())

    if (app.orbitController) {
      const headGaze = new HeadGazeCameraController(eyeTracker, app.orbitController)
      app.registerUpdateCallback(() => headGaze.update())
    }
  })
  .catch((err: unknown) => {
    console.warn('Eye tracking unavailable:', err)
  })

