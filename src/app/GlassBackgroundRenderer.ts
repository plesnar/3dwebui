import * as THREE from 'three'
import { UISciFiWindow } from '../widgets/UISciFiWindow'
import type { UIWidget } from '../widgets/UIWidget'

export class GlassBackgroundRenderer {
  private readonly targets = new Map<UISciFiWindow, THREE.WebGLRenderTarget>()
  private readonly size = new THREE.Vector2()
  private readonly cameraPosition = new THREE.Vector3()
  private readonly windowPosition = new THREE.Vector3()
  private readonly normal = new THREE.Vector3()

  public capture(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    widgets: readonly UIWidget[],
  ): void {
    const windows = widgets.filter((widget): widget is UISciFiWindow =>
      widget instanceof UISciFiWindow && widget.visible && !widget.disposed,
    )
    if (windows.length === 0) return

    scene.updateMatrixWorld()
    camera.getWorldPosition(this.cameraPosition)
    windows.sort((first, second) => {
      const firstDistance = first.mesh.getWorldPosition(this.windowPosition).distanceToSquared(this.cameraPosition)
      const secondDistance = second.mesh.getWorldPosition(this.windowPosition).distanceToSquared(this.cameraPosition)
      return secondDistance - firstDistance
    })
    renderer.getSize(this.size)
    const width = Math.max(1, Math.round(this.size.x))
    const height = Math.max(1, Math.round(this.size.y))
    const previousTarget = renderer.getRenderTarget()
    const previousCubeFace = renderer.getActiveCubeFace()
    const previousMipmapLevel = renderer.getActiveMipmapLevel()
    const previousViewport = renderer.getViewport(new THREE.Vector4())
    const previousScissor = renderer.getScissor(new THREE.Vector4())
    const previousScissorTest = renderer.getScissorTest()
    const previousClippingPlanes = renderer.clippingPlanes
    const previousToneMapping = renderer.toneMapping
    const previousAutoClear = renderer.autoClear

    try {
      renderer.toneMapping = THREE.NoToneMapping
      renderer.autoClear = true
      for (const window of windows) {
        let target = this.targets.get(window)
        if (!target) {
          target = new THREE.WebGLRenderTarget(width, height, {
            type: THREE.HalfFloatType,
            minFilter: THREE.LinearMipmapLinearFilter,
            magFilter: THREE.LinearFilter,
            generateMipmaps: true,
          })
          target.texture.colorSpace = THREE.LinearSRGBColorSpace
          this.targets.set(window, target)
        }
        target.setSize(width, height)
        window.mesh.getWorldPosition(this.windowPosition)
        this.normal.set(0, 0, -1).transformDirection(window.mesh.matrixWorld)
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(this.normal, this.windowPosition)
        renderer.clippingPlanes = [...previousClippingPlanes, plane]
        window.mesh.visible = false
        try {
          renderer.setRenderTarget(target)
          renderer.render(scene, camera)
        } finally {
          window.mesh.visible = true
        }
        window.setGlassBackground(target.texture, width, height)
      }
    } finally {
      renderer.clippingPlanes = previousClippingPlanes
      renderer.toneMapping = previousToneMapping
      renderer.autoClear = previousAutoClear
      renderer.setRenderTarget(previousTarget, previousCubeFace, previousMipmapLevel)
      renderer.setViewport(previousViewport)
      renderer.setScissor(previousScissor)
      renderer.setScissorTest(previousScissorTest)
    }
  }

  public release(window: UISciFiWindow): void {
    window.setGlassBackground(null)
    this.targets.get(window)?.dispose()
    this.targets.delete(window)
  }

  public dispose(): void {
    for (const window of this.targets.keys()) {
      this.release(window)
    }
  }
}