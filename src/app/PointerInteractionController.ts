import * as THREE from 'three'
import type { UIWidget } from '../widgets/UIWidget'

type PickWidgetAtPointer = () => UIWidget | undefined
type WidgetInteractionHandler = (widget: UIWidget | undefined) => void
type CameraInteractionLockHandler = (locked: boolean) => void

export class PointerInteractionController {
  private static readonly DRAG_THRESHOLD_PX = 4

  public readonly pointer = new THREE.Vector2()
  private activePointerId: number | null = null
  private pointerDownWidget: UIWidget | null = null
  private activeDragWidget: UIWidget | null = null
  private readonly pointerDownPosition = new THREE.Vector2()
  private pointerMovedBeyondThreshold = false

  private readonly domElement: HTMLElement
  private readonly camera: THREE.PerspectiveCamera
  private readonly raycaster: THREE.Raycaster
  private readonly pickWidgetAtPointer: PickWidgetAtPointer
  private readonly onWidgetInteracted?: WidgetInteractionHandler
  private readonly onCameraInteractionLockChange?: CameraInteractionLockHandler
  private readonly getSceneOrientation?: () => THREE.Quaternion

  constructor(
    domElement: HTMLElement,
    camera: THREE.PerspectiveCamera,
    raycaster: THREE.Raycaster,
    pickWidgetAtPointer: PickWidgetAtPointer,
    onWidgetInteracted?: WidgetInteractionHandler,
    onCameraInteractionLockChange?: CameraInteractionLockHandler,
    getSceneOrientation?: () => THREE.Quaternion,
  ) {
    this.domElement = domElement
    this.camera = camera
    this.raycaster = raycaster
    this.pickWidgetAtPointer = pickWidgetAtPointer
    this.onWidgetInteracted = onWidgetInteracted
    this.onCameraInteractionLockChange = onCameraInteractionLockChange
    this.getSceneOrientation = getSceneOrientation

    this.domElement.addEventListener('pointerdown', this.handlePointerDown)
    this.domElement.addEventListener('pointermove', this.handlePointerMove)
    this.domElement.addEventListener('pointerup', this.handlePointerUp)
    this.domElement.addEventListener('pointercancel', this.handlePointerCancel)
    this.domElement.addEventListener('pointerleave', this.handlePointerCancel)
  }

  public dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.handlePointerDown)
    this.domElement.removeEventListener('pointermove', this.handlePointerMove)
    this.domElement.removeEventListener('pointerup', this.handlePointerUp)
    this.domElement.removeEventListener('pointercancel', this.handlePointerCancel)
    this.domElement.removeEventListener('pointerleave', this.handlePointerCancel)
  }

  private updatePointerFromEvent(event: PointerEvent): void {
    const rect = this.domElement.getBoundingClientRect()
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  private resetInteractionState(): void {
    this.activePointerId = null
    this.pointerDownWidget = null
    this.activeDragWidget = null
    this.pointerMovedBeyondThreshold = false
    this.onCameraInteractionLockChange?.(false)
  }

  private handlePointerDown = (event: PointerEvent): void => {
    if (this.activePointerId !== null) {
      return
    }

    this.activePointerId = event.pointerId
    this.pointerDownPosition.set(event.clientX, event.clientY)
    this.pointerMovedBeyondThreshold = false

    this.updatePointerFromEvent(event)
    this.pointerDownWidget = this.pickWidgetAtPointer() ?? null
    this.onWidgetInteracted?.(this.pointerDownWidget ?? undefined)
    this.onCameraInteractionLockChange?.(this.pointerDownWidget !== null)

    if (this.pointerDownWidget) {
      const controller = this.pointerDownWidget.getDragController()
      if (!controller) {
        return
      }

      this.raycaster.setFromCamera(this.pointer, this.camera)
      const started = controller.onDragStart(this.pointerDownWidget, {
        camera: this.camera,
        ray: this.raycaster.ray,
        pointerClientX: event.clientX,
        pointerClientY: event.clientY,
        sceneOrientation: this.getSceneOrientation?.() ?? new THREE.Quaternion(),
      })

      if (!started) {
        return
      }

      this.activeDragWidget = this.pointerDownWidget
      this.domElement.setPointerCapture(event.pointerId)
    }
  }

  private handlePointerMove = (event: PointerEvent): void => {
    if (this.activePointerId !== event.pointerId) {
      return
    }

    this.updatePointerFromEvent(event)

    if (!this.pointerMovedBeyondThreshold) {
      const dx = event.clientX - this.pointerDownPosition.x
      const dy = event.clientY - this.pointerDownPosition.y
      const dragDistanceSquared = dx * dx + dy * dy
      const thresholdSquared = PointerInteractionController.DRAG_THRESHOLD_PX * PointerInteractionController.DRAG_THRESHOLD_PX
      this.pointerMovedBeyondThreshold = dragDistanceSquared > thresholdSquared
    }

    if (!this.pointerMovedBeyondThreshold) {
      return
    }

    const dragWidget = this.activeDragWidget
    if (!dragWidget) {
      return
    }

    const controller = dragWidget.getDragController()
    if (!controller) {
      return
    }

    this.raycaster.setFromCamera(this.pointer, this.camera)
    controller.onDragMove(dragWidget, {
      ray: this.raycaster.ray,
      pointerClientX: event.clientX,
      pointerClientY: event.clientY,
      shiftKey: event.shiftKey,
    })
  }

  private handlePointerUp = (event: PointerEvent): void => {
    if (this.activePointerId !== event.pointerId) {
      return
    }

    this.updatePointerFromEvent(event)

    if (this.domElement.hasPointerCapture(event.pointerId)) {
      this.domElement.releasePointerCapture(event.pointerId)
    }

    const dragWidget = this.activeDragWidget
    if (dragWidget) {
      dragWidget.getDragController()?.onDragEnd(dragWidget)
    }

    if (!this.pointerMovedBeyondThreshold && this.pointerDownWidget) {
      const releasedWidget = this.pickWidgetAtPointer()
      if (releasedWidget === this.pointerDownWidget) {
        this.pointerDownWidget.triggerClick()
      }
    }

    this.resetInteractionState()
  }

  private handlePointerCancel = (event: PointerEvent): void => {
    if (this.activePointerId !== event.pointerId) {
      return
    }

    if (this.domElement.hasPointerCapture(event.pointerId)) {
      this.domElement.releasePointerCapture(event.pointerId)
    }

    const dragWidget = this.activeDragWidget
    if (dragWidget) {
      dragWidget.getDragController()?.onDragEnd(dragWidget)
    }

    this.resetInteractionState()
  }
}
