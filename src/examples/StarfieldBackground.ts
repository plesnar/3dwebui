import * as THREE from 'three'
import type { UIApp } from '../app/UIApp'

export class StarfieldBackground {
  private readonly texture: THREE.CanvasTexture

  constructor(app: UIApp) {
    const canvas = document.createElement('canvas')
    canvas.width = 3072
    canvas.height = 1536
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Starfield requires a 2D canvas context')

    let seed = 73
    const random = (): number => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return (seed + 1) / 4294967297
    }
    context.fillStyle = '#050809'
    context.fillRect(0, 0, canvas.width, canvas.height)

    for (let index = 0; index < 65000; index += 1) {
      const horizontal = random() * canvas.width
      const longitude = horizontal / canvas.width * Math.PI * 2
      const spread = Math.sqrt(-2 * Math.log(random())) * Math.cos(random() * Math.PI * 2)
      const vertical = canvas.height * (0.5 + Math.sin(longitude) * 0.19 + spread * 0.032)
      context.fillStyle = index % 3 === 0 ? 'rgba(168,156,130,0.026)' : 'rgba(111,160,158,0.022)'
      context.beginPath()
      context.arc(horizontal, vertical, 0.5 + random() * 3.5, 0, Math.PI * 2)
      context.fill()
    }

    const colors = ['#dce9ed', '#adc9cc', '#e8d2a5', '#f4f1e9']
    for (let index = 0; index < 4200; index += 1) {
      const horizontal = random() * canvas.width
      const vertical = Math.acos(2 * random() - 1) / Math.PI * canvas.height
      const brightness = random()
      const radius = brightness > 0.99 ? 1.5 : 0.35 + random() * 0.65
      context.globalAlpha = 0.25 + brightness * 0.75
      context.fillStyle = colors[index % colors.length]!
      context.beginPath()
      context.arc(horizontal, vertical, radius, 0, Math.PI * 2)
      context.fill()
      if (brightness > 0.995) {
        context.globalAlpha = 0.2
        context.fillRect(horizontal - 3.5, vertical - 0.35, 7, 0.7)
        context.fillRect(horizontal - 0.35, vertical - 3.5, 0.7, 7)
      }
    }
    context.globalAlpha = 1

    this.texture = new THREE.CanvasTexture(canvas)
    this.texture.mapping = THREE.EquirectangularReflectionMapping
    this.texture.colorSpace = THREE.SRGBColorSpace
    app.sceneRoot.background = this.texture
    app.sceneRoot.environment = this.texture
    app.once('close', () => {
      if (app.sceneRoot.background === this.texture) app.sceneRoot.background = null
      if (app.sceneRoot.environment === this.texture) app.sceneRoot.environment = null
      this.texture.dispose()
    })
  }
}