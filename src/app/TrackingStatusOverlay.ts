/**
 * Lightweight DOM overlay that shows the head/eye tracking on/off status just
 * below the {@link FpsOverlay}. Used by {@link UIApp}'s debug mode.
 */
export class TrackingStatusOverlay {
  private readonly element: HTMLDivElement
  private readonly container: HTMLElement
  private visible = false

  constructor(container: HTMLElement = document.body) {
    this.container = container
    this.element = document.createElement('div')
    Object.assign(this.element.style, {
      position: 'fixed',
      top: '34px',
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
  }

  /** Updates the readout to reflect whether head/eye tracking is enabled. */
  setEnabled(enabled: boolean): void {
    this.element.textContent = enabled ? 'Tracking: ON' : 'Tracking: OFF'
    this.element.style.color = enabled ? '#7dff8a' : '#f87171'
  }

  dispose(): void {
    this.element.remove()
  }
}
