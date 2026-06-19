import * as THREE from 'three'
import { CameraOrbitController } from './CameraOrbitController'
import { CornerBoundsOverlay } from './CornerBoundsOverlay'
import { TopLevelSphereProjector } from './TopLevelSphereProjector'
import { PointerInteractionController } from './PointerInteractionController'
import { WidgetRegistry } from './WidgetRegistry'
import type { UIWidget } from '../widgets/UIWidget'
import { UIWindow } from '../widgets/UIWindow'

export class UIApp {
  private readonly scene: THREE.Scene
  private readonly camera: THREE.PerspectiveCamera
  private readonly renderer: THREE.WebGLRenderer
  private readonly raycaster: THREE.Raycaster
  private readonly sceneOrientation = new THREE.Quaternion()
  private readonly cameraOrbitController: CameraOrbitController
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
  private focusedWidget?: UIWidget
  private activeWindow?: UIWindow
  private readonly updateCallbacks: Array<(camera: THREE.PerspectiveCamera) => void> = []

  public get sceneRoot(): THREE.Scene {
    return this.scene
  }

  public get activeCamera(): THREE.PerspectiveCamera {
    return this.camera
  }

  public get orbitController(): CameraOrbitController {
    return this.cameraOrbitController
  }

  public registerUpdateCallback(fn: (camera: THREE.PerspectiveCamera) => void): void {
    this.updateCallbacks.push(fn)
  }

  constructor() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x111827)

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100)
    this.camera.position.set(0, 0, 5)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    document.body.appendChild(this.renderer.domElement)

    this.raycaster = new THREE.Raycaster()
    window.addEventListener('resize', this.handleResize)

    this.pointerInteractionController = new PointerInteractionController(
      this.renderer.domElement,
      this.camera,
      this.raycaster,
      this.pickWidgetAtPointer,
      this.handleWidgetInteraction,
      (locked) => this.cameraOrbitController.setBlocked(locked),
      () => this.sceneOrientation,
    )

    this.cameraOrbitController = new CameraOrbitController(
      this.renderer.domElement,
      (orientation) => this.camera.quaternion.copy(orientation),
    )

    this.animate()
  }

  public add(widget: UIWidget): void {
    this.widgetRegistry.add(widget, this.scene)
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
          return widget
        }
        object = object.parent
      }
    }

    return undefined
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
  }

  private readonly handleWidgetInteraction = (widget: UIWidget | undefined): void => {
    this.focusedWidget = widget
    this.activeWindow = this.findContainingWindow(widget)
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
    const focusedWidget = this.focusedWidget
    const activeWindow = this.activeWindow

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
    requestAnimationFrame(this.animate)

    for (const rootMesh of this.widgetRegistry.roots) {
      const rootWidget = this.widgetRegistry.getWidget(rootMesh)
      if (!rootWidget) {
        continue
      }

      this.topLevelSphereProjector.apply(rootWidget, this.camera, this.sceneOrientation)
    }

    for (const cb of this.updateCallbacks) {
      cb(this.camera)
    }

    this.renderer.render(this.scene, this.camera)
  }
}
