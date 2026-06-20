import type { DragMoveContext } from '../drag/DragMoveContext'
import type { DragStartContext } from '../drag/DragStartContext'
import type { UIWidget } from './UIWidget'

/** Base shape shared by every widget event. */
export interface WidgetEvent<TType extends string> {
  readonly type: TType
  readonly target: UIWidget
}

/** Pointer-driven widget event carrying the originating DOM event. */
export interface WidgetPointerEvent<TType extends string> extends WidgetEvent<TType> {
  readonly pointer: PointerEvent
}

/** Drag lifecycle event carrying the active drag context. */
export interface WidgetDragStartEvent extends WidgetEvent<'dragstart'> {
  readonly context: DragStartContext
}

export interface WidgetDragMoveEvent extends WidgetEvent<'dragmove'> {
  readonly context: DragMoveContext
}

/** Event fired when a child is attached to / detached from a widget. */
export interface WidgetChildEvent<TType extends string> extends WidgetEvent<TType> {
  readonly child: UIWidget
}

/** Maps widget event names to their payload types. */
export type WidgetEventMap = {
  click: WidgetPointerEvent<'click'>
  pointerdown: WidgetPointerEvent<'pointerdown'>
  pointerup: WidgetPointerEvent<'pointerup'>
  pointerenter: WidgetPointerEvent<'pointerenter'>
  pointerleave: WidgetPointerEvent<'pointerleave'>
  focus: WidgetEvent<'focus'>
  blur: WidgetEvent<'blur'>
  dragstart: WidgetDragStartEvent
  dragmove: WidgetDragMoveEvent
  dragend: WidgetEvent<'dragend'>
  childadded: WidgetChildEvent<'childadded'>
  childremoved: WidgetChildEvent<'childremoved'>
  added: WidgetEvent<'added'>
  removed: WidgetEvent<'removed'>
  visibilitychange: WidgetEvent<'visibilitychange'>
  enabledchange: WidgetEvent<'enabledchange'>
  sizechange: WidgetEvent<'sizechange'>
  dispose: WidgetEvent<'dispose'>
}
