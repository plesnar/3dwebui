import * as THREE from 'three'

type OrientationChangeHandler = (orientation: THREE.Quaternion) => void
type PinchActivePredicate = () => boolean
type PinchZoomHandler = (delta: number) => void

export class CameraOrbitController {
  private static readonly DRAG_SENSITIVITY = 0.005
  private static readonly WHEEL_SENSITIVITY = 0.002
  private static readonly PINCH_WHEEL_SENSITIVITY = 0.01
  private static readonly PINCH_TOUCH_SENSITIVITY = 0.01

  private yaw = 0
  private pitch = 0
  private headYawOffset = 0
  private headPitchOffset = 0
  private isBlocked = false
  private pinchDistance: number | null = null

  private readonly activePointers = new Map<number, { x: number; y: number }>()
  private readonly orientation = new THREE.Quaternion()

  private readonly domElement: HTMLElement
  private readonly onOrientationChange: OrientationChangeHandler
  private readonly isPinchActive?: PinchActivePredicate
  private readonly onPinchZoom?: PinchZoomHandler

  constructor(
    domElement: HTMLElement,
    onOrientationChange: OrientationChangeHandler,
    isPinchActive?: PinchActivePredicate,
    onPinchZoom?: PinchZoomHandler,
  ) {
    this.domElement = domElement
    this.onOrientationChange = onOrientationChange
    this.isPinchActive = isPinchActive
    this.onPinchZoom = onPinchZoom

    this.domElement.style.touchAction = 'none'
    this.domElement.addEventListener('pointerdown', this.handlePointerDown)
    this.domElement.addEventListener('pointermove', this.handlePointerMove)
    this.domElement.addEventListener('pointerup', this.handlePointerUp)
    this.domElement.addEventListener('pointercancel', this.handlePointerCancel)
    this.domElement.addEventListener('wheel', this.handleWheel, { passive: false })
  }

  public setBlocked(blocked: boolean): void {
    this.isBlocked = blocked
    if (blocked) {
      for (const [id] of this.activePointers) {
        if (this.domElement.hasPointerCapture(id)) {
          this.domElement.releasePointerCapture(id)
        }
      }
      this.activePointers.clear()
      this.pinchDistance = null
    }
  }

  /** Called each frame by HeadGazeCameraController to compose head/gaze offset with orbit rotation. */
  public setHeadOffset(yawOffset: number, pitchOffset: number): void {
    this.headYawOffset = yawOffset
    this.headPitchOffset = pitchOffset
    this.recompute()
  }

  public dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.handlePointerDown)
    this.domElement.removeEventListener('pointermove', this.handlePointerMove)
    this.domElement.removeEventListener('pointerup', this.handlePointerUp)
    this.domElement.removeEventListener('pointercancel', this.handlePointerCancel)
    this.domElement.removeEventListener('wheel', this.handleWheel)
  }

  private handlePointerDown = (event: PointerEvent): void => {
    if (this.isBlocked || this.activePointers.size >= 2) {
      return
    }
    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    this.domElement.setPointerCapture(event.pointerId)

    // Once two fingers are down, seed the pinch distance for touch zoom.
    this.pinchDistance = this.activePointers.size === 2 ? this.measurePointerDistance() : null
  }

  private handlePointerMove = (event: PointerEvent): void => {
    const prev = this.activePointers.get(event.pointerId)
    if (!prev) {
      return
    }

    const dx = event.clientX - prev.x
    const dy = event.clientY - prev.y
    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

    // With two fingers, a change in finger distance zooms the focused widget
    // instead of rotating the camera.
    if (this.activePointers.size === 2) {
      const distance = this.measurePointerDistance()
      const previousDistance = this.pinchDistance
      this.pinchDistance = distance

      if (previousDistance !== null && this.isPinchActive?.()) {
        // Spreading fingers (zoom in) brings the widget closer (negative delta).
        const delta = (previousDistance - distance) * CameraOrbitController.PINCH_TOUCH_SENSITIVITY
        this.onPinchZoom?.(delta)
        return
      }
    }

    // With two fingers, each contributes half so total speed stays consistent
    const scale = this.activePointers.size === 2 ? 0.5 : 1
    this.applyDelta(dx * scale, dy * scale)
  }

  private measurePointerDistance(): number {
    const points = Array.from(this.activePointers.values())
    if (points.length < 2) {
      return 0
    }
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
  }

  private handlePointerUp = (event: PointerEvent): void => {
    if (!this.activePointers.has(event.pointerId)) {
      return
    }
    if (this.domElement.hasPointerCapture(event.pointerId)) {
      this.domElement.releasePointerCapture(event.pointerId)
    }
    this.activePointers.delete(event.pointerId)
    this.pinchDistance = null
  }

  private handlePointerCancel = (event: PointerEvent): void => {
    if (!this.activePointers.has(event.pointerId)) {
      return
    }
    if (this.domElement.hasPointerCapture(event.pointerId)) {
      this.domElement.releasePointerCapture(event.pointerId)
    }
    this.activePointers.delete(event.pointerId)
    this.pinchDistance = null
  }

  private handleWheel = (event: WheelEvent): void => {
    event.preventDefault()
    if (this.isBlocked) {
      return
    }

    // Trackpad pinch arrives as a ctrl-modified wheel event; route it to widget
    // depth zoom when a widget is the active pinch target.
    if (event.ctrlKey && this.isPinchActive?.()) {
      // Pinch out (zoom in) reports a negative deltaY, moving the widget closer.
      this.onPinchZoom?.(event.deltaY * CameraOrbitController.PINCH_WHEEL_SENSITIVITY)
      return
    }

    this.yaw -= event.deltaX * CameraOrbitController.WHEEL_SENSITIVITY
    this.pitch -= event.deltaY * CameraOrbitController.WHEEL_SENSITIVITY
    this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI / 2, Math.PI / 2)
    this.recompute()
  }

  private applyDelta(dx: number, dy: number): void {
    this.yaw -= dx * CameraOrbitController.DRAG_SENSITIVITY
    this.pitch -= dy * CameraOrbitController.DRAG_SENSITIVITY
    this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI / 2, Math.PI / 2)
    this.recompute()
  }

  private recompute(): void {
    const totalPitch = THREE.MathUtils.clamp(
      this.pitch + this.headPitchOffset,
      -Math.PI / 2,
      Math.PI / 2,
    )
    this.orientation.setFromEuler(
      new THREE.Euler(totalPitch, this.yaw + this.headYawOffset, 0, 'YXZ'),
    )
    this.onOrientationChange(this.orientation)
  }
}
