import * as THREE from 'three'

type OrientationChangeHandler = (orientation: THREE.Quaternion) => void

export class CameraOrbitController {
  private static readonly DRAG_SENSITIVITY = 0.005
  private static readonly WHEEL_SENSITIVITY = 0.002

  private yaw = 0
  private pitch = 0
  private isBlocked = false

  private readonly activePointers = new Map<number, { x: number; y: number }>()
  private readonly orientation = new THREE.Quaternion()

  private readonly domElement: HTMLElement
  private readonly onOrientationChange: OrientationChangeHandler

  constructor(domElement: HTMLElement, onOrientationChange: OrientationChangeHandler) {
    this.domElement = domElement
    this.onOrientationChange = onOrientationChange

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
    }
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
  }

  private handlePointerMove = (event: PointerEvent): void => {
    const prev = this.activePointers.get(event.pointerId)
    if (!prev) {
      return
    }

    const dx = event.clientX - prev.x
    const dy = event.clientY - prev.y
    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

    // With two fingers, each contributes half so total speed stays consistent
    const scale = this.activePointers.size === 2 ? 0.5 : 1
    this.applyDelta(dx * scale, dy * scale)
  }

  private handlePointerUp = (event: PointerEvent): void => {
    if (!this.activePointers.has(event.pointerId)) {
      return
    }
    if (this.domElement.hasPointerCapture(event.pointerId)) {
      this.domElement.releasePointerCapture(event.pointerId)
    }
    this.activePointers.delete(event.pointerId)
  }

  private handlePointerCancel = (event: PointerEvent): void => {
    if (!this.activePointers.has(event.pointerId)) {
      return
    }
    if (this.domElement.hasPointerCapture(event.pointerId)) {
      this.domElement.releasePointerCapture(event.pointerId)
    }
    this.activePointers.delete(event.pointerId)
  }

  private handleWheel = (event: WheelEvent): void => {
    event.preventDefault()
    if (this.isBlocked) {
      return
    }
    this.yaw -= event.deltaX * CameraOrbitController.WHEEL_SENSITIVITY
    this.pitch -= event.deltaY * CameraOrbitController.WHEEL_SENSITIVITY
    this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI / 2, Math.PI / 2)
    this.orientation.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'))
    this.onOrientationChange(this.orientation)
  }

  private applyDelta(dx: number, dy: number): void {
    this.yaw -= dx * CameraOrbitController.DRAG_SENSITIVITY
    this.pitch -= dy * CameraOrbitController.DRAG_SENSITIVITY
    this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI / 2, Math.PI / 2)
    this.orientation.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'))
    this.onOrientationChange(this.orientation)
  }
}
