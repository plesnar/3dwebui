import * as THREE from 'three'
import { CameraOrbitController } from './CameraOrbitController'
import { CornerBoundsOverlay } from './CornerBoundsOverlay'
import { FpsOverlay } from './FpsOverlay'
import { TopLevelSphereProjector } from './TopLevelSphereProjector'
import { PointerInteractionController } from './PointerInteractionController'
import { TrackingStatusOverlay } from './TrackingStatusOverlay'
import { WidgetRegistry } from './WidgetRegistry'
import { EventEmitter } from '../core/EventEmitter'
import type { AppEventMap } from './AppEventMap'
import type { UIAppOptions } from './UIAppOptions'
import type { UIWidget } from '../widgets/UIWidget'
import { UIWindow } from '../widgets/UIWindow'

export class UIApp extends EventEmitter<AppEventMap> {
  private readonly scene: THREE.Scene
  private readonly camera: THREE.PerspectiveCamera
  private readonly renderer: THREE.WebGLRenderer
  private readonly raycaster: THREE.Raycaster
  private readonly clock = new THREE.Clock()
  private readonly sceneOrientation = new THREE.Quaternion()
  private readonly cameraOrbitController?: CameraOrbitController
  private readonly widgetRegistry = new WidgetRegistry()
  private readonly topLevelSphereProjector = new TopLevelSphereProjector()
  private readonly pointerInteractionController: PointerInteractionController
  private readonly focusedWidgetBounds = new CornerBoundsOverlay({
    color: 0xf8fafc,
    opacity: 0.72,
    padding: 0.035,
    cornerRatio: 0.18,
    zOffset: 0.008,
  })
  private readonly activeWindowBounds = new CornerBoundsOverlay({
    color: 0x93c5fd,
    opacity: 0.55,
    padding: 0.05,
    cornerRatio: 0.22,
    zOffset: 0.006,
  })
  private readonly fpsOverlay: FpsOverlay
  private readonly trackingStatusOverlay: TrackingStatusOverlay
  private rafId: number | null = null
  private _running = false
  private _closed = false
  private _debug = false
  private _trackingEnabled = true

  public get sceneRoot(): THREE.Scene {
    return this.scene
  }

  public get activeCamera(): THREE.PerspectiveCamera {
    return this.camera
  }

  public get orbitController(): CameraOrbitController | undefined {
    return this.cameraOrbitController
  }

  public get running(): boolean {
    return this._running
  }

  public get closed(): boolean {
    return this._closed
  }

  public get debug(): boolean {
    return this._debug
  }

  public set debug(value: boolean) {
    this.setDebug(value)
  }

  /** Flips debug mode on/off. Bound to the "D" key by default. */
  public toggleDebug(): void {
    this.setDebug(!this._debug)
  }

  public get trackingEnabled(): boolean {
    return this._trackingEnabled
  }

  public set trackingEnabled(value: boolean) {
    this.setTrackingEnabled(value)
  }

  /** Flips head/eye tracking on/off. Bound to the "H" key by default. */
  public toggleTracking(): void {
    this.setTrackingEnabled(!this._trackingEnabled)
  }

  /** Compatibility shim over `on('update', ...)`. */
  public registerUpdateCallback(fn: (camera: THREE.PerspectiveCamera) => void): void {
    this.on('update', (event) => fn(event.camera))
  }

  constructor(options: UIAppOptions = {}) {
    super()

    const container = options.container ?? document.body

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(options.backgroundColor ?? 0x111827)

    this.camera = new THREE.PerspectiveCamera(
      options.camera?.fov ?? 75,
      window.innerWidth / window.innerHeight,
      options.camera?.near ?? 0.1,
      options.camera?.far ?? 100,
    )
    const cameraPosition = options.camera?.position ?? { x: 0, y: 0, z: 5 }
    this.camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z)

