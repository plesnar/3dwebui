import type { WidgetOptions } from './WidgetOptions'

export type UILabelTextAlign = 'left' | 'center' | 'right'
export type UILabelVerticalAlign = 'top' | 'middle' | 'bottom'

export type UILabelOptions = WidgetOptions & {
  text?: string
  font?: string
  textColor?: number
  textAlign?: UILabelTextAlign
  verticalAlign?: UILabelVerticalAlign
}
