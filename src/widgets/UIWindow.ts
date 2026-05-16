import * as THREE from 'three'
import { UIWidget } from './UIWidget'
import type { UIWindowOptions } from './WindowOptions'

export class UIWindow extends UIWidget {
  private _borderSize: number
  private _borderColor: number
  private _title: string

  private readonly borderMeshes: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = []
  private titleMesh?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  private titleTexture?: THREE.CanvasTexture

  constructor(options: UIWindowOptions = {}) {
    super(options)

    this._borderSize = Math.max(0, options.borderSize ?? 0.04)
    this._borderColor = options.borderColor ?? 0xe5e7eb
    this._title = options.title ?? 'Window'

    this.rebuildDecorations()
  }

  public override onClick(handler: (widget: UIWindow) => void): void {
    super.onClick(() => {
      handler(this)
    })
  }

  public override get canBeNested(): boolean {
    return false
  }

  public override setPosition(x: number, y: number, z: number): this {
    return super.setPosition(x, y, z)
  }

  public get borderSize(): number {
    return this._borderSize
  }

  public set borderSize(value: number) {
    this._borderSize = Math.max(0, value)
    this.rebuildDecorations()
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
    this.updateTitleTexture()
  }

  private rebuildDecorations(): void {
    this.clearBorders()
    this.createBorders()
    this.createOrUpdateTitleMesh()
    this.updateTitleTexture()
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

  private createOrUpdateTitleMesh(): void {
    if (this.titleMesh) {
      this.mesh.remove(this.titleMesh)
      this.titleMesh.geometry.dispose()
      this.titleMesh.material.dispose()
      this.titleMesh = undefined
    }

    if (this.titleTexture) {
      this.titleTexture.dispose()
      this.titleTexture = undefined
    }

    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 256

    this.titleTexture = new THREE.CanvasTexture(canvas)
    this.titleTexture.colorSpace = THREE.SRGBColorSpace
    this.titleTexture.needsUpdate = true

    const material = new THREE.MeshBasicMaterial({
      map: this.titleTexture,
      transparent: true,
      side: THREE.DoubleSide,
    })

    this.titleMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material)
    this.mesh.add(this.titleMesh)
  }

  private updateTitleTexture(): void {
    if (!this.titleTexture || !this.titleMesh) {
      return
    }

    const canvas = this.titleTexture.image as HTMLCanvasElement
    const thickness = Math.min(this._borderSize, this.width / 2, this.height / 2)
    const titleBarHeight = this.getTitleBarHeight(thickness)

    const contentTop = this.height / 2 - thickness
    const contentBottom = this.height / 2 - titleBarHeight + thickness / 2
    const contentHeight = Math.max(0.08, contentTop - contentBottom)

    const horizontalPadding = Math.max(0.04, thickness * 1.2)
    const verticalPadding = Math.max(0.01, contentHeight * 0.14)
    const titleHeight = Math.max(0.06, contentHeight - 2 * verticalPadding)
    const maxTitleWidth = Math.max(0.1, this.width - 2 * horizontalPadding)

    const canvasHeight = 256
    const canvasWidth = Math.max(256, Math.round(canvasHeight * (maxTitleWidth / titleHeight)))
    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      canvas.width = canvasWidth
      canvas.height = canvasHeight
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    const titleWidth = maxTitleWidth

    this.titleMesh.geometry.dispose()
    this.titleMesh.geometry = new THREE.PlaneGeometry(titleWidth, titleHeight)
    this.titleMesh.position.set(
      -this.width / 2 + horizontalPadding + titleWidth / 2,
      (contentTop + contentBottom) / 2,
      0.002,
    )

    const text = this._title.trim().length > 0 ? this._title : ' '
    const horizontalPaddingPx = 28
    const drawFontPx = Math.max(20, Math.floor(canvas.height * 0.54))
    const fontFamily = '"Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif'
    const maxTextWidth = Math.max(0, canvas.width - horizontalPaddingPx * 2)

    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#e11d48'
    context.font = `600 ${drawFontPx}px ${fontFamily}`
    context.textAlign = 'left'
    context.textBaseline = 'middle'
    const displayTitle = this.ellipsizeText(context, text, maxTextWidth)
    context.fillText(displayTitle, horizontalPaddingPx, canvas.height / 2)

    this.titleTexture.needsUpdate = true
  }

  private ellipsizeText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (context.measureText(text).width <= maxWidth) {
      return text
    }

    const ellipsis = '...'
    if (context.measureText(ellipsis).width > maxWidth) {
      return ''
    }

    let low = 0
    let high = text.length
    while (low < high) {
      const mid = Math.ceil((low + high) / 2)
      const candidate = `${text.slice(0, mid)}${ellipsis}`
      if (context.measureText(candidate).width <= maxWidth) {
        low = mid
      } else {
        high = mid - 1
      }
    }

    return `${text.slice(0, low)}${ellipsis}`
  }

  private getTitleBarHeight(borderThickness: number): number {
    const minimum = Math.max(borderThickness * 3, 0.2)
    const target = this.height * 0.24
    return Math.min(this.height * 0.45, Math.max(minimum, target))
  }
}
