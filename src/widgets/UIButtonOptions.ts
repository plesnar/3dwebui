import type { WidgetOptions } from './WidgetOptions'

/**
 * Shared options for procedural 3D button widgets.
 *
 * `width`/`height` (inherited from {@link WidgetOptions}) define the button's
 * face dimensions on the X/Y plane. `thickness` is the extruded "button height"
 * along Z, which is reduced while the button is pressed.
 */
export type UIButtonOptions = WidgetOptions & {
  /** Extruded button height along Z in world units. Defaults to 0.25. */
  thickness?: number
  /**
   * How far the top face drops along Z while pressed, in world units.
   * Clamped to just below `thickness`. Defaults to 60% of `thickness`.
   */
  pressDepth?: number
  /** Resting face colour as a 24-bit RGB hex number, e.g. `0x2563eb`. */
  color?: number
  /** Face colour while pressed. Defaults to a darker shade of `color`. */
  pressedColor?: number
  /** Optional text rendered centred on the button's top face. */
  text?: string
  /** Label text colour as a 24-bit RGB hex number. Defaults to `0xffffff`. */
  textColor?: number
  /** CSS font shorthand for the label, e.g. `'600 48px sans-serif'`. */
  font?: string
}
