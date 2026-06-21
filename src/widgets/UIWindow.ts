import * as THREE from 'three'
import { Brush, Evaluator, ADDITION, SUBTRACTION } from 'three-bvh-csg'
import { UIWidget } from './UIWidget'
import { UILabel } from './UILabel'
import { UIRectButton } from './UIRectButton'
import { createRoundedRectShape, type CornerRadii } from './RoundedRectShape'
import type { UIWindowOptions } from './WindowOptions'

/**
 * A top-level window rendered as a single 3D extruded, rounded-beveled box.
 *
 * The window body is one rounded box. A smaller rounded title-bar box, inset
 * from the body edges by `titleBarMargin`, is fused into the body via a boolean
 * operation: when `titleBarElevation` is positive the title bar is *added* as a
 * raised pad; when negative it is *subtracted* as a recessed pocket. The result
 * is one compound mesh (two materials via geometry groups). Geometry extrudes
 * forward from the invisible footprint plane (back face at z = 0), so nested
 * content sits on the front face at z = {@link depth}.
 */
export class UIWindow extends UIWidget {
  private static readonly evaluator = new Evaluator()

  private _title: string
  private _thickness: number
  private _cornerRadius: number
  private _titleBarCornerRadius: number
  private _bevelThickness: number
  private _bevelSize: number
  private _bevelOffset: number
  private _bevelSegments: number
  private _titleBarHeight: number
  private _titleBarMargin: number
  private _titleBarElevation: number
  private _titleBarBeveled: boolean

  private readonly bodyMaterial: THREE.MeshStandardMaterial
  private readonly titleMaterial: THREE.MeshStandardMaterial

  /** Extruded depth of the body front face, derived from the generated geometry. */
  private bodyTopZ = 0

  private readonly windowMesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[]>
  private readonly titleLabel: UILabel
  private readonly closeButton: UIRectButton

