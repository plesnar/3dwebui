import * as THREE from 'three'
import { UIApp } from '../app/UIApp'
import { UILabel } from '../widgets/UILabel'
import { UIRectButton } from '../widgets/UIRectButton'
import { UIWidget } from '../widgets/UIWidget'
import { UIWindow } from '../widgets/UIWindow'
import { UISciFiWindow } from '../widgets/UISciFiWindow'
import { UISciFiButton } from '../widgets/UISciFiButton'
import { PlaneDragController } from '../drag/PlaneDragController'
import { SphereDragController } from '../drag/SphereDragController'
import { setupHeadGazeTracking } from './setupHeadGazeTracking'

/**
 * A self-contained example that exercises the framework's headline features:
 *
 * - top-level widgets projected onto the camera sphere (`SphereDragController`)
 * - nested widgets dragged in their parent's plane (`PlaneDragController`)
 * - windows with borders, titles and nested content
 * - procedural extruded buttons in a few visual variants
 * - text labels with alignment variants and runtime restyling
 * - pointer hover / click / focus interaction events
 * - per-frame animation through the app `update` event
 * - optional webcam-driven head-gaze camera control (toggle with the "H" key)
 *
 * Call {@link createShowcaseApp} once from the entry point to mount it.
 */
export function createShowcaseApp(): UIApp {
  const app = new UIApp({
    backgroundColor: 0x0f172a,
    backgroundImage: '/textures/tree_lined_driveway_2k.exr',
    camera: { position: { x: 0, y: 0, z: 5 } },
    debug: true,
  })

  addLighting(app)
  logAppEvents(app)

  // Top-level widgets share one sphere drag controller so they all slide along
  // the same camera-centred sphere; nested widgets get their own plane dragger.
  const sphereDrag = new SphereDragController()

  buildInteractiveTiles(app, sphereDrag)
  const dashboard = buildDashboardWindow(app, sphereDrag)
  buildSciFiWindow(app, sphereDrag, dashboard)
  buildButtonVariants(app, sphereDrag)
  buildLabelVariants(app, sphereDrag)
  buildAnimatedWidget(app)
  setupHeadGazeTracking(app)

  return app
}

// ── lighting ─────────────────────────────────────────────────────────────────
// Extruded buttons use a lit material, so the scene needs at least one light.
function addLighting(app: UIApp): void {
  const ambient = new THREE.AmbientLight(0xffffff, 0.7)
  const key = new THREE.DirectionalLight(0xffffff, 1.1)
  key.position.set(3, 5, 6)
  const fill = new THREE.DirectionalLight(0x93c5fd, 0.4)
  fill.position.set(-4, -2, 3)
  app.sceneRoot.add(ambient, key, fill)
}

// ── app-level events ───────────────────────────────────────────────────────
function logAppEvents(app: UIApp): void {
  app.on('focuschange', (event) => {
    console.log('[focus]', event.focused?.name || event.focused?.id || '(none)')
  })
  app.on('activewindowchange', (event) => {
    console.log('[active window]', event.activeWindow?.title ?? '(none)')
  })
  app.on('close', () => {
    document.body.style.background = '#000'
  })
}

