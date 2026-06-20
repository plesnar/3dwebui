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
  private attachedTo?: UIWidget

  constructor(style: OverlayStyle) {
    const material = new THREE.LineBasicMaterial({
      color: style.color,
      transparent: true,
      opacity: style.opacity ?? 0.7,
      linewidth: style.lineWidth ?? 1,
      depthTest: false,
    })

    const geometry = new THREE.BufferGeometry()
    this.lineSegments = new THREE.LineSegments(geometry, material)
    this.lineSegments.visible = false
    this.lineSegments.renderOrder = 1000
    this.lineSegments.position.z = style.zOffset ?? 0.006
    this.lineSegments.userData['uiOverlay'] = true
    this.lineSegments.frustumCulled = false

    this.updateGeometry(1, 1, style.padding ?? 0.04, style.cornerRatio ?? 0.2)
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

  public setBounds(width: number, height: number, padding = 0.04, cornerRatio = 0.2): void {
    this.updateGeometry(width, height, padding, cornerRatio)
  }

  public dispose(): void {
    this.attachTo(undefined)
    this.lineSegments.geometry.dispose()
    ;(this.lineSegments.material as THREE.Material).dispose()
  }

  private updateGeometry(width: number, height: number, padding: number, cornerRatio: number): void {
    const paddedWidth = Math.max(0.01, width + padding * 2)
    const paddedHeight = Math.max(0.01, height + padding * 2)
    const halfW = paddedWidth / 2
    const halfH = paddedHeight / 2

    const horizontalLen = Math.max(0.02, Math.min(paddedWidth * Math.max(0.05, cornerRatio), paddedWidth / 2))
    const verticalLen = Math.max(0.02, Math.min(paddedHeight * Math.max(0.05, cornerRatio), paddedHeight / 2))

    const points: number[] = []
    const addSegment = (x1: number, y1: number, x2: number, y2: number): void => {
      points.push(x1, y1, 0, x2, y2, 0)
    }

    addSegment(-halfW, halfH, -halfW + horizontalLen, halfH)
    addSegment(-halfW, halfH, -halfW, halfH - verticalLen)

    addSegment(halfW, halfH, halfW - horizontalLen, halfH)
    addSegment(halfW, halfH, halfW, halfH - verticalLen)

    addSegment(-halfW, -halfH, -halfW + horizontalLen, -halfH)
    addSegment(-halfW, -halfH, -halfW, -halfH + verticalLen)

    addSegment(halfW, -halfH, halfW - horizontalLen, -halfH)
    addSegment(halfW, -halfH, halfW, -halfH + verticalLen)

    this.lineSegments.geometry.dispose()
    this.lineSegments.geometry = new THREE.BufferGeometry()
    this.lineSegments.geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    this.lineSegments.geometry.computeBoundingSphere()
  }
}