  constructor(options: UIWindowOptions = {}) {
    // The base widget plane stays invisible; it is only the pick footprint.
    super({ ...options, backgroundColor: undefined, opacity: 0 })

    this._title = options.title ?? 'Window'
    this._thickness = Math.max(0.001, options.thickness ?? 0.18)
    this._cornerRadius = Math.max(0, options.cornerRadius ?? 0.12)
    this._titleBarCornerRadius = Math.max(0, options.titleBarCornerRadius ?? this._cornerRadius * 0.5)
    this._bevelThickness = Math.max(0, options.bevelThickness ?? 0.04)
    this._bevelSize = Math.max(0, options.bevelSize ?? 0.03)
    this._bevelOffset = options.bevelOffset ?? 0
    this._bevelSegments = Math.max(1, options.bevelSegments ?? 3)
    this._titleBarHeight = Math.max(0, options.titleBarHeight ?? 0.4)
    this._titleBarMargin = Math.max(0, options.titleBarMargin ?? 0.05)
    this._titleBarElevation = options.titleBarElevation ?? 0.06
    this._titleBarBeveled = options.titleBarBeveled ?? true

    const bodyColor = new THREE.Color(options.color ?? 0x1f2937)
    const titleColor = options.titleBarColor !== undefined
      ? new THREE.Color(options.titleBarColor)
      : bodyColor.clone().lerp(new THREE.Color(0xffffff), 0.18)

    this.bodyMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.15, roughness: 0.55 })
    this.titleMaterial = new THREE.MeshStandardMaterial({ color: titleColor, metalness: 0.15, roughness: 0.55 })

    this.windowMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.bodyMaterial)
    this.mesh.add(this.windowMesh)

    this.titleLabel = this.createTitleLabel()
    this.closeButton = this.createCloseButton()
    this.addWidget(this.titleLabel)
    this.addWidget(this.closeButton)

    this.rebuildGeometry()
    this.layoutHeaderWidgets()
  }

  public override onClick(handler: (widget: UIWindow) => void): this {
    super.onClick(() => {
      handler(this)
    })
    return this
  }

  public override get canBeNested(): boolean {
    return false
  }

  /** Extruded depth of the window body front face along Z in world units. */
  public override get depth(): number {
    return this.bodyTopZ
  }

  protected override onResize(): void {
    this.rebuildGeometry()
    this.layoutHeaderWidgets()
  }

  protected override disposeResources(): void {
    this.windowMesh.geometry.dispose()
    this.bodyMaterial.dispose()
    this.titleMaterial.dispose()
    this.mesh.remove(this.windowMesh)
  }

  // ── title ─────────────────────────────────────────────────────────────────

  public get title(): string {
    return this._title
  }

  public set title(value: string) {
    this._title = value
    this.titleLabel.text = value
  }

  // ── body geometry ───────────────────────────────────────────────────────

  public get thickness(): number {
    return this._thickness
  }

  public set thickness(value: number) {
    this._thickness = Math.max(0.001, value)
    this.rebuildGeometry()
    this.layoutHeaderWidgets()
  }

  public get cornerRadius(): number {
    return this._cornerRadius
  }

  public set cornerRadius(value: number) {
    this._cornerRadius = Math.max(0, value)
    this.rebuildGeometry()
  }

  public get titleBarCornerRadius(): number {
    return this._titleBarCornerRadius
  }

  public set titleBarCornerRadius(value: number) {
    this._titleBarCornerRadius = Math.max(0, value)
    this.rebuildGeometry()
  }

  public get bevelThickness(): number {
    return this._bevelThickness
  }

  public set bevelThickness(value: number) {
    this._bevelThickness = Math.max(0, value)
    this.rebuildGeometry()
    this.layoutHeaderWidgets()
  }

  public get bevelSize(): number {
    return this._bevelSize
  }

  public set bevelSize(value: number) {
    this._bevelSize = Math.max(0, value)
    this.rebuildGeometry()
    this.layoutHeaderWidgets()
  }

  public get bevelOffset(): number {
    return this._bevelOffset
  }

  public set bevelOffset(value: number) {
    this._bevelOffset = value
    this.rebuildGeometry()
  }

  public get bevelSegments(): number {
    return this._bevelSegments
  }

  public set bevelSegments(value: number) {
    this._bevelSegments = Math.max(1, Math.floor(value))
    this.rebuildGeometry()
  }

  // ── title bar ─────────────────────────────────────────────────────────────

  public get titleBarHeight(): number {
    return this._titleBarHeight
  }

  public set titleBarHeight(value: number) {
    this._titleBarHeight = Math.max(0, value)
    this.rebuildGeometry()
    this.layoutHeaderWidgets()
  }

  public get titleBarMargin(): number {
    return this._titleBarMargin
  }

  public set titleBarMargin(value: number) {
    this._titleBarMargin = Math.max(0, value)
    this.rebuildGeometry()
    this.layoutHeaderWidgets()
  }

  public get titleBarElevation(): number {
    return this._titleBarElevation
  }

  public set titleBarElevation(value: number) {
    this._titleBarElevation = value
    this.rebuildGeometry()
    this.layoutHeaderWidgets()
  }

  public get titleBarBeveled(): boolean {
    return this._titleBarBeveled
  }

  public set titleBarBeveled(value: boolean) {
    this._titleBarBeveled = value
    this.rebuildGeometry()
  }

  // ── colour ────────────────────────────────────────────────────────────────

  public get color(): number {
    return this.bodyMaterial.color.getHex()
  }

  public set color(value: number) {
    this.bodyMaterial.color.set(value)
  }

  public getTitleBarColor(): number {
    return this.titleMaterial.color.getHex()
  }

  public setTitleBarColor(value: number): this {
    this.titleMaterial.color.set(value)
    return this
  }

  // ── geometry construction ─────────────────────────────────────────────────

  /**
   * Rebuilds the compound window geometry. The body is a full rounded box; an
   * inset title-bar box is fused into it via boolean addition (raised) or
   * subtraction (lowered). When the title bar is flat or degenerate, the body
   * box is used as-is.
   */
  private rebuildGeometry(): void {
    const bodyGeometry = this.buildBoxGeometry(
      this.width,
      this.height,
      this.uniformRadii(this._cornerRadius),
      true,
      this._thickness,
    )
    bodyGeometry.computeBoundingBox()
    this.bodyTopZ = bodyGeometry.boundingBox ? bodyGeometry.boundingBox.max.z : this._thickness

    const titleWidth = this.width - 2 * this._titleBarMargin
    const titleHeight = this._titleBarHeight
    const elevation = this._titleBarElevation
    const canCompound = titleWidth > 0.02 && titleHeight > 0.02 && Math.abs(elevation) > 1e-4

    if (!canCompound) {
      this.setWindowGeometry(bodyGeometry, this.bodyMaterial)
      return
    }

    const raised = elevation > 0
    // Raised: a full-thickness pad guarantees overlap for a clean union.
    // Lowered: the cutting tool only needs to reach the pocket depth (+a touch
    // past the surface) so the body is not bored all the way through.
    const titleDepth = raised ? this._thickness : Math.abs(elevation) + this._bevelThickness + 0.01
    const titleGeometry = this.buildBoxGeometry(
      titleWidth,
      titleHeight,
      this.uniformRadii(this._titleBarCornerRadius),
      this._titleBarBeveled,
      titleDepth,
    )

    const titleCenterY = this.height / 2 - this._titleBarMargin - titleHeight / 2
    titleGeometry.computeBoundingBox()
    const builtDepth = titleGeometry.boundingBox ? titleGeometry.boundingBox.max.z : titleDepth
    const titleZ = raised
      ? this.bodyTopZ + elevation - builtDepth // pad front face sits at bodyTopZ + elevation
      : this.bodyTopZ + elevation // pocket floor at bodyTopZ + elevation, front pokes past surface
    titleGeometry.translate(0, titleCenterY, titleZ)

    const bodyBrush = new Brush(bodyGeometry, this.bodyMaterial)
    const titleBrush = new Brush(titleGeometry, this.titleMaterial)
    bodyBrush.updateMatrixWorld()
    titleBrush.updateMatrixWorld()

    const result = UIWindow.evaluator.evaluate(bodyBrush, titleBrush, raised ? ADDITION : SUBTRACTION)
    this.setWindowGeometry(result.geometry, [this.bodyMaterial, this.titleMaterial])

    // The brush inputs are consumed; free the transient geometries.
    bodyGeometry.dispose()
    titleGeometry.dispose()
  }

  private setWindowGeometry(
    geometry: THREE.BufferGeometry,
    material: THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[],
  ): void {
    if (this.windowMesh.geometry !== geometry) {
      this.windowMesh.geometry.dispose()
      this.windowMesh.geometry = geometry
    }
    this.windowMesh.material = material
  }

  private uniformRadii(radius: number): CornerRadii {
    return { topLeft: radius, topRight: radius, bottomRight: radius, bottomLeft: radius }
  }

  /**
   * Builds an extruded rounded-rectangle box centred on the X/Y origin, re-based
   * so its back face sits at z = 0. Mirrors the bevel-inset logic used by
   * {@link UIRectButton} so the outer footprint matches the requested size.
   */
  private buildBoxGeometry(
    width: number,
    height: number,
    radii: CornerRadii,
    beveled: boolean,
    extrudeDepth: number,
  ): THREE.ExtrudeGeometry {
    const bevelEnabled = beveled && this._bevelSegments > 0 && (this._bevelThickness > 0 || this._bevelSize > 0)

    const outwardBevel = bevelEnabled ? Math.max(0, this._bevelSize + this._bevelOffset) : 0
    const inset = Math.min(outwardBevel, width / 2 - 1e-4, height / 2 - 1e-4)
    const shapeWidth = width - 2 * inset
    const shapeHeight = height - 2 * inset
    const insetRadii: CornerRadii = {
      topLeft: Math.max(0, radii.topLeft - inset),
      topRight: Math.max(0, radii.topRight - inset),
      bottomRight: Math.max(0, radii.bottomRight - inset),
      bottomLeft: Math.max(0, radii.bottomLeft - inset),
    }

    const shape = createRoundedRectShape(shapeWidth, shapeHeight, insetRadii)
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: extrudeDepth,
      steps: 1,
      curveSegments: 24,
      bevelEnabled,
      bevelThickness: this._bevelThickness,
      bevelSize: this._bevelSize,
      bevelOffset: this._bevelOffset,
      bevelSegments: Math.max(1, this._bevelSegments),
    })
    geometry.computeVertexNormals()

    // Re-base so the back face sits at z = 0 (extrudes forward, like buttons).
    geometry.computeBoundingBox()
    const box = geometry.boundingBox
    if (box) {
      geometry.translate(0, 0, -box.min.z)
    }
    return geometry
  }

  // ── header widgets ──────────────────────────────────────────────────────

  private createTitleLabel(): UILabel {
    const label = new UILabel({
      text: this._title,
      textColor: 0xf8fafc,
      textAlign: 'left',
      verticalAlign: 'middle',
      font: '600 44px "Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif',
      width: 1,
      height: 0.2,
    })
    // The title should not steal interaction from the window surface.
    label.mesh.userData['uiOverlay'] = true
    return label
  }

  private createCloseButton(): UIRectButton {
    const button = new UIRectButton({
      text: 'x',
      textColor: 0xffffff,
      font: '700 40px "Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif',
      width: 0.18,
      height: 0.18,
      thickness: 0.08,
      pressDepth: 0.03,
      cornerRadius: 0.05,
      bevelThickness: 0.02,
      bevelSize: 0.01,
      color: 0xdc2626,
      pressedColor: 0x991b1b,
    })
    button.onClick(() => {
      this.dispose()
    })
    return button
  }

  private layoutHeaderWidgets(): void {
    const titleBarWidth = this.width - 2 * this._titleBarMargin
    if (this._titleBarHeight <= 0 || titleBarWidth <= 0.02) {
      this.titleLabel.visible = false
      this.closeButton.visible = false
      return
    }

    this.titleLabel.visible = true
    this.closeButton.visible = true

    // Surface of the title bar (raised pad face or recessed pocket floor).
    const titleSurfaceZ = this.bodyTopZ + this._titleBarElevation
    const padding = 0.04
    const titleBarInnerHeight = Math.max(0.06, this._titleBarHeight - 2 * this._bevelSize)
    const centerY = this.height / 2 - this._titleBarMargin - this._titleBarHeight / 2
    const halfWidth = titleBarWidth / 2

    const closeSize = Math.max(0.06, titleBarInnerHeight - padding * 2)
    const closeX = THREE.MathUtils.clamp(
      halfWidth - this._bevelSize - padding - closeSize / 2,
      -halfWidth + closeSize / 2,
      halfWidth - closeSize / 2,
    )

    const titleLeft = -halfWidth + this._bevelSize + padding
    const titleRight = closeX - closeSize / 2 - padding
    const titleWidth = Math.max(0.08, titleRight - titleLeft)

    this.titleLabel.setSize(titleWidth, titleBarInnerHeight)
    this.titleLabel.setPosition(titleLeft + titleWidth / 2, centerY, titleSurfaceZ + 0.002)

    this.closeButton.setSize(closeSize, closeSize)
    this.closeButton.setPosition(closeX, centerY, titleSurfaceZ + 0.003)
  }

}
