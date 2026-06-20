import * as THREE from 'three'
import { EventEmitter } from '../core/EventEmitter'
import type { UIDragController } from '../drag/UIDragController'
import type { DragMoveContext } from '../drag/DragMoveContext'
import type { DragStartContext } from '../drag/DragStartContext'
import type { Vector3Like, WidgetOptions } from './WidgetOptions'
import type { WidgetEventMap } from './WidgetEventMap'

let nextWidgetId = 0

function generateWidgetId(): string {
  const cryptoRef = globalThis.crypto
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
    return cryptoRef.randomUUID()
  }
  nextWidgetId += 1
  return `widget-${nextWidgetId}`
}

function resolveVector3(value: Vector3Like | undefined, target: THREE.Vector3): THREE.Vector3 {
  if (!value) {
    return target
  }
  if (Array.isArray(value)) {
    return target.set(value[0], value[1], value[2])
  }
  if (value instanceof THREE.Vector3) {
    return target.copy(value)
  }
  return target.set(value.x ?? 0, value.y ?? 0, value.z ?? 0)
}

export class UIWidget extends EventEmitter<WidgetEventMap> {
  public static readonly TOP_LEVEL_ANGULAR_SCALE = 0.35
  public static readonly TOP_LEVEL_BASE_RADIUS = 5
  public static readonly TOP_LEVEL_MIN_RADIUS = 0.75
  public static readonly TOP_LEVEL_MAX_RADIUS = 20
  public static readonly TOP_LEVEL_MAX_PITCH = Math.PI / 2 - 0.08

  public readonly id: string
  public readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  public userData: Record<string, unknown> = {}

  private _name: string
  private _width: number
  private _height: number
  private _opacity: number
  private _enabled = true
  private _disposed = false

  private dragController?: UIDragController
  private readonly localPosition = new THREE.Vector3()
  private isTopLevelInApp = false
  private _parent?: UIWidget
  private readonly childWidgets: UIWidget[] = []

  constructor(options: WidgetOptions = {}) {
    super()

    const hasBackgroundColor = options.backgroundColor !== undefined
    const backgroundColor = options.backgroundColor ?? 0xffffff
    this._width = options.width ?? 1
    this._height = options.height ?? 1
    this.id = generateWidgetId()
    this._name = options.name ?? ''

    const defaultOpacity = hasBackgroundColor ? 1 : 0
    this._opacity = options.opacity ?? defaultOpacity

    const geometry = new THREE.PlaneGeometry(this._width, this._height)
    const material = new THREE.MeshBasicMaterial({
      color: backgroundColor,
      side: THREE.DoubleSide,
      transparent: this._opacity < 1,
      opacity: this._opacity,
    })

    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.visible = options.visible ?? true

    if (options.enabled === false) {
      this._enabled = false
    }

    resolveVector3(options.position, this.localPosition)
    this.mesh.position.copy(this.localPosition)

    if (options.rotation) {
      const rotation = resolveVector3(options.rotation, new THREE.Vector3())
      this.mesh.rotation.set(rotation.x, rotation.y, rotation.z)
    }

    if (options.scale !== undefined) {
      if (typeof options.scale === 'number') {
        this.mesh.scale.setScalar(options.scale)
      } else {
        const scale = resolveVector3(options.scale, new THREE.Vector3(1, 1, 1))
        this.mesh.scale.copy(scale)
      }
    }
  }

  // ── identity ────────────────────────────────────────────────────────────

  public get name(): string {
    return this._name
  }

  public set name(value: string) {
    this._name = value
  }

  // ── interaction events ──────────────────────────────────────────────────

  /** Registers a click listener. Sugar over `on('click', ...)`. */
  public onClick(handler: (widget: UIWidget) => void): this {
    this.on('click', (event) => handler(event.target))
    return this
  }

  /** Programmatically fires a click using a synthetic pointer event. */
  public triggerClick(): void {
    this.dispatchClick(new PointerEvent('click'))
  }

  public dispatchClick(pointer: PointerEvent): void {
    if (!this._enabled) {
      return
    }
    this.emit('click', { type: 'click', target: this, pointer })
  }

  public dispatchPointerDown(pointer: PointerEvent): void {
    if (!this._enabled) {
      return
    }
    this.emit('pointerdown', { type: 'pointerdown', target: this, pointer })
  }

