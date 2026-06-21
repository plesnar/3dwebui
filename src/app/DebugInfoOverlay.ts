import type { UIWidget } from '../widgets/UIWidget'

/** Lightweight DOM overlay with app and selected-widget debug info. */
export class DebugInfoOverlay {
  private readonly element: HTMLDivElement
  private readonly container: HTMLElement
  private visible = false
  private hasSelectedWidget = false

  constructor(container: HTMLElement = document.body) {
    this.container = container
    this.element = document.createElement('div')
    Object.assign(this.element.style, {
      position: 'fixed',
      top: '60px',
      left: '8px',
      padding: '6px 8px',
      font: '12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace',
      color: '#f8fafc',
      background: 'rgba(0, 0, 0, 0.5)',
      borderRadius: '4px',
      pointerEvents: 'none',
      userSelect: 'none',
      zIndex: '1000',
      whiteSpace: 'pre',
      display: 'none',
    } satisfies Partial<CSSStyleDeclaration>)
    this.container.appendChild(this.element)
  }

  setVisible(visible: boolean): void {
    if (this.visible === visible) {
      return
    }
    this.visible = visible
    this.element.style.display = visible && this.hasSelectedWidget ? 'block' : 'none'
  }

  setData(selectedWidget?: UIWidget): void {
    this.hasSelectedWidget = selectedWidget !== undefined

    if (!selectedWidget) {
      this.element.textContent = ''
      this.element.style.display = 'none'
      return
    }

    const widgetName = selectedWidget.name || selectedWidget.id
    const widgetWidth = selectedWidget.width.toFixed(2)
    const widgetHeight = selectedWidget.height.toFixed(2)

    this.element.textContent = [
      `Selected: ${widgetName} | width: ${widgetWidth} | height: ${widgetHeight}`,
    ].join('\n')
    this.element.style.display = this.visible ? 'block' : 'none'
  }

  dispose(): void {
    this.element.remove()
  }
}