import type * as THREE from 'three'
import type { UIApp } from './UIApp'
import type { UIWidget } from '../widgets/UIWidget'
import type { UIWindow } from '../widgets/UIWindow'

/** Base shape shared by every app event. */
export interface AppEvent<TType extends string> {
  readonly type: TType
  readonly app: UIApp
}

/** Event fired when a top-level widget is added to / removed from the app. */
export interface AppWidgetEvent<TType extends string> extends AppEvent<TType> {
  readonly widget: UIWidget
}

/** Event fired when the globally focused widget changes. */
export interface AppFocusChangeEvent extends AppEvent<'focuschange'> {
  readonly focused: UIWidget | undefined
}

/** Event fired when the globally active window changes. */
export interface AppActiveWindowChangeEvent extends AppEvent<'activewindowchange'> {
  readonly activeWindow: UIWindow | undefined
}

/** Event fired when debug mode is toggled on or off. */
export interface AppDebugChangeEvent extends AppEvent<'debugchange'> {
  readonly debug: boolean
}

/** Event fired when head/eye tracking is toggled on or off. */
export interface AppTrackingChangeEvent extends AppEvent<'trackingchange'> {
  readonly enabled: boolean
}

/** Per-frame event carrying the frame delta (seconds) and active camera. */
export interface AppUpdateEvent<TType extends string> extends AppEvent<TType> {
  readonly delta: number
  readonly camera: THREE.PerspectiveCamera
}

/** Maps app event names to their payload types. */
export type AppEventMap = {
  widgetadded: AppWidgetEvent<'widgetadded'>
  widgetremoved: AppWidgetEvent<'widgetremoved'>
  focuschange: AppFocusChangeEvent
  activewindowchange: AppActiveWindowChangeEvent
  debugchange: AppDebugChangeEvent
  trackingchange: AppTrackingChangeEvent
  update: AppUpdateEvent<'update'>
  beforerender: AppUpdateEvent<'beforerender'>
  afterrender: AppUpdateEvent<'afterrender'>
  resize: AppEvent<'resize'>
  close: AppEvent<'close'>
}
