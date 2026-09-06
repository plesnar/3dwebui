import * as THREE from 'three'
import { UIWidget } from './UIWidget'
import { UILabel } from './UILabel'
import { UISciFiButton } from './UISciFiButton'
import { createCutCornerShape } from './CutCornerShape'
import type { UISciFiWindowOptions } from './UISciFiWindowOptions'

export class UISciFiWindow extends UIWidget {
  private readonly glassMaterial: THREE.MeshPhysicalMaterial
  private readonly glassMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshPhysicalMaterial>
  private readonly glassBackground = { value: null as THREE.Texture | null }
  private readonly glassBackgroundSize = { value: new THREE.Vector2(1, 1) }
  private readonly glassBackgroundEnabled = { value: false }
  private readonly titleLabel: UILabel
  private readonly closeButton?: UISciFiButton
  private readonly outline: THREE.LineLoop<THREE.BufferGeometry, THREE.LineBasicMaterial>
  private readonly markings: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>
  private readonly accents: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>
  private readonly bottomColor: THREE.Color
  private readonly topColor: THREE.Color
  private readonly cornerCut: number
  private readonly titleBarHeight: number
  private readonly decorations: boolean

  constructor(options: UISciFiWindowOptions = {}) {
    super({
      ...options,
      width: options.width ?? 3.2,
      height: options.height ?? 2.2,
      backgroundColor: 0xffffff,
      opacity: options.opacity ?? 1,
    })
    this.bottomColor = new THREE.Color(options.color ?? options.backgroundColor ?? 0x729bb7)
    this.topColor = new THREE.Color(options.gradientColor ?? 0xc3e2ef)
    this.cornerCut = Math.max(0, options.cornerCut ?? 0.22)
    this.titleBarHeight = Math.max(0, options.titleBarHeight ?? 0.44)
    this.decorations = options.decorations ?? true
    this.mesh.material.visible = false
    this.mesh.material.depthWrite = false
    this.glassMaterial = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      metalness: 0,
      transmission: THREE.MathUtils.clamp(options.transmission ?? 0.96, 0, 1),
      roughness: THREE.MathUtils.clamp(options.roughness ?? 0.28, 0, 1),
      ior: THREE.MathUtils.clamp(options.ior ?? 1.45, 1, 2.333),
      thickness: Math.max(0, options.glassThickness ?? 0.32),
      envMapIntensity: 0.65,
      opacity: this.opacity,
      transparent: this.opacity < 1,
      depthWrite: false,
    })
    this.glassMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uiGlassBackground = this.glassBackground
      shader.uniforms.uiGlassBackgroundSize = this.glassBackgroundSize
      shader.uniforms.uiGlassBackgroundEnabled = this.glassBackgroundEnabled
      const transmission = THREE.ShaderChunk.transmission_pars_fragment.replace(
        'return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );',
        `if ( uiGlassBackgroundEnabled ) {
          float backgroundLod = log2( uiGlassBackgroundSize.x ) * applyIorToRoughness( roughness, ior );
          return textureBicubic( uiGlassBackground, fragCoord.xy, backgroundLod );
        }
        return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );`,
      )
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <transmission_pars_fragment>',
        `uniform sampler2D uiGlassBackground;
        uniform vec2 uiGlassBackgroundSize;
        uniform bool uiGlassBackgroundEnabled;
        ${transmission}`,
      )
    }
    this.glassMaterial.customProgramCacheKey = () => 'sci-fi-glass-background-v1'
    this.glassMesh = new THREE.Mesh(this.mesh.geometry, this.glassMaterial)
    this.glassMesh.renderOrder = -1
    this.glassMesh.userData['uiOverlay'] = true
    this.glassMesh.raycast = () => {}
    this.mesh.add(this.glassMesh)

    const borderMaterial = new THREE.LineBasicMaterial({
      color: options.borderColor ?? 0x9ae7f2,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      toneMapped: false,
    })
    this.outline = new THREE.LineLoop(new THREE.BufferGeometry(), borderMaterial)
    this.markings = new THREE.LineSegments(new THREE.BufferGeometry(), borderMaterial.clone())
    this.markings.material.opacity = 0.45
    this.accents = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({
      color: options.accentColor ?? 0xf2c879,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      toneMapped: false,
    }))
    for (const decoration of [this.outline, this.markings, this.accents]) {
      decoration.position.z = 0.002
      decoration.userData['uiOverlay'] = true
      decoration.raycast = () => {}
      this.mesh.add(decoration)
    }

    this.titleLabel = new UILabel({
      name: `${this.name || 'sci-fi-window'}-title`,
      text: options.title ?? 'SYSTEM / 01',
      textColor: options.textColor ?? 0xe0faff,
      textAlign: 'left',
      font: '600 34px "Menlo", "Consolas", monospace',
    })
    this.titleLabel.mesh.userData['uiOverlay'] = true
    this.addWidget(this.titleLabel)

    if (options.closable !== false) {
      this.closeButton = new UISciFiButton({
        name: `${this.name || 'sci-fi-window'}-close`,
        text: 'x',
        font: '400 36px "Menlo", "Consolas", monospace',
        cornerCut: 0.045,
        opacity: 0.55,
        borderColor: options.borderColor,
        hoverColor: 0x88524b,
        pressedColor: 0xb96753,
      })
      this.closeButton.onClick(() => this.dispose())
      this.addWidget(this.closeButton)
    }
    this.rebuildGeometry()
  }

  public override onClick(handler: (widget: UISciFiWindow) => void): this {
    super.onClick(() => handler(this))
    return this
  }

  public override get canBeNested(): boolean {
    return false
  }

  public override get depth(): number {
    return 0.008
  }

  public get title(): string {
    return this.titleLabel.text
  }

  public set title(value: string) {
    this.titleLabel.text = value
  }

  public override get opacity(): number {
    return super.opacity
  }

  public override set opacity(value: number) {
    super.opacity = value
    this.glassMaterial.opacity = super.opacity
    this.glassMaterial.transparent = super.opacity < 1
    this.glassMaterial.depthWrite = this.glassBackgroundEnabled.value && super.opacity > 0
  }

  public setGlassBackground(texture: THREE.Texture | null, width = 1, height = 1): void {
    this.glassBackground.value = texture
    this.glassBackgroundSize.value.set(width, height)
    this.glassBackgroundEnabled.value = texture !== null
    this.glassMaterial.depthWrite = texture !== null && this.opacity > 0
  }

  public override setBackgroundColor(color: number): void {
    super.setBackgroundColor(color)
    this.glassMaterial.color.setHex(color)
    this.opacity = 1
  }

  protected override onResize(): void {
    this.rebuildGeometry()
  }

  protected override disposeResources(): void {
    this.glassMaterial.dispose()
    this.mesh.remove(this.glassMesh)
    for (const decoration of [this.outline, this.markings, this.accents]) {
      decoration.geometry.dispose()
      decoration.material.dispose()
      this.mesh.remove(decoration)
    }
  }

  private rebuildGeometry(): void {
    const shape = createCutCornerShape(this.width, this.height, this.cornerCut)
    const geometry = new THREE.ShapeGeometry(shape)
    const positions = geometry.getAttribute('position')
    const colors: number[] = []
    const color = new THREE.Color()
    for (let index = 0; index < positions.count; index += 1) {
      const vertical = positions.getY(index) / Math.max(this.height, 0.001) + 0.5
      const horizontal = positions.getX(index) / Math.max(this.width, 0.001) + 0.5
      color.copy(this.bottomColor).lerp(this.topColor, vertical * 0.85 + horizontal * 0.15)
      colors.push(color.r, color.g, color.b)
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    this.mesh.geometry.dispose()
    this.mesh.geometry.copy(geometry)
    this.glassMesh.geometry = this.mesh.geometry
    geometry.dispose()
    this.outline.geometry.dispose()
    this.outline.geometry = new THREE.BufferGeometry().setFromPoints(shape.getPoints())
    this.rebuildMarkings()
    this.layoutHeader()
  }

  private rebuildMarkings(): void {
    const left = -this.width / 2
    const right = this.width / 2
    const top = this.height / 2
    const bottom = -this.height / 2
    const inset = Math.min(this.cornerCut + 0.08, this.width * 0.2, this.height * 0.2)
    const header = Math.min(this.titleBarHeight, this.height * 0.4)
    const lines: number[] = []
    const accents: number[] = []
    const segment = (target: number[], fromX: number, fromY: number, toX: number, toY: number): void => {
      target.push(fromX, fromY, 0, toX, toY, 0)
    }

    if (header > 0 && this.width > 0.6 && this.height > 0.4) {
      segment(lines, left + inset, top - header, right - inset, top - header)
    }
    if (this.decorations && this.width > 0.8 && this.height > 0.8) {
      segment(lines, left + inset, bottom + 0.18, right - inset - 0.32, bottom + 0.18)
      segment(lines, left + 0.07, bottom + inset, left + 0.07, bottom + inset + 0.3)
      segment(lines, right - 0.07, top - inset, right - 0.07, top - inset - 0.3)
      segment(accents, left + inset, top - 0.045, left + inset + 0.32, top - 0.045)
      for (let index = 0; index < 3; index += 1) {
        const start = right - inset - 0.24 + index * 0.09
        segment(accents, start, bottom + 0.18, start + 0.025, bottom + 0.18)
      }
      for (let index = 0; index < 7; index += 1) {
        const start = left + inset + index * 0.07
        segment(lines, start, bottom + 0.075, start + 0.025, bottom + 0.11)
      }
    }
    this.markings.geometry.dispose()
    this.markings.geometry = new THREE.BufferGeometry()
    this.markings.geometry.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3))
    this.accents.geometry.dispose()
    this.accents.geometry = new THREE.BufferGeometry()
    this.accents.geometry.setAttribute('position', new THREE.Float32BufferAttribute(accents, 3))
  }

  private layoutHeader(): void {
    const header = Math.min(this.titleBarHeight, this.height * 0.4)
    const inset = Math.min(this.cornerCut + 0.05, this.width * 0.15)
    const closeSize = Math.min(0.26, header * 0.6)
    const titleWidth = Math.max(0, this.width - inset * 2 - (this.closeButton ? closeSize + 0.1 : 0))
    const visible = header >= 0.16 && titleWidth >= 0.2
    const centerY = this.height / 2 - header / 2
    this.titleLabel.visible = visible
    this.titleLabel.setSize(titleWidth, header * 0.85)
    this.titleLabel.setPosition(-this.width / 2 + inset + titleWidth / 2, centerY, 0.004)
    this.titleLabel.mesh.traverse((object) => {
      object.raycast = () => {}
      if (object instanceof THREE.Mesh) {
        object.material.depthWrite = false
        object.material.toneMapped = false
      }
    })
    if (this.closeButton) {
      this.closeButton.visible = visible
      this.closeButton.setSize(closeSize, closeSize)
      this.closeButton.setPosition(this.width / 2 - inset - closeSize / 2, centerY, 0.004)
    }
  }
}