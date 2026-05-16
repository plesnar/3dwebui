import * as THREE from 'three'

export type DragMoveContext = {
  ray: THREE.Ray
  pointerClientX: number
  pointerClientY: number
  shiftKey: boolean
}
