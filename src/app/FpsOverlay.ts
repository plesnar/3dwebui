/**
 * Lightweight DOM overlay that shows a frames-per-second readout in the
 * top-left corner of the screen. Used by {@link UIApp}'s debug mode.
 */
export class FpsOverlay {
  private readonly element: HTMLDivElement
  private readonly container: HTMLElement
  private accumulatedTime = 0
  private frameCount = 0
  private visible = false

  // Refresh the readout at most twice per second to keep it readable.
  private static readonly SAMPLE_WINDOW = 0.5

  constructor(container: HTMLElement = document.body) {
    this.container = container
    this.element = document.createElement('div')
    this.element.textContent = '— FPS'
    Object.assign(this.element.style, {
      position: 'fixed',
      top: '8px',
      left: '8px',
      padding: '4px 8px',
      font: '12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace',
      color: '#7dff8a',
      background: 'rgba(0, 0, 0, 0.5)',
      borderRadius: '4px',
      pointerEvents: 'none',
      userSelect: 'none',
      zIndex: '1000',
      display: 'none',
    } satisfies Partial<CSSStyleDeclaration>)
    this.container.appendChild(this.element)
  }

  setVisible(visible: boolean): void {
    if (this.visible === visible) {
      return
    }
    this.visible = visible
    this.element.style.display = visible ? 'block' : 'none'
    this.accumulatedTime = 0
    this.frameCount = 0
  }

  /** Accumulates frame timing and refreshes the readout periodically. */
  update(delta: number): void {
    if (!this.visible) {
      return
    }
    this.accumulatedTime += delta
    this.frameCount += 1
    if (this.accumulatedTime >= FpsOverlay.SAMPLE_WINDOW) {
      const fps = this.frameCount / this.accumulatedTime
      this.element.textContent = `${Math.round(fps)} FPS`
      this.accumulatedTime = 0
      this.frameCount = 0
    }
  }

  dispose(): void {
    this.element.remove()
  }
}
