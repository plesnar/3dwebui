import type { UIWidgetOptions } from './UIWidgetOptions'

export type UISciFiWindowOptions = UIWidgetOptions & {
  title?: string
  color?: number
  gradientColor?: number
  transmission?: number
  roughness?: number
  ior?: number
  glassThickness?: number
  borderColor?: number
  accentColor?: number
  textColor?: number
  cornerCut?: number
  titleBarHeight?: number
  decorations?: boolean
  closable?: boolean
}