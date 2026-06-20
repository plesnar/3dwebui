import type { UIButtonOptions } from './UIButtonOptions'

/**
 * Options for {@link UIRectButton}, a rectangular extruded + beveled button.
 *
 * The bevel options map directly onto Three.js `ExtrudeGeometry` bevel settings.
 */
export type UIRectButtonOptions = UIButtonOptions & {
  /** Corner radius of the rounded-rectangle outline. Defaults to 0.08. */
  cornerRadius?: number
  /** Bevel height along Z ("bevel height"). Maps to `bevelThickness`. Defaults to 0.05. */
  bevelThickness?: number
  /** How far the bevel extends from the outline ("bevel offset"). Maps to `bevelSize`. Defaults to 0.03. */
  bevelSize?: number
  /** Distance from the outline at which the bevel starts. Maps to `bevelOffset`. Defaults to 0. */
  bevelOffset?: number
  /** Number of bevel subdivisions ("bevel smoothness"). Maps to `bevelSegments`. Defaults to 3. */
  bevelSegments?: number
}
