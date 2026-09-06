import type { UIWidgetOptions } from './UIWidgetOptions'

export type UISciFiButtonOptions = UIWidgetOptions & {
  text?: string
  font?: string
  textColor?: number
  color?: number
  borderColor?: number
  hoverColor?: number
  pressedColor?: number
  cornerCut?: number
}