// ── interactive tiles ────────────────────────────────────────────────────────
// Three plain widgets demonstrating hover scaling, hover opacity, the disabled
// state, and click-to-recolour.
function buildInteractiveTiles(app: UIApp, sphereDrag: SphereDragController): void {
  // Hover grows the tile; clicking randomises its colour.
  const hoverTile = new UIWidget({
    name: 'hover-tile',
    backgroundColor: 0xf97316,
    width: 1.6,
    height: 1.1,
    position: [-2.6, 0, 0],
  })
  hoverTile.setDragController(sphereDrag)
  hoverTile.on('pointerenter', () => hoverTile.setScale(1.1))
  hoverTile.on('pointerleave', () => hoverTile.setScale(1))
  hoverTile.onClick((widget) => widget.setBackgroundColor(Math.random() * 0xffffff))

  // Hover fades the tile to fully opaque and back.
  const fadeTile = new UIWidget({
    name: 'fade-tile',
    backgroundColor: 0x22c55e,
    width: 1.1,
    height: 1.6,
    opacity: 0.5,
    position: [2.6, 0, 0],
  })
  fadeTile.setDragController(sphereDrag)
  fadeTile.on('pointerenter', () => (fadeTile.opacity = 1))
  fadeTile.on('pointerleave', () => (fadeTile.opacity = 0.5))

  // Disabled widgets are skipped by picking, so this never reacts.
  const disabledTile = new UIWidget({
    name: 'disabled-tile',
    backgroundColor: 0x475569,
    width: 1.0,
    height: 0.6,
    enabled: false,
    position: [-2.6, -2.1, 0],
  })
  disabledTile.setDragController(sphereDrag)
  disabledTile.onClick(() => console.log('disabled tile should never fire'))

  app.add(hoverTile).add(fadeTile).add(disabledTile)
}

// ── dashboard window ─────────────────────────────────────────────────────────
// A 3D beveled window with a raised, beveled title bar that nests a label and a
// button. The nested widgets sit on the window's front face and are dragged
// within the window plane.
function buildDashboardWindow(app: UIApp, sphereDrag: SphereDragController): UIWindow {
  const window = new UIWindow({
    name: 'dashboard',
    title: 'Dashboard',
    width: 3.0,
    height: 1.8,
    thickness: 0.18,
    cornerRadius: 0.12,
    color: 0x1f2937,
    titleBarColor: 0x1f2937,
    titleBarHeight: 0.36,
    titleBarMargin: 0.06,
    titleBarElevation: -0.03,
    position: [1.4, 0, 0],
  })
  window.setDragController(sphereDrag)

  // Front face of the window body, where nested content rests.
  const surfaceZ = window.depth + 0.01

  // Toggle the window between two sizes when its background is clicked.
  let expanded = false
  window.onClick((win) => {
    expanded = !expanded
    win.setSize(expanded ? 3.8 : 3.0, 1.8)
    win.title = expanded ? 'Dashboard (expanded)' : 'Dashboard'
  })

  const heading = new UILabel({
    name: 'dashboard-heading',
    text: 'Live readouts',
    font: '600 36px "Avenir Next", "Segoe UI", sans-serif',
    textColor: 0xe2e8f0,
    width: 1.6,
    height: 0.3,
    position: [0, 0.3, surfaceZ],
  })
  window.addWidget(heading)

  // A counter label updated by a nested button.
  let counter = 0
  const counterLabel = new UILabel({
    name: 'counter-label',
    text: 'Count: 0',
    textColor: 0x38bdf8,
    width: 1.4,
    height: 0.32,
    position: [-0.7, -0.1, surfaceZ],
  })
  counterLabel.setDragController(new PlaneDragController())
  window.addWidget(counterLabel)

  const incButton = new UIRectButton({
    name: 'increment',
    text: '+1',
    width: 0.7,
    height: 0.5,
    thickness: 0.18,
    cornerRadius: 0.1,
    color: 0x2563eb,
    textColor: 0xffffff,
    position: [0.6, -0.1, surfaceZ],
  })
  incButton.setDragController(new PlaneDragController())
  incButton.onClick(() => {
    counter += 1
    counterLabel.text = `Count: ${counter}`
  })
  window.addWidget(incButton)

  app.add(window)
  return window
}