  public dispatchPointerUp(pointer: PointerEvent): void {
    if (!this._enabled) {
      return
    }
    this.emit('pointerup', { type: 'pointerup', target: this, pointer })
  }

  public dispatchPointerEnter(pointer: PointerEvent): void {
    if (!this._enabled) {
      return
    }
    this.emit('pointerenter', { type: 'pointerenter', target: this, pointer })
  }

  public dispatchPointerLeave(pointer: PointerEvent): void {
    if (!this._enabled) {
      return
    }
    this.emit('pointerleave', { type: 'pointerleave', target: this, pointer })
  }

  public dispatchDragStart(context: DragStartContext): void {
    this.emit('dragstart', { type: 'dragstart', target: this, context })
  }

  public dispatchDragMove(context: DragMoveContext): void {
    this.emit('dragmove', { type: 'dragmove', target: this, context })
  }

  public dispatchDragEnd(): void {
    this.emit('dragend', { type: 'dragend', target: this })
  }

  /** Emits the focus event. Driven by the app's focus tracking. */
  public dispatchFocus(): void {
    this.emit('focus', { type: 'focus', target: this })
  }

  /** Emits the blur event. Driven by the app's focus tracking. */
  public dispatchBlur(): void {
    this.emit('blur', { type: 'blur', target: this })
  }

  // ── drag ────────────────────────────────────────────────────────────────

  public setDragController(controller?: UIDragController): this {
    this.dragController = controller
    return this
  }

  public getDragController(): UIDragController | undefined {
    return this.dragController
  }

  // ── nesting rules ─────────────────────────────────────────────────────────

  public get canBeNested(): boolean {
    return true
  }

  // ── state ─────────────────────────────────────────────────────────────────

  public get visible(): boolean {
    return this.mesh.visible
  }

  public set visible(value: boolean) {
    if (this.mesh.visible === value) {
      return
    }
    this.mesh.visible = value
    this.emit('visibilitychange', { type: 'visibilitychange', target: this })
  }

  public get enabled(): boolean {
    return this._enabled
  }

  public set enabled(value: boolean) {
    if (this._enabled === value) {
      return
    }
    this._enabled = value
    this.emit('enabledchange', { type: 'enabledchange', target: this })
  }

  public get opacity(): number {
    return this._opacity
  }

  public set opacity(value: number) {
    const clamped = Math.min(1, Math.max(0, value))
    this._opacity = clamped
    this.mesh.material.opacity = clamped
    this.mesh.material.transparent = clamped < 1
  }

  public get disposed(): boolean {
    return this._disposed
  }

  // ── transform ───────────────────────────────────────────────────────────

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

  public setRotation(x: number, y: number, z: number): this {
    this.mesh.rotation.set(x, y, z)
    return this
  }

  public get rotation(): THREE.Euler {
    return this.mesh.rotation
  }

  public set rotation(value: THREE.Euler) {
    this.mesh.rotation.copy(value)
  }

  public setScale(x: number, y?: number, z?: number): this {
    if (y === undefined || z === undefined) {
      this.mesh.scale.setScalar(x)
    } else {
      this.mesh.scale.set(x, y, z)
    }
    return this
  }

  public get scale(): THREE.Vector3 {
    return this.mesh.scale
  }

  public set scale(value: THREE.Vector3) {
    this.mesh.scale.copy(value)
  }

  // ── size ──────────────────────────────────────────────────────────────────

  public get width(): number {
    return this._width
  }

  public set width(value: number) {
    this.setSize(value, this._height)
  }

  public get height(): number {
    return this._height
  }

  public set height(value: number) {
    this.setSize(this._width, value)
  }

  public setSize(width: number, height: number): this {
    const nextWidth = Math.max(0, width)
    const nextHeight = Math.max(0, height)
    if (nextWidth === this._width && nextHeight === this._height) {
      return this
    }

    this._width = nextWidth
    this._height = nextHeight

    this.mesh.geometry.dispose()
    this.mesh.geometry = new THREE.PlaneGeometry(this._width, this._height)

    this.onResize()
    this.emit('sizechange', { type: 'sizechange', target: this })
    return this
  }

