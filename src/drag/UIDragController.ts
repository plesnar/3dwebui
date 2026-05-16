import type { DragMoveContext } from './DragMoveContext'
import type { DragStartContext } from './DragStartContext'
import type { UIWidget } from '../widgets/UIWidget'

export interface UIDragController {
  onDragStart(widget: UIWidget, context: DragStartContext): boolean
  onDragMove(widget: UIWidget, context: DragMoveContext): void
  onDragEnd(widget: UIWidget): void
}
