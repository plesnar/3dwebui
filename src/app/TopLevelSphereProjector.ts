import * as THREE from 'three'
import { UIWidget } from '../widgets/UIWidget'

export class TopLevelSphereProjector {
  private readonly sphereForwardLocal = new THREE.Vector3(0, 0, -1)
  private readonly sphereDirectionLocal = new THREE.Vector3()
  private readonly sphereDirectionWorld = new THREE.Vector3()
  private readonly cameraWorldPosition = new THREE.Vector3()

  public apply(widget: UIWidget, camera: THREE.PerspectiveCamera, sceneOrientation: THREE.Quaternion): void {
    if (!widget.getTopLevelInApp()) {
      return
    }

    const logical = widget.getPosition()
    const yaw = logical.x * UIWidget.TOP_LEVEL_ANGULAR_SCALE
    const unclampedPitch = logical.y * UIWidget.TOP_LEVEL_ANGULAR_SCALE
    const pitch = THREE.MathUtils.clamp(
      unclampedPitch,
      -UIWidget.TOP_LEVEL_MAX_PITCH,
      UIWidget.TOP_LEVEL_MAX_PITCH,
    )
    const radius = Math.max(UIWidget.TOP_LEVEL_MIN_RADIUS, UIWidget.TOP_LEVEL_BASE_RADIUS + logical.z)

    this.sphereDirectionLocal
      .copy(this.sphereForwardLocal)
      .applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw)

    this.sphereDirectionWorld.crossVectors(this.sphereDirectionLocal, THREE.Object3D.DEFAULT_UP)
    if (this.sphereDirectionWorld.lengthSq() > 0) {
      this.sphereDirectionWorld.normalize()
      this.sphereDirectionLocal.applyAxisAngle(this.sphereDirectionWorld, pitch)
    }

    this.sphereDirectionLocal.normalize()
    this.sphereDirectionWorld.copy(this.sphereDirectionLocal).applyQuaternion(sceneOrientation)
    camera.getWorldPosition(this.cameraWorldPosition)

    widget.mesh.position.copy(this.cameraWorldPosition).addScaledVector(this.sphereDirectionWorld, radius)
    widget.mesh.lookAt(this.cameraWorldPosition)
  }
}
