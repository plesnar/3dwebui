import * as THREE from 'three'
import { UIWidget } from './UIWidget'
import { UILabel } from './UILabel'
import { UIRectButton } from './UIRectButton'
import type { UIWindowOptions } from './WindowOptions'

export class UIWindow extends UIWidget {

  private static readonly titleBarHeight = 0.4

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
    if (this._borderSize <= 0) {
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
      strip.position.set(x, y, 0.0)
      strip.userData['uiOverlay'] = true
      this.mesh.add(strip)
      this.borderMeshes.push(strip)
    }

    const topY = this.height / 2 - this._borderSize / 2
    const bottomY = -this.height / 2 + this._borderSize / 2
    const leftX = -this.width / 2 + this._borderSize / 2
    const rightX = this.width / 2 - this._borderSize / 2

    makeBorderStrip(this.width, this._borderSize, 0, topY)
    makeBorderStrip(this.width, this._borderSize, 0, bottomY)
    makeBorderStrip(this._borderSize, this.height - 2 * this._borderSize, leftX, 0)
    makeBorderStrip(this._borderSize, this.height - 2 * this._borderSize, rightX, 0)

    const titleBarBorderY = this.height / 2 - UIWindow.titleBarHeight + this._borderSize / 2
    makeBorderStrip(this.width - 2 * this._borderSize, this._borderSize, 0, titleBarBorderY)
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
    const contentTop = this.height / 2 
    const contentBottom = this.height / 2 - UIWindow.titleBarHeight + this._borderSize
    const contentHeight = contentTop - contentBottom;
    const padding = 0.04;
    const closeSize = contentHeight - padding * 2;
    const closeX = THREE.MathUtils.clamp(
      this.width / 2 - this._borderSize - padding - closeSize / 2,
      -this.width / 2 + closeSize / 2,
      this.width / 2 - closeSize / 2,
    )
    const centerY = (contentTop + contentBottom) / 2

    // Inner bounds of the title bar: inside the top border, above the
    // title-bar separator border, and right of the left border.
    const titleTop = this.height / 2 - this._borderSize
    const titleBottom = this.height / 2 - UIWindow.titleBarHeight + this._borderSize
    const titleBarInnerHeight = titleTop - titleBottom
    const titleLeft = -this.width / 2 + this._borderSize
    const titleRight = closeX - closeSize / 2 - padding
    const titleWidth = Math.max(0.08, titleRight - titleLeft)
    const titleHeight = Math.max(0.06, titleBarInnerHeight)
    const titleCenterY = (titleTop + titleBottom) / 2

    this.titleLabel.setSize(titleWidth, titleHeight)
    this.titleLabel.setPosition(titleLeft + titleWidth / 2, titleCenterY, 0.00)

    this.closeButton.setSize(closeSize, closeSize)
    this.closeButton.setPosition(closeX, centerY, 0)
  }

}
