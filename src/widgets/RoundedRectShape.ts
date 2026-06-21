import * as THREE from 'three'

/**
 * Per-corner radii for a rounded rectangle, in shape-space units.
 * Each value is clamped to the available half-width/half-height.
 */
export type CornerRadii = {
  topLeft: number
  topRight: number
  bottomRight: number
  bottomLeft: number
}

/**
 * Builds a centred rounded-rectangle {@link THREE.Shape}.
 *
 * `radius` may be a single number (uniform corners) or a {@link CornerRadii}
 * object selecting an independent radius per corner. Square corners (radius 0)
 * let two shapes meet flush — used by {@link UIWindow} so its content box and
 * title-bar box share a straight divider while the outer silhouette stays round.
 */
export function createRoundedRectShape(
  width: number,
  height: number,
  radius: number | CornerRadii,
): THREE.Shape {
  const halfWidth = width / 2
  const halfHeight = height / 2

  const radii = typeof radius === 'number'
    ? { topLeft: radius, topRight: radius, bottomRight: radius, bottomLeft: radius }
    : radius

  const clamp = (value: number): number => Math.min(Math.max(0, value), halfWidth, halfHeight)
  const tl = clamp(radii.topLeft)
  const tr = clamp(radii.topRight)
  const br = clamp(radii.bottomRight)
  const bl = clamp(radii.bottomLeft)

  const shape = new THREE.Shape()
  shape.moveTo(-halfWidth + bl, -halfHeight)
  shape.lineTo(halfWidth - br, -halfHeight)
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + br)
  shape.lineTo(halfWidth, halfHeight - tr)
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - tr, halfHeight)
  shape.lineTo(-halfWidth + tl, halfHeight)
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - tl)
  shape.lineTo(-halfWidth, -halfHeight + bl)
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + bl, -halfHeight)
  return shape
}
