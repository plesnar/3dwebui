import type * as THREE from 'three'

/** A position/rotation/scale value accepted by widget transform options. */
export type Vector3Like = THREE.Vector3 | { x?: number; y?: number; z?: number } | [number, number, number]

export type WidgetOptions = {
  backgroundColor?: number
  width?: number
  height?: number
  /** Human-friendly identifier for lookup and debugging. */
  name?: string
  /** Whether the widget is rendered. Defaults to true. */
  visible?: boolean
  /** Whether the widget participates in interaction. Defaults to true. */
  enabled?: boolean
  /** Material opacity in the 0..1 range. Defaults to 1. */
  opacity?: number
  /** Initial local position. */
  position?: Vector3Like
  /** Initial local rotation, in radians per axis. */
  rotation?: Vector3Like
  /** Initial local scale. A number applies uniform scaling. */
  scale?: Vector3Like | number
}
