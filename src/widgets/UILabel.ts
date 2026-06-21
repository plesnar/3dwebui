import * as THREE from 'three'
import { UIWidget } from './UIWidget'
import type { UILabelOptions, UILabelTextAlign, UILabelVerticalAlign } from './UILabelOptions'

/**
 * A widget that renders a text label within its boundary.
 *
 * Text is drawn at a fixed world-space size determined by the font's pixel size
 * and a constant pixels-per-unit ratio (PX_PER_UNIT). Changing the widget's
 * width/height adjusts how much text is visible but does not scale the glyphs.
 */
export class UILabel extends UIWidget {
  /** Canvas pixels that correspond to one Three.js world unit. */
  private static readonly PX_PER_UNIT = 256

  private _text: string
  private _font: string
  private _textColor: number
  private _textAlign: UILabelTextAlign
  private _verticalAlign: UILabelVerticalAlign

  private labelMesh?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  private labelTexture?: THREE.CanvasTexture

  constructor(options: UILabelOptions = {}) {
    super(options)

    this._text = options.text ?? ''
    this._font = options.font ?? '400 48px "Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif'
    this._textColor = options.textColor ?? 0xffffff
    this._textAlign = options.textAlign ?? 'center'
    this._verticalAlign = options.verticalAlign ?? 'middle'

    this.buildLabelMesh()
  }

  public override onClick(handler: (widget: UILabel) => void): this {
    super.onClick(() => {
      handler(this)
    })
    return this
  }

  protected override onResize(): void {
    this.disposeLabelResources()
    this.buildLabelMesh()
  }

  protected override disposeResources(): void {
    this.disposeLabelResources()
  }

  private disposeLabelResources(): void {
    if (this.labelMesh) {
      this.mesh.remove(this.labelMesh)
      this.labelMesh.geometry.dispose()
      this.labelMesh.material.dispose()
      this.labelMesh = undefined
    }
    if (this.labelTexture) {
      this.labelTexture.dispose()
      this.labelTexture = undefined
    }
  }

  // ── text ──────────────────────────────────────────────────────────────────

  public get text(): string {
    return this._text
  }

  public set text(value: string) {
    this._text = value
    this.updateLabelTexture()
  }

  // ── font ──────────────────────────────────────────────────────────────────

  /** CSS font shorthand, e.g. `'600 48px sans-serif'`. */
  public get font(): string {
    return this._font
  }

  public set font(value: string) {
    this._font = value
    this.updateLabelTexture()
  }

  // ── textColor ─────────────────────────────────────────────────────────────

  /** Text colour as a 24-bit RGB hex number, e.g. `0xffffff`. */
  public get textColor(): number {
    return this._textColor
  }

  public set textColor(value: number) {
    this._textColor = value
    this.updateLabelTexture()
  }

  // ── textAlign ─────────────────────────────────────────────────────────────

  public get textAlign(): UILabelTextAlign {
    return this._textAlign
  }

  public set textAlign(value: UILabelTextAlign) {
    this._textAlign = value
    this.updateLabelTexture()
  }

  // ── verticalAlign ─────────────────────────────────────────────────────────

  public get verticalAlign(): UILabelVerticalAlign {
    return this._verticalAlign
  }

  public set verticalAlign(value: UILabelVerticalAlign) {
    this._verticalAlign = value
    this.updateLabelTexture()
  }

  // ── private helpers ───────────────────────────────────────────────────────

  private buildLabelMesh(): void {
    const ppu = UILabel.PX_PER_UNIT
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(this.width * ppu))
    canvas.height = Math.max(1, Math.round(this.height * ppu))

    this.labelTexture = new THREE.CanvasTexture(canvas)
    this.labelTexture.colorSpace = THREE.SRGBColorSpace

    const material = new THREE.MeshBasicMaterial({
      map: this.labelTexture,
      transparent: true,
      side: THREE.DoubleSide,
    })

    this.labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(this.width, this.height), material)
    this.labelMesh.position.set(0, 0, 0.001)
    this.mesh.add(this.labelMesh)

    this.updateLabelTexture()
  }

  private updateLabelTexture(): void {
    if (!this.labelTexture || !this.labelMesh) {
      return
    }

    const canvas = this.labelTexture.image as HTMLCanvasElement
    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    const paddingPx = 16
    const maxTextWidth = Math.max(0, canvas.width - paddingPx * 2)

    const xMap: Record<UILabelTextAlign, number> = {
      left: paddingPx,
      center: canvas.width / 2,
      right: canvas.width - paddingPx,
    }

    const yMap: Record<UILabelVerticalAlign, number> = {
      top: paddingPx,
      middle: canvas.height / 2,
      bottom: canvas.height - paddingPx,
    }

    const baselineMap: Record<UILabelVerticalAlign, CanvasTextBaseline> = {
      top: 'top',
      middle: 'middle',
      bottom: 'bottom',
    }

    context.clearRect(0, 0, canvas.width, canvas.height)
    context.font = this._font
    context.fillStyle = `#${this._textColor.toString(16).padStart(6, '0')}`
    context.textAlign = this._textAlign
    context.textBaseline = baselineMap[this._verticalAlign]

    const raw = this._text.length > 0 ? this._text : ' '
    const displayText = this.ellipsizeText(context, raw, maxTextWidth)

    const x = xMap[this._textAlign]
    let y = yMap[this._verticalAlign]

    // The canvas 'middle' baseline centres on the em box rather than the
    // glyphs' visual centre, which makes text appear slightly too high.
    // Re-centre using the actual rendered bounding box.
    if (this._verticalAlign === 'middle') {
      context.textBaseline = 'alphabetic'
      const metrics = context.measureText(displayText)
      const ascent = metrics.actualBoundingBoxAscent
      const descent = metrics.actualBoundingBoxDescent
      y = canvas.height / 2 + (ascent - descent) / 2
    }

    context.fillText(displayText, x, y)

    this.labelTexture.needsUpdate = true
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
}
