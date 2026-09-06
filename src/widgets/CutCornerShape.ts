import * as THREE from 'three'

export function createCutCornerShape(width: number, height: number, cornerCut: number): THREE.Shape {
  const halfWidth = Math.max(0, width) / 2
  const halfHeight = Math.max(0, height) / 2
  const cut = Math.max(0, Math.min(cornerCut, halfWidth, halfHeight))
  const shape = new THREE.Shape()
  shape.moveTo(-halfWidth + cut * 0.5, halfHeight)
  shape.lineTo(halfWidth - cut, halfHeight)
  shape.lineTo(halfWidth, halfHeight - cut)
  shape.lineTo(halfWidth, -halfHeight + cut * 0.5)
  shape.lineTo(halfWidth - cut * 0.5, -halfHeight)
  shape.lineTo(-halfWidth + cut, -halfHeight)
  shape.lineTo(-halfWidth, -halfHeight + cut)
  shape.lineTo(-halfWidth, halfHeight - cut * 0.5)
  shape.closePath()
  return shape
}