  /**
   * Extruded depth along Z in world units. Plain plane widgets have no depth;
   * 3D widgets (e.g. buttons) override this so selection bounds can wrap the box.
   */
  public get depth(): number {
    return 0
  }

  /** Hook for subclasses to rebuild geometry-dependent decorations on resize. */
  protected onResize(): void {}

  // ── top-level projection state ────────────────────────────────────────────

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

  // ── hierarchy ─────────────────────────────────────────────────────────────

  public get parent(): UIWidget | undefined {
    return this._parent
  }

  public addWidget(widget: UIWidget): this {
    if (!widget.canBeNested) {
      throw new Error(`Widget type ${widget.constructor.name} cannot be nested.`)
    }

    if (this.childWidgets.includes(widget)) {
      return this
    }

    widget.removeFromParent()
    widget.setTopLevelInApp(false)
    widget.mesh.parent?.remove(widget.mesh)
    this.mesh.add(widget.mesh)
    this.childWidgets.push(widget)
    widget._parent = this

    widget.handleAttached()
    this.emit('childadded', { type: 'childadded', target: this, child: widget })
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
    widget._parent = undefined

    widget.handleDetached()
    this.emit('childremoved', { type: 'childremoved', target: this, child: widget })
    return this
  }

  /** Detaches this widget from its parent widget, if any. */
  public removeFromParent(): this {
    this._parent?.removeWidget(this)
    return this
  }

  public get widgets(): readonly UIWidget[] {
    return this.childWidgets
  }

  public getRoot(): UIWidget {
    let current: UIWidget = this
    while (current._parent) {
      current = current._parent
    }
    return current
  }

  public contains(widget: UIWidget): boolean {
    let found = false
    this.traverse((candidate) => {
      if (candidate === widget) {
        found = true
      }
    })
    return found
  }

  /** Depth-first visit of this widget and all descendants. */
  public traverse(visitor: (widget: UIWidget) => void): void {
    visitor(this)
    for (const child of this.childWidgets) {
      child.traverse(visitor)
    }
  }

  public findById(id: string): UIWidget | undefined {
    return this.find((widget) => widget.id === id)
  }

  public findByName(name: string): UIWidget | undefined {
    return this.find((widget) => widget.name === name)
  }

  public find(predicate: (widget: UIWidget) => boolean): UIWidget | undefined {
    let match: UIWidget | undefined
    this.traverse((widget) => {
      if (!match && predicate(widget)) {
        match = widget
      }
    })
    return match
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────

  /** Called once per frame by the app. Override to animate. */
  public update(_delta: number): void {}

  /** Called when the widget is attached to a parent or the app. */
  public handleAttached(): void {
    this.onAdded()
    this.emit('added', { type: 'added', target: this })
  }

  /** Called when the widget is detached from a parent or the app. */
  public handleDetached(): void {
    this.onRemoved()
    this.emit('removed', { type: 'removed', target: this })
  }

  /** Hook for subclasses to react to attachment. */
  protected onAdded(): void {}

  /** Hook for subclasses to react to detachment. */
  protected onRemoved(): void {}

  // ── background ────────────────────────────────────────────────────────────

  public setBackgroundColor(color: number): void {
    this.mesh.material.color.setHex(color)
    this._opacity = 1
    this.mesh.material.transparent = false
    this.mesh.material.opacity = 1
  }

  public get backgroundColor(): number {
    return this.mesh.material.color.getHex()
  }

  public set backgroundColor(value: number) {
    this.setBackgroundColor(value)
  }

  // ── disposal ────────────────────────────────────────────────────────────

  /**
   * Releases this widget's GPU resources and listeners, recursively disposing
   * all descendants and detaching from its parent. Safe to call more than once.
   */
  public dispose(): void {
    if (this._disposed) {
      return
    }
    this._disposed = true

    this.emit('dispose', { type: 'dispose', target: this })

    for (const child of [...this.childWidgets]) {
      child.dispose()
    }
    this.childWidgets.length = 0

    this.removeFromParent()
    this.disposeResources()

    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
    this.mesh.parent?.remove(this.mesh)

    this.removeAllListeners()
  }

  /** Hook for subclasses to dispose their own meshes, textures, materials. */
  protected disposeResources(): void {}
}
