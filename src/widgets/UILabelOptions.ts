import type { UIWidgetOptions } from './UIWidgetOptions'

export type UILabelTextAlign = 'left' | 'center' | 'right'
export type UILabelVerticalAlign = 'top' | 'middle' | 'bottom'

export type UILabelOptions = UIWidgetOptions & {
  text?: string
  font?: string
  textColor?: number
  textAlign?: UILabelTextAlign
  verticalAlign?: UILabelVerticalAlign
}
