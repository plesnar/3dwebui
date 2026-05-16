import * as THREE from 'three'
import { UIWidget } from '../widgets/UIWidget'

export class WidgetRegistry {
  private readonly widgets: UIWidget[] = []
  private readonly widgetByMesh = new Map<THREE.Object3D, UIWidget>()
  private readonly widgetRoots = new Set<THREE.Object3D>()

  public add(widget: UIWidget, scene: THREE.Scene): void {
    if (this.widgets.includes(widget)) {
      return
    }

    this.widgets.push(widget)

    if (!widget.mesh.parent) {
      scene.add(widget.mesh)
    }

    const isTopLevel = widget.mesh.parent === scene
    widget.setTopLevelInApp(isTopLevel)

    if (isTopLevel) {
      this.widgetRoots.add(widget.mesh)
    } else {
      this.widgetRoots.delete(widget.mesh)
    }

    this.rebuild()
  }

  public rebuild(): void {
    this.widgetByMesh.clear()

    for (const rootWidget of this.widgets) {
      this.registerWidgetTree(rootWidget)
    }
  }

  public get roots(): readonly THREE.Object3D[] {
    return Array.from(this.widgetRoots)
  }

  public getWidget(object: THREE.Object3D): UIWidget | undefined {
    return this.widgetByMesh.get(object)
  }

  private registerWidgetTree(widget: UIWidget): void {
    this.widgetByMesh.set(widget.mesh, widget)

    for (const child of widget.widgets) {
      child.setTopLevelInApp(false)
      this.registerWidgetTree(child)
    }
  }
}
