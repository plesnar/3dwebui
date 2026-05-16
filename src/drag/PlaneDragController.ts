import * as THREE from 'three'
import type { DragMoveContext } from './DragMoveContext'
import type { DragStartContext } from './DragStartContext'
import type { UIDragController } from './UIDragController'
import type { UIWidget } from '../widgets/UIWidget'

export class PlaneDragController implements UIDragController {
  private readonly dragPlane = new THREE.Plane()
  private readonly dragHitPoint = new THREE.Vector3()
  private readonly dragStartHitPoint = new THREE.Vector3()
  private readonly dragStartWidgetPosition = new THREE.Vector3()
  private readonly pointerDelta = new THREE.Vector3()
  private readonly worldTarget = new THREE.Vector3()
  private readonly worldNormal = new THREE.Vector3()
  private readonly parentWorldTarget = new THREE.Vector3()
  private readonly parentInverseQuaternion = new THREE.Quaternion()
  private readonly parentScale = new THREE.Vector3()

  private activeWidget: UIWidget | null = null

  public onDragStart(widget: UIWidget, context: DragStartContext): boolean {
    const mesh = widget.mesh
    const parent = mesh.parent
    if (!parent) {
      return false
    }

    context.camera.getWorldDirection(this.worldNormal)
    mesh.getWorldPosition(this.dragStartWidgetPosition)
    this.dragPlane.setFromNormalAndCoplanarPoint(this.worldNormal, this.dragStartWidgetPosition)

    if (!context.ray.intersectPlane(this.dragPlane, this.dragStartHitPoint)) {
      return false
    }

    this.activeWidget = widget
    return true
  }

  public onDragMove(widget: UIWidget, context: DragMoveContext): void {
    if (this.activeWidget !== widget) {
      return
    }

    const mesh = widget.mesh
    const parent = mesh.parent
    if (!parent) {
      return
    }

    if (!context.ray.intersectPlane(this.dragPlane, this.dragHitPoint)) {
      return
    }

    this.pointerDelta.subVectors(this.dragHitPoint, this.dragStartHitPoint)
    this.worldTarget.copy(this.dragStartWidgetPosition).add(this.pointerDelta)

    parent.getWorldPosition(this.parentWorldTarget)
    parent.getWorldQuaternion(this.parentInverseQuaternion).invert()
    parent.getWorldScale(this.parentScale)

    this.worldTarget.sub(this.parentWorldTarget)
    this.worldTarget.applyQuaternion(this.parentInverseQuaternion)

    this.worldTarget.x /= this.parentScale.x
    this.worldTarget.y /= this.parentScale.y
    this.worldTarget.z /= this.parentScale.z

    mesh.position.copy(this.worldTarget)
  }

  public onDragEnd(widget: UIWidget): void {
    if (this.activeWidget === widget) {
      this.activeWidget = null
    }
  }
}
