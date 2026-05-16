import * as THREE from 'three'
import type { DragMoveContext } from './DragMoveContext'
import type { DragStartContext } from './DragStartContext'
import type { UIDragController } from './UIDragController'
import { UIWidget } from '../widgets/UIWidget'

export class SphereDragController implements UIDragController {
  private static readonly RADIUS_PIXELS_TO_UNITS = 0.01

  private readonly sphere = new THREE.Sphere()
  private readonly hitPoint = new THREE.Vector3()
  private readonly cameraWorldPosition = new THREE.Vector3()
  private readonly cachedSceneOrientation = new THREE.Quaternion()
  private readonly sceneInverseOrientation = new THREE.Quaternion()
  private readonly worldDirection = new THREE.Vector3()
  private readonly localDirection = new THREE.Vector3()

  private activeWidget: UIWidget | null = null
  private activeRadius = UIWidget.TOP_LEVEL_BASE_RADIUS
  private lastPointerClientY = 0
  private initialYaw = 0
  private initialPitch = 0
  private initialLogicalX = 0
  private initialLogicalY = 0

  public onDragStart(widget: UIWidget, context: DragStartContext): boolean {
    if (!widget.getTopLevelInApp()) {
      return false
    }

    const logical = widget.getPosition()
    this.activeRadius = Math.max(UIWidget.TOP_LEVEL_MIN_RADIUS, UIWidget.TOP_LEVEL_BASE_RADIUS + logical.z)
    this.initialLogicalX = logical.x
    this.initialLogicalY = logical.y

    context.camera.getWorldPosition(this.cameraWorldPosition)
    this.cachedSceneOrientation.copy(context.sceneOrientation)
    this.sphere.center.copy(this.cameraWorldPosition)
    this.sphere.radius = this.activeRadius
    this.lastPointerClientY = context.pointerClientY

    if (!context.ray.intersectSphere(this.sphere, this.hitPoint)) {
      return false
    }

    this.worldDirection.subVectors(this.hitPoint, this.cameraWorldPosition).normalize()
    this.sceneInverseOrientation.copy(this.cachedSceneOrientation).invert()
    this.localDirection.copy(this.worldDirection).applyQuaternion(this.sceneInverseOrientation)

    this.initialYaw = Math.atan2(this.localDirection.x, -this.localDirection.z)
    this.initialPitch = Math.asin(THREE.MathUtils.clamp(this.localDirection.y, -1, 1))

    this.activeWidget = widget
    return true
  }

  public onDragMove(widget: UIWidget, context: DragMoveContext): void {
    if (this.activeWidget !== widget) {
      return
    }

    const dy = context.pointerClientY - this.lastPointerClientY
    this.lastPointerClientY = context.pointerClientY

    if (context.shiftKey) {
      this.activeRadius = THREE.MathUtils.clamp(
        this.activeRadius + dy * SphereDragController.RADIUS_PIXELS_TO_UNITS,
        UIWidget.TOP_LEVEL_MIN_RADIUS,
        UIWidget.TOP_LEVEL_MAX_RADIUS,
      )
    }

    this.sphere.radius = this.activeRadius

    if (!context.ray.intersectSphere(this.sphere, this.hitPoint)) {
      return
    }

    this.worldDirection.subVectors(this.hitPoint, this.cameraWorldPosition).normalize()
    this.sceneInverseOrientation.copy(this.cachedSceneOrientation).invert()
    this.localDirection.copy(this.worldDirection).applyQuaternion(this.sceneInverseOrientation)

    const yaw = Math.atan2(this.localDirection.x, -this.localDirection.z)
    const pitch = Math.asin(THREE.MathUtils.clamp(this.localDirection.y, -1, 1))

    const clampedPitch = THREE.MathUtils.clamp(
      pitch,
      -UIWidget.TOP_LEVEL_MAX_PITCH,
      UIWidget.TOP_LEVEL_MAX_PITCH,
    )

    const clampedInitialPitch = THREE.MathUtils.clamp(
      this.initialPitch,
      -UIWidget.TOP_LEVEL_MAX_PITCH,
      UIWidget.TOP_LEVEL_MAX_PITCH,
    )

    const logicalX = this.initialLogicalX - (yaw - this.initialYaw) / UIWidget.TOP_LEVEL_ANGULAR_SCALE
    const logicalY = this.initialLogicalY + (clampedPitch - clampedInitialPitch) / UIWidget.TOP_LEVEL_ANGULAR_SCALE
    const logicalZ = this.activeRadius - UIWidget.TOP_LEVEL_BASE_RADIUS

    widget.setPosition(logicalX, logicalY, logicalZ)
  }

  public onDragEnd(widget: UIWidget): void {
    if (this.activeWidget === widget) {
      this.activeWidget = null
      this.lastPointerClientY = 0
    }
  }
}
