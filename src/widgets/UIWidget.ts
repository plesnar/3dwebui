import * as THREE from 'three'
import type { UIDragController } from '../drag/UIDragController'
import type { WidgetOptions } from './WidgetOptions'

export class UIWidget {
  public static readonly TOP_LEVEL_ANGULAR_SCALE = 0.35
  public static readonly TOP_LEVEL_BASE_RADIUS = 5
  public static readonly TOP_LEVEL_MIN_RADIUS = 0.75
  public static readonly TOP_LEVEL_MAX_RADIUS = 20
  public static readonly TOP_LEVEL_MAX_PITCH = Math.PI / 2 - 0.08

  public readonly width: number
  public readonly height: number
  public readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>

  private clickHandler?: (widget: UIWidget) => void
  private dragController?: UIDragController
  private readonly localPosition = new THREE.Vector3()
  private isTopLevelInApp = false

  constructor(options: WidgetOptions = {}) {
    const hasBackgroundColor = options.backgroundColor !== undefined
    const backgroundColor = options.backgroundColor ?? 0xffffff
    this.width = options.width ?? 1
    this.height = options.height ?? 1

    const geometry = new THREE.PlaneGeometry(this.width, this.height)
    const material = new THREE.MeshBasicMaterial({
      color: backgroundColor,
      side: THREE.DoubleSide,
      transparent: !hasBackgroundColor,
      opacity: hasBackgroundColor ? 1 : 0,
    })

    this.mesh = new THREE.Mesh(geometry, material)
  }

  public onClick(handler: (widget: UIWidget) => void): void {
    this.clickHandler = handler
  }

  public triggerClick(): void {
    this.clickHandler?.(this)
  }

  public setDragController(controller?: UIDragController): this {
    this.dragController = controller
    return this
  }

  public getDragController(): UIDragController | undefined {
    return this.dragController
  }

  public get canBeNested(): boolean {
    return true
  }

  public setPosition(x: number, y: number, z: number): this {
    this.localPosition.set(x, y, z)

    if (!this.isTopLevelInApp) {
      this.mesh.position.copy(this.localPosition)
    }

    return this
  }

  public getPosition(): THREE.Vector3 {
    return this.localPosition.clone()
  }

  public get position(): THREE.Vector3 {
    return this.getPosition()
  }

  public set position(value: THREE.Vector3) {
    this.setPosition(value.x, value.y, value.z)
  }

  public setTopLevelInApp(value: boolean): void {
    if (this.isTopLevelInApp === value) {
      return
    }

    this.isTopLevelInApp = value

    if (!value) {
      this.mesh.position.copy(this.localPosition)
    }
  }

  public getTopLevelInApp(): boolean {
    return this.isTopLevelInApp
  }

  private readonly childWidgets: UIWidget[] = []

  public addWidget(widget: UIWidget): this {
    if (!widget.canBeNested) {
      throw new Error(`Widget type ${widget.constructor.name} cannot be nested.`)
    }

    if (this.childWidgets.includes(widget)) {
      return this
    }

    widget.setTopLevelInApp(false)
    widget.mesh.parent?.remove(widget.mesh)
    this.mesh.add(widget.mesh)
    this.childWidgets.push(widget)
    return this
  }

  public removeWidget(widget: UIWidget): this {
    const index = this.childWidgets.indexOf(widget)
    if (index < 0) {
      return this
    }

    this.childWidgets.splice(index, 1)
    if (widget.mesh.parent === this.mesh) {
      this.mesh.remove(widget.mesh)
    }
    return this
  }

  public get widgets(): readonly UIWidget[] {
    return this.childWidgets
  }

  public setBackgroundColor(color: number): void {
    this.mesh.material.color.setHex(color)
    this.mesh.material.transparent = false
    this.mesh.material.opacity = 1
  }

  public get backgroundColor(): number {
    return this.mesh.material.color.getHex()
  }
}