function buildSciFiWindow(app: UIApp, sphereDrag: SphereDragController, dashboard: UIWindow): void {
  const window = new UISciFiWindow({
    name: 'sci-fi-telemetry',
    title: 'ORBITAL / TELEMETRY',
    width: 3.2,
    height: 2.2,
    position: [-0.7, 0, 0],
  })
  window.setDragController(sphereDrag)
  let narrowLayout: boolean | undefined
  const fitWindow = (): void => {
    const camera = app.activeCamera
    const narrow = camera.aspect < 1.2
    if (narrow !== narrowLayout) {
      window.setPosition(narrow ? 0 : -0.7, 0, 0)
      dashboard.setPosition(narrow ? 2.7 : 1.4, 0, 0)
      narrowLayout = narrow
    }
    const visibleWidth = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
      * UIWidget.TOP_LEVEL_BASE_RADIUS * camera.aspect
    window.setScale(Math.min(1, visibleWidth / (window.width + 0.45)))
  }
  fitWindow()
  window.on('dispose', app.on('resize', fitWindow))
  const surfaceZ = window.depth + 0.01
  const addReadout = (name: string, text: string, x: number, y: number, width: number, color: number, fontSize = 28): UILabel => {
    const label = new UILabel({
      name,
      text,
      textColor: color,
      textAlign: 'left',
      font: `500 ${fontSize}px "Menlo", "Consolas", monospace`,
      width,
      height: 0.25,
      position: [x, y, surfaceZ],
    })
    label.mesh.userData['uiOverlay'] = true
    label.mesh.traverse((object) => {
      object.raycast = () => {}
      if (object instanceof THREE.Mesh) {
        object.material.depthWrite = false
        object.material.toneMapped = false
      }
    })
    window.addWidget(label)
    return label
  }

  addReadout('telemetry-sector', 'SECTOR 07 / RELAY', -0.52, 0.45, 1.65, 0xb0dce8)
  const status = addReadout('telemetry-status', 'STANDBY', 0.88, 0.45, 0.8, 0xf2c879)
  addReadout('telemetry-range-label', 'RANGE', -0.96, 0.07, 0.75, 0x8db5c8, 24)
  addReadout('telemetry-signal-label', 'SIGNAL', 0.52, 0.07, 0.75, 0x8db5c8, 24)
  const range = addReadout('telemetry-range', '--- km', -0.63, -0.2, 1.4, 0xe0faff, 40)
  const signal = addReadout('telemetry-signal', '--- %', 0.79, -0.2, 1.3, 0xe0faff, 40)
  const scan = new UISciFiButton({
    name: 'telemetry-scan',
    text: 'Scan',
    width: 1.12,
    height: 0.34,
    position: [-0.72, -0.64, surfaceZ],
  })
  const reset = new UISciFiButton({
    name: 'telemetry-reset',
    text: 'Reset',
    width: 1.12,
    height: 0.34,
    color: 0x253c49,
    borderColor: 0xadc2c8,
    position: [0.72, -0.64, surfaceZ],
  })
  reset.enabled = false
  let scanElapsed: number | undefined
  let sample = 0
  scan.onClick(() => {
    scanElapsed = 0
    status.text = 'SCANNING'
    scan.text = 'Scanning'
    scan.enabled = false
    reset.enabled = true
  })
  reset.onClick(() => {
    scanElapsed = undefined
    sample = 0
    status.text = 'STANDBY'
    range.text = '--- km'
    signal.text = '--- %'
    scan.text = 'Scan'
    scan.enabled = true
    reset.enabled = false
  })
  const stopUpdating = app.on('update', ({ delta }) => {
    if (scanElapsed === undefined) return
    scanElapsed += delta
    if (scanElapsed < 0.9) return
    sample += 1
    range.text = `${(842.6 + sample * 0.7).toFixed(1)} km`
    signal.text = `${96 + sample % 4} %`
    status.text = 'LINKED'
    scan.text = 'Rescan'
    scan.enabled = true
    scanElapsed = undefined
  })
  window.on('dispose', stopUpdating)
  window.addWidget(scan).addWidget(reset)
  app.add(window)
}

