import * as THREE from 'three'
import { UIWidget } from './UIWidget'
import { UILabel } from './UILabel'
import { UIRectButton } from './UIRectButton'
import type { UIWindowOptions } from './WindowOptions'

export class UIWindow extends UIWidget {
  private _borderSize: number
  private _borderColor: number
  private _title: string

  private readonly borderMeshes: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = []
  private readonly titleLabel: UILabel
  private readonly closeButton: UIRectButton

  constructor(options: UIWindowOptions = {}) {
    super(options)

    this._borderSize = Math.max(0, options.borderSize ?? 0.04)
    this._borderColor = options.borderColor ?? 0xe5e7eb
    this._title = options.title ?? 'Window'

    this.titleLabel = this.createTitleLabel()
    this.closeButton = this.createCloseButton()
    this.addWidget(this.titleLabel)
    this.addWidget(this.closeButton)

    this.rebuildDecorations()
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

  protected override onResize(): void {
    this.rebuildDecorations()
    this.layoutHeaderWidgets()
  }

  protected override disposeResources(): void {
    this.clearBorders()
  }

  public get borderSize(): number {
    return this._borderSize
  }

  public set borderSize(value: number) {
    this._borderSize = Math.max(0, value)
    this.rebuildDecorations()
    this.layoutHeaderWidgets()
  }

  public get borderColor(): number {
    return this._borderColor
  }

  public set borderColor(value: number) {
    this._borderColor = value
    this.updateBorderColor()
  }

  public get title(): string {
    return this._title
  }

  public set title(value: string) {
    this._title = value
    this.titleLabel.text = value
  }

  private rebuildDecorations(): void {
    this.clearBorders()
    this.createBorders()
  }

  private clearBorders(): void {
    for (const borderMesh of this.borderMeshes) {
      this.mesh.remove(borderMesh)
      borderMesh.geometry.dispose()
      borderMesh.material.dispose()
    }
    this.borderMeshes.length = 0
  }

  private createBorders(): void {
    const thickness = Math.min(this._borderSize, this.width / 2, this.height / 2)
    if (thickness <= 0) {
      return
    }

    const makeBorderStrip = (width: number, height: number, x: number, y: number): void => {
      if (width <= 0 || height <= 0) {
        return
      }

      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({ color: this._borderColor, side: THREE.DoubleSide }),
      )
      strip.position.set(x, y, 0.001)
      strip.userData['uiOverlay'] = true
      this.mesh.add(strip)
      this.borderMeshes.push(strip)
    }

    const topY = this.height / 2 - thickness / 2
    const bottomY = -this.height / 2 + thickness / 2
    const leftX = -this.width / 2 + thickness / 2
    const rightX = this.width / 2 - thickness / 2

    makeBorderStrip(this.width, thickness, 0, topY)
    makeBorderStrip(this.width, thickness, 0, bottomY)
    makeBorderStrip(thickness, this.height - 2 * thickness, leftX, 0)
    makeBorderStrip(thickness, this.height - 2 * thickness, rightX, 0)

    const titleBarHeight = this.getTitleBarHeight(thickness)
    makeBorderStrip(this.width - 2 * thickness, thickness, 0, this.height / 2 - titleBarHeight)
  }

  private updateBorderColor(): void {
    for (const borderMesh of this.borderMeshes) {
      borderMesh.material.color.setHex(this._borderColor)
    }
  }

  private createTitleLabel(): UILabel {
    const label = new UILabel({
      text: this._title,
      textColor: 0xe11d48,
      textAlign: 'left',
      verticalAlign: 'middle',
      font: '600 44px "Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif',
      width: 1,
      height: 0.2,
      position: [0, 0, 0.002],
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
      position: [0, 0, 0.003],
    })
    button.onClick(() => {
      this.dispose()
    })
    return button
  }

  private layoutHeaderWidgets(): void {
    const thickness = Math.min(this._borderSize, this.width / 2, this.height / 2)
    const titleBarHeight = this.getTitleBarHeight(thickness)

    const contentTop = this.height / 2 - thickness
    const contentBottom = this.height / 2 - titleBarHeight + thickness / 2
    const contentHeight = Math.max(0.08, contentTop - contentBottom)

    const horizontalPadding = Math.max(0.04, thickness * 1.2)
    const closeSize = Math.min(Math.max(0.12, contentHeight * 0.72), Math.max(0.12, this.width * 0.28))
    const closeX = THREE.MathUtils.clamp(
      this.width / 2 - thickness - horizontalPadding - closeSize / 2,
      -this.width / 2 + closeSize / 2,
      this.width / 2 - closeSize / 2,
    )
    const centerY = (contentTop + contentBottom) / 2

    const titleLeft = -this.width / 2 + thickness + horizontalPadding
    const titleRight = closeX - closeSize / 2 - horizontalPadding
    const titleWidth = Math.max(0.08, titleRight - titleLeft)
    const titleHeight = Math.max(0.06, contentHeight - 0.02)
    const titleVerticalOffset = Math.min(0.01, contentHeight * 0.12)

    this.titleLabel.setSize(titleWidth, titleHeight)
    this.titleLabel.setPosition(titleLeft + titleWidth / 2, centerY - titleVerticalOffset, 0.002)

    this.closeButton.setSize(closeSize, closeSize)
    this.closeButton.setPosition(closeX, centerY, 0.003)
  }

  private getTitleBarHeight(borderThickness: number): number {
    const minimum = Math.max(borderThickness * 3, 0.2)
    const target = this.height * 0.24
    return Math.min(this.height * 0.45, Math.max(minimum, target))
  }
}
