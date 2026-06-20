import * as THREE from 'three'
import type { UIWidget } from '../widgets/UIWidget'

type OverlayStyle = {
  color: number
  opacity?: number
  lineWidth?: number
  padding?: number
  zOffset?: number
  cornerRatio?: number
}

export class CornerBoundsOverlay {
  private readonly lineSegments: THREE.LineSegments
  private readonly zOffset: number
  private attachedTo?: UIWidget

  constructor(style: OverlayStyle) {
    const material = new THREE.LineBasicMaterial({
      color: style.color,
      transparent: true,
      opacity: style.opacity ?? 0.7,
      linewidth: style.lineWidth ?? 1,
      depthTest: true,
      depthWrite: false,
    })

    this.zOffset = style.zOffset ?? 0.006

    const geometry = new THREE.BufferGeometry()
    this.lineSegments = new THREE.LineSegments(geometry, material)
    this.lineSegments.visible = false
    this.lineSegments.renderOrder = 1000
    this.lineSegments.position.z = this.zOffset
    this.lineSegments.userData['uiOverlay'] = true
    this.lineSegments.frustumCulled = false

    this.updateGeometry(1, 1, 0, style.padding ?? 0.04, style.cornerRatio ?? 0.2)
  }

  public attachTo(widget?: UIWidget): void {
    if (this.attachedTo === widget) {
      this.lineSegments.visible = widget !== undefined
      return
    }

    if (this.attachedTo) {
      this.attachedTo.mesh.remove(this.lineSegments)
    }

    this.attachedTo = widget
    if (!widget) {
      this.lineSegments.visible = false
      return
    }

    widget.mesh.add(this.lineSegments)
    this.lineSegments.visible = true
  }

  /**
   * Updates the bracket geometry. When `depth` is greater than zero the overlay
   * wraps a 3D box (brackets on all eight corners); otherwise it draws the flat
   * four-corner brackets used for plane widgets.
   */
  public setBounds(width: number, height: number, depth = 0, padding = 0.04, cornerRatio = 0.2): void {
    this.updateGeometry(width, height, depth, padding, cornerRatio)
  }

  public dispose(): void {
    this.attachTo(undefined)
    this.lineSegments.geometry.dispose()
    ;(this.lineSegments.material as THREE.Material).dispose()
  }

  private updateGeometry(width: number, height: number, depth: number, padding: number, cornerRatio: number): void {
    const paddedWidth = Math.max(0.01, width + padding * 2)
    const paddedHeight = Math.max(0.01, height + padding * 2)
    const halfW = paddedWidth / 2
    const halfH = paddedHeight / 2

    const horizontalLen = Math.max(0.02, Math.min(paddedWidth * Math.max(0.05, cornerRatio), paddedWidth / 2))
    const verticalLen = Math.max(0.02, Math.min(paddedHeight * Math.max(0.05, cornerRatio), paddedHeight / 2))

    const points: number[] = []
    const addSegment = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): void => {
      points.push(x1, y1, z1, x2, y2, z2)
    }

    if (depth > 1e-4) {
      // 3D box: brackets on all eight corners, spanning the extruded depth.
      this.lineSegments.position.z = 0
      const zMin = -padding
      const zMax = depth + padding
      const paddedDepth = zMax - zMin
      const depthLen = Math.max(0.02, Math.min(paddedDepth * Math.max(0.05, cornerRatio), paddedDepth / 2))

      for (const x of [-halfW, halfW]) {
        for (const y of [-halfH, halfH]) {
          for (const z of [zMin, zMax]) {
            const sx = x < 0 ? 1 : -1
            const sy = y < 0 ? 1 : -1
            const sz = z === zMin ? 1 : -1
            addSegment(x, y, z, x + sx * horizontalLen, y, z)
            addSegment(x, y, z, x, y + sy * verticalLen, z)
            addSegment(x, y, z, x, y, z + sz * depthLen)
          }
        }
      }
    } else {
      // Flat plane: four corner brackets at z = 0, offset forward by zOffset.
      this.lineSegments.position.z = this.zOffset

      addSegment(-halfW, halfH, 0, -halfW + horizontalLen, halfH, 0)
      addSegment(-halfW, halfH, 0, -halfW, halfH - verticalLen, 0)

      addSegment(halfW, halfH, 0, halfW - horizontalLen, halfH, 0)
      addSegment(halfW, halfH, 0, halfW, halfH - verticalLen, 0)

      addSegment(-halfW, -halfH, 0, -halfW + horizontalLen, -halfH, 0)
      addSegment(-halfW, -halfH, 0, -halfW, -halfH + verticalLen, 0)

      addSegment(halfW, -halfH, 0, halfW - horizontalLen, -halfH, 0)
      addSegment(halfW, -halfH, 0, halfW, -halfH + verticalLen, 0)
    }

    this.lineSegments.geometry.dispose()
    this.lineSegments.geometry = new THREE.BufferGeometry()
    this.lineSegments.geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    this.lineSegments.geometry.computeBoundingSphere()
  }
}