    this.renderer = new THREE.WebGLRenderer({ antialias: options.antialias ?? true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(options.pixelRatio ?? window.devicePixelRatio)
    container.appendChild(this.renderer.domElement)

    this.raycaster = new THREE.Raycaster()
    window.addEventListener('resize', this.handleResize)
    window.addEventListener('keydown', this.handleKeyDown)

    this.fpsOverlay = new FpsOverlay(container)
    this.trackingStatusOverlay = new TrackingStatusOverlay(container)
    this._trackingEnabled = options.enableTracking ?? true
    this.trackingStatusOverlay.setEnabled(this._trackingEnabled)

    if (options.enableCameraOrbit ?? true) {
      this.cameraOrbitController = new CameraOrbitController(
        this.renderer.domElement,
        (orientation) => this.camera.quaternion.copy(orientation),
      )
    }

    this.pointerInteractionController = new PointerInteractionController(
      this.renderer.domElement,
      this.camera,
      this.raycaster,
      this.pickWidgetAtPointer,
      this.handleWidgetInteraction,
      (locked) => this.cameraOrbitController?.setBlocked(locked),
      () => this.sceneOrientation,
    )

    if (options.debug) {
      this.setDebug(true)
    }

    if (options.autoStart ?? true) {
      this.start()
    }
  }

  // ── collection ────────────────────────────────────────────────────────────

  public add(widget: UIWidget): this {
    this.widgetRegistry.add(widget, this.scene)
    widget.handleAttached()
    this.emit('widgetadded', { type: 'widgetadded', app: this, widget })
    return this
  }

  public remove(widget: UIWidget): this {
    if (!this.widgetRegistry.topLevel.includes(widget)) {
      return this
    }

    if (this.focusedWidget && (this.focusedWidget === widget || widget.contains(this.focusedWidget))) {
      this.setFocus(undefined)
    }

    this.widgetRegistry.remove(widget, this.scene)
    widget.handleDetached()
    this.emit('widgetremoved', { type: 'widgetremoved', app: this, widget })
    return this
  }

  public removeAll(): this {
    for (const widget of [...this.widgetRegistry.topLevel]) {
      this.remove(widget)
    }
    return this
  }

  public get widgets(): readonly UIWidget[] {
    return this.widgetRegistry.topLevel
  }

  public getWidgetById(id: string): UIWidget | undefined {
    return this.findWidget((widget) => widget.id === id)
  }

  public findWidget(predicate: (widget: UIWidget) => boolean): UIWidget | undefined {
    for (const root of this.widgetRegistry.topLevel) {
      const match = root.find(predicate)
      if (match) {
        return match
      }
    }
    return undefined
  }

  public traverse(visitor: (widget: UIWidget) => void): void {
    for (const root of this.widgetRegistry.topLevel) {
      root.traverse(visitor)
    }
  }

  // ── focus ─────────────────────────────────────────────────────────────────

  public get focusedWidget(): UIWidget | undefined {
    return this._focusedWidget
  }

  public get activeWindow(): UIWindow | undefined {
    return this._activeWindow
  }

  public focus(widget?: UIWidget): void {
    this.setFocus(widget)
  }

  public blur(): void {
    this.setFocus(undefined)
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────

  public start(): void {
    if (this._running || this._closed) {
      return
    }
    this._running = true
    this.clock.start()
    this.rafId = requestAnimationFrame(this.animate)
  }

  public stop(): void {
    this._running = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  /**
   * Tears the app down: stops the render loop, removes DOM/event listeners,
   * disposes controllers, overlays, widgets and the renderer. Idempotent.
   */
  public close(): void {
    if (this._closed) {
      return
    }
    this._closed = true

    this.stop()
    window.removeEventListener('resize', this.handleResize)
    window.removeEventListener('keydown', this.handleKeyDown)

    this.pointerInteractionController.dispose()
    this.cameraOrbitController?.dispose()
    this.focusedWidgetBounds.dispose()
    this.activeWindowBounds.dispose()
    this.fpsOverlay.dispose()
    this.trackingStatusOverlay.dispose()

    for (const widget of [...this.widgetRegistry.topLevel]) {
      widget.dispose()
    }
    this.widgetRegistry.clear(this.scene)

    this.renderer.dispose()
    this.renderer.domElement.remove()

    this.emit('close', { type: 'close', app: this })
    this.removeAllListeners()
  }

  /** Alias for {@link close}. */
  public dispose(): void {
    this.close()
  }

  // ── internals ─────────────────────────────────────────────────────────────

  private _focusedWidget?: UIWidget
  private _activeWindow?: UIWindow
  private focusedSizeUnsubscribe?: () => void
  private activeWindowSizeUnsubscribe?: () => void

  private setFocus(widget?: UIWidget): void {
    const focusChanged = this._focusedWidget !== widget
    const nextWindow = this.findContainingWindow(widget)
    const windowChanged = this._activeWindow !== nextWindow

    if (focusChanged) {
      const previous = this._focusedWidget
      this._focusedWidget = widget
      previous?.dispatchBlur()
      widget?.dispatchFocus()

      this.focusedSizeUnsubscribe?.()
      this.focusedSizeUnsubscribe = widget?.on('sizechange', this.handleTrackedWidgetResize)
    }

    if (windowChanged) {
      this._activeWindow = nextWindow

      this.activeWindowSizeUnsubscribe?.()
      this.activeWindowSizeUnsubscribe = nextWindow?.on('sizechange', this.handleTrackedWidgetResize)
    }

    if (focusChanged || windowChanged) {
      this.refreshBoundsOverlays()
    }

    if (focusChanged) {
      this.emit('focuschange', { type: 'focuschange', app: this, focused: widget })
    }

    if (windowChanged) {
      this.emit('activewindowchange', { type: 'activewindowchange', app: this, activeWindow: nextWindow })
    }
  }

  private readonly pickWidgetAtPointer = (): UIWidget | undefined => {
    this.widgetRegistry.rebuild()
    this.raycaster.setFromCamera(this.pointerInteractionController.pointer, this.camera)

    const widgetMeshes = Array.from(this.widgetRegistry.roots)
    const intersections = this.raycaster.intersectObjects(widgetMeshes, true)
    if (intersections.length === 0) {
      return undefined
    }

    for (const intersection of intersections) {
      if (this.isOverlayIntersection(intersection.object)) {
        continue
      }

      let object: THREE.Object3D | null = intersection.object
      while (object) {
        const widget = this.widgetRegistry.getWidget(object)
        if (widget) {
          if (this.isInteractive(widget)) {
            return widget
          }
          break
        }
        object = object.parent
      }
    }

    return undefined
  }

  private isInteractive(widget: UIWidget): boolean {
    let current: UIWidget | undefined = widget
    while (current) {
      if (!current.enabled) {
        return false
      }
      current = current.parent
    }
    return true
  }

  private isOverlayIntersection(object: THREE.Object3D): boolean {
    let current: THREE.Object3D | null = object
    while (current) {
      if (current.userData['uiOverlay'] === true) {
        return true
      }
      current = current.parent
    }
    return false
  }

  private readonly handleResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.emit('resize', { type: 'resize', app: this })
  }

  private readonly handleWidgetInteraction = (widget: UIWidget | undefined): void => {
    this.setFocus(widget)
  }

  private setDebug(value: boolean): void {
    if (this._debug === value) {
      return
    }
    this._debug = value
    this.fpsOverlay.setVisible(value)
    this.trackingStatusOverlay.setVisible(value)
    this.emit('debugchange', { type: 'debugchange', app: this, debug: value })
  }

  private setTrackingEnabled(value: boolean): void {
    if (this._trackingEnabled === value) {
      return
    }
    this._trackingEnabled = value
    this.trackingStatusOverlay.setEnabled(value)
    this.emit('trackingchange', { type: 'trackingchange', app: this, enabled: value })
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase()
    if (key !== 'd' && key !== 'h') {
      return
    }

    // Ignore the shortcut while the user is typing into a form field.
    const target = event.target as HTMLElement | null
    if (
      target &&
      (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName))
    ) {
      return
    }

    if (key === 'd') {
      this.toggleDebug()
    } else {
      this.toggleTracking()
    }
  }

  private readonly handleTrackedWidgetResize = (): void => {
    this.refreshBoundsOverlays()
  }

  private findContainingWindow(widget: UIWidget | undefined): UIWindow | undefined {
    if (!widget) {
      return undefined
    }

    let current: UIWidget | undefined = widget
    while (current) {
      if (current instanceof UIWindow) {
        return current
      }

      const parent = current.mesh.parent
      if (!parent) {
        break
      }
      current = this.widgetRegistry.getWidget(parent)
    }

    return undefined
  }

  private refreshBoundsOverlays(): void {
    const focusedWidget = this._focusedWidget
    const activeWindow = this._activeWindow
    if (focusedWidget) {
      this.focusedWidgetBounds.setBounds(focusedWidget.width, focusedWidget.height)
      this.focusedWidgetBounds.attachTo(focusedWidget)
    } else {
      this.focusedWidgetBounds.attachTo(undefined)
    }

    if (activeWindow && activeWindow !== focusedWidget) {
      this.activeWindowBounds.setBounds(activeWindow.width, activeWindow.height)
      this.activeWindowBounds.attachTo(activeWindow)
    } else {
      this.activeWindowBounds.attachTo(undefined)
    }
  }

  private readonly animate = (): void => {
    if (!this._running) {
      return
    }

    this.rafId = requestAnimationFrame(this.animate)

    const delta = this.clock.getDelta()

    for (const rootMesh of this.widgetRegistry.roots) {
      const rootWidget = this.widgetRegistry.getWidget(rootMesh)
      if (!rootWidget) {
        continue
      }

      this.topLevelSphereProjector.apply(rootWidget, this.camera, this.sceneOrientation)
    }

    for (const root of this.widgetRegistry.topLevel) {
      root.traverse((widget) => widget.update(delta))
    }

    this.emit('update', { type: 'update', app: this, delta, camera: this.camera })
    this.emit('beforerender', { type: 'beforerender', app: this, delta, camera: this.camera })

    this.renderer.render(this.scene, this.camera)

    this.fpsOverlay.update(delta)

    this.emit('afterrender', { type: 'afterrender', app: this, delta, camera: this.camera })
  }
}
