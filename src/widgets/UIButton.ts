import * as THREE from 'three'
import { UIWidget } from './UIWidget'
import { UILabel } from './UILabel'
import type { UIButtonOptions } from './UIButtonOptions'

/**
 * Abstract base class for procedural 3D button widgets.
 *
 * A button renders a real extruded mesh (not a flat plane) attached to the
 * widget's invisible footprint plane, which is used for raycast picking.
 * Concrete subclasses describe the extruded shape via {@link createButtonGeometry};
 * this base class owns the mesh, material, press animation, and optional label.
 *
 * Pressing (pointer down) smoothly reduces the button's extruded height; the
 * top face — and any label sitting on it — drops by `pressDepth`.
 */
export abstract class UIButton extends UIWidget {
  protected static readonly DEFAULT_THICKNESS = 0.25
  /** Press/release animation speed in progress-units per second. */
  private static readonly PRESS_SPEED = 14

  private _thickness: number
  private _pressDepth: number
  private _pressed = false
  /** 0 = fully released, 1 = fully pressed. */
  private pressProgress = 0

  private readonly restColor = new THREE.Color()
  private readonly pressedColor = new THREE.Color()

  /** Z height of the resting top face, derived from the generated geometry. */
  private topZ = 0

  protected readonly buttonMesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
  private labelWidget?: UILabel

  constructor(options: UIButtonOptions = {}) {
    // The base widget plane stays invisible; it is only the pick footprint.
    super({ ...options, backgroundColor: undefined, opacity: 0 })

    this._thickness = Math.max(0.001, options.thickness ?? UIButton.DEFAULT_THICKNESS)
    this._pressDepth = UIButton.clampPressDepth(
      options.pressDepth ?? this._thickness * 0.6,
      this._thickness,
    )

    this.restColor.set(options.color ?? 0x3b82f6)
    if (options.pressedColor !== undefined) {
      this.pressedColor.set(options.pressedColor)
    } else {
      this.pressedColor.copy(this.restColor).multiplyScalar(0.72)
    }

    const material = new THREE.MeshStandardMaterial({
      color: this.restColor.clone(),
      metalness: 0.15,
      roughness: 0.5,
    })
    this.buttonMesh = new THREE.Mesh(new THREE.BufferGeometry(), material)
    this.mesh.add(this.buttonMesh)

    this.rebuildButtonGeometry()

    if (options.text !== undefined) {
      this.createLabel(options.text, options.textColor, options.font)
    }

    this.applyPress()

    this.on('pointerdown', this.handlePressStart)
    this.on('pointerup', this.handlePressEnd)
    this.on('pointerleave', this.handlePressEnd)
  }

  /**
   * Builds the button's extruded geometry. The shape should be centred on the
   * X/Y origin and may extrude along any Z range; the base class re-bases it so
   * the back face sits at z = 0.
   */
  protected abstract createButtonGeometry(width: number, height: number, thickness: number): THREE.BufferGeometry

  public override onClick(handler: (widget: this) => void): this {
    super.onClick(() => handler(this))
    return this
  }

  // ── press animation ─────────────────────────────────────────────────────

  public get pressed(): boolean {
    return this._pressed
  }

  public override update(delta: number): void {
    const target = this._pressed ? 1 : 0
    if (this.pressProgress === target) {
      return
    }

    const maxStep = UIButton.PRESS_SPEED * delta
    const diff = target - this.pressProgress
    this.pressProgress += Math.sign(diff) * Math.min(Math.abs(diff), maxStep)
    this.applyPress()
  }

  private readonly handlePressStart = (): void => {
    this._pressed = true
  }

  private readonly handlePressEnd = (): void => {
    this._pressed = false
  }

  private applyPress(): void {
    const scaleZ = 1 - (this._pressDepth / this._thickness) * this.pressProgress
    this.buttonMesh.scale.z = scaleZ
    this.buttonMesh.material.color.copy(this.restColor).lerp(this.pressedColor, this.pressProgress)
    this.positionLabel(scaleZ)
  }

  // ── geometry ──────────────────────────────────────────────────────────────

  /** Resting extruded depth along Z, derived from the generated geometry. */
  public override get depth(): number {
    return this.topZ
  }

  public get thickness(): number {
    return this._thickness
  }

  public set thickness(value: number) {
    const next = Math.max(0.001, value)
    if (next === this._thickness) {
      return
    }
    this._thickness = next
    this._pressDepth = UIButton.clampPressDepth(this._pressDepth, next)
    this.rebuildButtonGeometry()
    this.applyPress()
  }

  public get pressDepth(): number {
    return this._pressDepth
  }

  public set pressDepth(value: number) {
    this._pressDepth = UIButton.clampPressDepth(value, this._thickness)
    this.applyPress()
  }

  protected override onResize(): void {
    this.rebuildButtonGeometry()
    if (this.labelWidget) {
      this.labelWidget.setSize(this.width * 0.9, this.height * 0.65)
    }
    this.applyPress()
  }

  /** Rebuilds the extruded geometry and re-bases it so the back face is at z = 0. */
  protected rebuildButtonGeometry(): void {
    const geometry = this.createButtonGeometry(this.width, this.height, this._thickness)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox
    if (box) {
      geometry.translate(0, 0, -box.min.z)
      this.topZ = box.max.z - box.min.z
    } else {
      this.topZ = this._thickness
    }

    this.buttonMesh.geometry.dispose()
    this.buttonMesh.geometry = geometry
    this.applyPress()
  }

  // ── colour ────────────────────────────────────────────────────────────────

  public get color(): number {
    return this.restColor.getHex()
  }

  public set color(value: number) {
    this.restColor.set(value)
    this.applyPress()
  }

  public setPressedColor(value: number): this {
    this.pressedColor.set(value)
    this.applyPress()
    return this
  }

  // ── label ─────────────────────────────────────────────────────────────────

  public get text(): string {
    return this.labelWidget?.text ?? ''
  }

  public set text(value: string) {
    if (this.labelWidget) {
      this.labelWidget.text = value
    } else {
      this.createLabel(value)
      this.applyPress()
    }
  }

  /**
   * Creates the label as an unregistered child mesh so clicks on the text still
   * resolve to this button (mirrors how `UIWindow` renders its title).
   */
  private createLabel(text: string, textColor?: number, font?: string): void {
    this.labelWidget = new UILabel({
      width: this.width * 0.9,
      height: this.height * 0.65,
      text,
      textColor: textColor ?? 0xffffff,
      font,
    })
    this.mesh.add(this.labelWidget.mesh)
  }

  private positionLabel(scaleZ: number): void {
    if (this.labelWidget) {
      this.labelWidget.mesh.position.set(0, 0, this.topZ * scaleZ + 0.004)
    }
  }

  // ── disposal ────────────────────────────────────────────────────────────

  protected override disposeResources(): void {
    if (this.labelWidget) {
      this.mesh.remove(this.labelWidget.mesh)
      this.labelWidget.dispose()
      this.labelWidget = undefined
    }
    this.buttonMesh.geometry.dispose()
    this.buttonMesh.material.dispose()
    this.mesh.remove(this.buttonMesh)
  }

  private static clampPressDepth(value: number, thickness: number): number {
    return Math.min(Math.max(0, value), thickness * 0.95)
  }
}