// ── button variants ──────────────────────────────────────────────────────────
// Three extruded buttons showcasing geometry and press-feedback options.
function buildButtonVariants(app: UIApp, sphereDrag: SphereDragController): void {
  // Slim button that counts its own presses in the label.
  const primary = new UIRectButton({
    name: 'primary-button',
    text: 'Click Me',
    width: 1.6,
    height: 0.6,
    thickness: 0.3,
    bevelThickness: 0.06,
    bevelSize: 0.04,
    bevelSegments: 4,
    color: 0x6366f1,
    pressedColor: 0x312e81,
    textColor: 0xffffff,
    position: [-2.5, 2.3, 0],
  })
  primary.setDragController(sphereDrag)
  let clicks = 0
  primary.onClick((button) => {
    clicks += 1
    button.text = `Clicked ${clicks}`
  })

  // Chunky button with a deep extrusion and a soft, highly subdivided bevel.
  const chunky = new UIRectButton({
    name: 'chunky-button',
    text: 'Push',
    width: 1.0,
    height: 1.0,
    cornerRadius: 0.22,
    thickness: 0.5,
    pressDepth: 0.38,
    bevelThickness: 0.12,
    bevelSize: 0.08,
    bevelSegments: 8,
    color: 0x10b981,
    textColor: 0x05241a,
    position: [0, 2.3, 0],
  })
  chunky.setDragController(sphereDrag)
  chunky.onClick(() => console.log('chunky button pressed'))

  // Flat button that toggles colour and label on each click.
  const toggle = new UIRectButton({
    name: 'toggle-button',
    text: 'Off',
    width: 1.4,
    height: 0.9,
    thickness: 0.7,
    bevelThickness: 0.16,
    bevelSize: 0.2,
    bevelSegments: 24,
    color: 0xf59e0b,
    textColor: 0x231400,
    position: [2.5, 2.3, 0],
  })
  toggle.setDragController(sphereDrag)
  let on = false
  toggle.onClick((button) => {
    on = !on
    button.color = on ? 0xef4444 : 0xf59e0b
    button.text = on ? 'On' : 'Off'
  })

  app.add(primary).add(chunky).add(toggle)
}

// ── label variants ───────────────────────────────────────────────────────────
// Labels demonstrating alignment options, runtime restyling, and the app close
// control.
function buildLabelVariants(app: UIApp, sphereDrag: SphereDragController): void {
  const titleLabel = new UILabel({
    name: 'title-label',
    text: 'Hello, 3D UI!',
    font: '600 48px "Avenir Next", "Segoe UI", sans-serif',
    textColor: 0xf8fafc,
    backgroundColor: 0x6366f1,
    width: 2.0,
    height: 0.5,
    textAlign: 'left',
    verticalAlign: 'top',
    position: [0, -2.1, 0],
  })
  titleLabel.setDragController(sphereDrag)
  titleLabel.onClick((label) => (label.textColor = Math.random() * 0xffffff))

  // A self-disposing label: clicking removes it and frees its GPU resources.
  const disposable = new UILabel({
    name: 'dispose-me',
    text: 'Click to remove me',
    textColor: 0x0b1120,
    backgroundColor: 0xfde047,
    width: 1.8,
    height: 0.4,
    position: [-3.0, 2.2, 0],
  })
  disposable.setDragController(sphereDrag)
  disposable.on('dispose', () => console.log('[disposed]', disposable.id))
  disposable.onClick((label) => {
    app.remove(label)
    label.dispose()
  })

  // Close control that tears the whole app down.
  const closeLabel = new UILabel({
    name: 'close-app',
    text: 'Close App',
    textColor: 0xffffff,
    backgroundColor: 0xdc2626,
    width: 1.4,
    height: 0.4,
    position: [3.0, -2.1, 0],
  })
  closeLabel.setDragController(sphereDrag)
  closeLabel.on('pointerenter', () => (closeLabel.backgroundColor = 0xef4444))
  closeLabel.on('pointerleave', () => (closeLabel.backgroundColor = 0xdc2626))
  closeLabel.onClick(() => app.close())

  app.add(titleLabel).add(disposable).add(closeLabel)
}

// ── animation ────────────────────────────────────────────────────────────────
// A widget spun continuously by the per-frame app update event.
function buildAnimatedWidget(app: UIApp): void {
  const spinner = new UIWidget({
    name: 'spinner',
    backgroundColor: 0xa855f7,
    width: 0.6,
    height: 0.6,
    position: [3.0, 2.3, 0],
  })
  app.add(spinner)
  app.on('update', (event) => {
    spinner.rotation.z += event.delta * 1.5
  })
}
