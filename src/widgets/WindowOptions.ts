import type { WidgetOptions } from './WidgetOptions'

/**
 * Options for {@link UIWindow}, a 3D extruded rounded-beveled window.
 *
 * The window is rendered as two stacked extruded rounded-rectangle boxes: a
 * content box (lower) and a title-bar box (top strip). The boxes share a flush
 * divider while the outer silhouette stays rounded. Bevel options map onto
 * Three.js `ExtrudeGeometry` bevel settings, mirroring {@link UIRectButton}.
 */
export type UIWindowOptions = WidgetOptions & {
  /** Title bar text. Defaults to `'Window'`. */
  title?: string
  /** Body surface colour as a 24-bit RGB hex number. Defaults to `0x1f2937`. */
  color?: number
  /** Extruded depth of the window body along Z. Defaults to 0.18. */
  thickness?: number
  /** Corner radius of the rounded outer silhouette. Defaults to 0.12. */
  cornerRadius?: number
  /**
   * Corner radius of the inset title bar. Kept smaller than `cornerRadius` for a
   * cleaner nested look. Defaults to half of `cornerRadius`.
   */
  titleBarCornerRadius?: number
  /** Bevel height along Z for the body. Defaults to 0.04. */
  bevelThickness?: number
  /** How far the body bevel extends from the outline. Defaults to 0.03. */
  bevelSize?: number
  /** Distance from the outline at which the body bevel starts. Defaults to 0. */
  bevelOffset?: number
  /** Number of body bevel subdivisions. Defaults to 3. */
  bevelSegments?: number

  /** Height of the title bar strip in world units. Defaults to 0.4. */
  titleBarHeight?: number
  /**
   * Inset of the title bar from the window's left/right/top edges, in world
   * units. The title bar floats inside the body face with this margin around it.
   * Defaults to 0.05.
   */
  titleBarMargin?: number
  /**
   * Z offset of the title-bar surface relative to the body front face. Positive
   * raises the title bar as a pad fused onto the body (boolean addition);
   * negative recesses it as a pocket cut into the body (boolean subtraction).
   * Defaults to 0.06.
   */
  titleBarElevation?: number
  /** Title-bar surface colour. Defaults to a lighter shade of `color`. */
  titleBarColor?: number
  /** Whether the title bar is beveled. Defaults to `true`. */
  titleBarBeveled?: boolean
}
