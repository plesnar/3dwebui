import * as THREE from 'three'
import { UIWidget } from './UIWidget'
import { UILabel } from './UILabel'
import { createCutCornerShape } from './CutCornerShape'
import type { UISciFiButtonOptions } from './UISciFiButtonOptions'

export class UISciFiButton extends UIWidget {
  private readonly label: UILabel
  private readonly outline: THREE.LineLoop<THREE.BufferGeometry, THREE.LineBasicMaterial>
  private readonly cornerCut: number
  private readonly idleColor: number
  private readonly hoverColor: number
  private readonly pressedColor: number
  private hovered = false
  private pressed = false

  constructor(options: UISciFiButtonOptions = {}) {
    super({
      ...options,
      width: options.width ?? 0.9,
      height: options.height ?? 0.32,
      backgroundColor: options.color ?? options.backgroundColor ?? 0x123e54,
      opacity: options.opacity ?? 0.85,
    })
    this.cornerCut = Math.max(0, options.cornerCut ?? 0.07)
    this.idleColor = this.backgroundColor
    this.hoverColor = options.hoverColor ?? 0x256b80
    this.pressedColor = options.pressedColor ?? 0x398da0
    this.mesh.material.depthWrite = false
    this.mesh.material.toneMapped = false

    this.outline = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({
      color: options.borderColor ?? 0x8adce8,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      toneMapped: false,
    }))
    this.outline.position.z = 0.002
    this.outline.userData['uiOverlay'] = true
    this.outline.raycast = () => {}
    this.mesh.add(this.outline)

    this.label = new UILabel({
      text: options.text ?? '',
      font: options.font ?? '600 30px "Avenir Next", "Segoe UI", sans-serif',
      textColor: options.textColor ?? 0xe0faff,
    })
    this.label.mesh.userData['uiOverlay'] = true
    this.mesh.add(this.label.mesh)
    this.rebuildGeometry()

    this.on('pointerenter', () => {
      this.hovered = true
      this.refreshAppearance()
    })
    this.on('pointerleave', () => {
      this.hovered = false
      this.pressed = false
      this.refreshAppearance()
    })
    this.on('pointerdown', () => {
      this.pressed = true
      this.refreshAppearance()
    })
    this.on('pointerup', () => {
      this.pressed = false
      this.refreshAppearance()
    })
    this.on('enabledchange', () => {
      this.hovered = false
      this.pressed = false
      this.refreshAppearance()
    })
    this.refreshAppearance()
  }

  public override onClick(handler: (widget: UISciFiButton) => void): this {
    super.onClick(() => handler(this))
    return this
  }

  public get text(): string {
    return this.label.text
  }

  public set text(value: string) {
    this.label.text = value
  }

  protected override onResize(): void {
    this.rebuildGeometry()
  }

  protected override disposeResources(): void {
    this.label.dispose()
    this.outline.geometry.dispose()
    this.outline.material.dispose()
    this.mesh.remove(this.outline)
  }

  private refreshAppearance(): void {
    const color = this.pressed ? this.pressedColor : this.hovered ? this.hoverColor : this.idleColor
    this.mesh.material.color.setHex(this.enabled ? color : 0x263d46)
    this.outline.material.opacity = this.enabled ? (this.hovered || this.pressed ? 1 : 0.8) : 0.3
  }

  private rebuildGeometry(): void {
    const shape = createCutCornerShape(this.width, this.height, this.cornerCut)
    const geometry = new THREE.ShapeGeometry(shape)
    this.mesh.geometry.dispose()
    this.mesh.geometry.copy(geometry)
    geometry.dispose()
    this.outline.geometry.dispose()
    this.outline.geometry = new THREE.BufferGeometry().setFromPoints(shape.getPoints())
    this.label.setSize(Math.max(0, this.width - this.cornerCut), this.height * 0.86)
    this.label.setPosition(0, 0, 0.004)
    this.label.mesh.traverse((object) => {
      object.raycast = () => {}
      if (object instanceof THREE.Mesh) {
        object.material.depthWrite = false
        object.material.toneMapped = false
      }
    })
  }
}