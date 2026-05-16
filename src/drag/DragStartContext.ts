import * as THREE from 'three'

export type DragStartContext = {
  camera: THREE.Camera
  ray: THREE.Ray
  pointerClientX: number
  pointerClientY: number
  sceneOrientation: THREE.Quaternion
}
