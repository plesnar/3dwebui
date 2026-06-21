import * as THREE from 'three'
import { UIButton } from './UIButton'
import { createRoundedRectShape } from './RoundedRectShape'
import type { UIRectButtonOptions } from './UIRectButtonOptions'

/**
 * A rectangular button rendered as a procedurally extruded and beveled 3D mesh.
 *
 * The face is a rounded rectangle (sized by the widget `width`/`height`) that is
 * extruded along Z by `thickness` and beveled. The bevel height, offset and
 * smoothness are configurable. Pressing the button reduces its extruded height.
 */
export class UIRectButton extends UIButton {
  private _cornerRadius: number
  private _bevelThickness: number
  private _bevelSize: number
  private _bevelOffset: number
  private _bevelSegments: number

  constructor(options: UIRectButtonOptions = {}) {
    super(options)

    // The super constructor generates an initial geometry using the defaults
    // below (subclass fields are still undefined at that point). Assign the real
    // values and rebuild so any provided bevel options take effect.
    this._cornerRadius = options.cornerRadius ?? 0.08
    this._bevelThickness = options.bevelThickness ?? 0.05
    this._bevelSize = options.bevelSize ?? 0.03
    this._bevelOffset = options.bevelOffset ?? 0
    this._bevelSegments = options.bevelSegments ?? 3

    this.rebuildButtonGeometry()
  }

  protected createButtonGeometry(width: number, height: number, thickness: number): THREE.ExtrudeGeometry {
    const cornerRadius = this._cornerRadius ?? 0.08
    const bevelSize = this._bevelSize ?? 0.03
    const bevelThickness = this._bevelThickness ?? 0.05
    const bevelOffset = this._bevelOffset ?? 0
    const bevelSegments = this._bevelSegments ?? 3

    const bevelEnabled = bevelSegments > 0 && (bevelThickness > 0 || bevelSize > 0)

    // The bevel extends outward from the shape outline by `bevelSize + bevelOffset`.
    // Inset the outline by that amount so the bevel stays inner and the outer
    // footprint matches the requested width/height.
    const outwardBevel = bevelEnabled ? Math.max(0, bevelSize + bevelOffset) : 0
    const inset = Math.min(outwardBevel, width / 2 - 1e-4, height / 2 - 1e-4)
    const shapeWidth = width - 2 * inset
    const shapeHeight = height - 2 * inset
    const shapeRadius = Math.max(0, cornerRadius - inset)

    const shape = createRoundedRectShape(shapeWidth, shapeHeight, shapeRadius)

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      steps: 1,
      curveSegments: 24,
      bevelEnabled,
      bevelThickness,
      bevelSize,
      bevelOffset,
      bevelSegments: Math.max(1, bevelSegments),
    })
    geometry.computeVertexNormals()
    return geometry
  }

  // ── bevel accessors ─────────────────────────────────────────────────────

  public get cornerRadius(): number {
    return this._cornerRadius
  }

  public set cornerRadius(value: number) {
    this._cornerRadius = Math.max(0, value)
    this.rebuildButtonGeometry()
  }

  public get bevelThickness(): number {
    return this._bevelThickness
  }

  public set bevelThickness(value: number) {
    this._bevelThickness = Math.max(0, value)
    this.rebuildButtonGeometry()
  }

  public get bevelSize(): number {
    return this._bevelSize
  }

  public set bevelSize(value: number) {
    this._bevelSize = Math.max(0, value)
    this.rebuildButtonGeometry()
  }

  public get bevelOffset(): number {
    return this._bevelOffset
  }

  public set bevelOffset(value: number) {
    this._bevelOffset = value
    this.rebuildButtonGeometry()
  }

  public get bevelSegments(): number {
    return this._bevelSegments
  }

  public set bevelSegments(value: number) {
    this._bevelSegments = Math.max(1, Math.floor(value))
    this.rebuildButtonGeometry()
  }
}
