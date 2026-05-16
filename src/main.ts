import './style.css'
import { PlaneDragController } from './drag/PlaneDragController'
import { SphereDragController } from './drag/SphereDragController'
import { UIApp } from './app/UIApp'
import { UIWidget } from './widgets/UIWidget'
import { UIWindow } from './widgets/UIWindow'

const app = new UIApp()
const sphereDragController = new SphereDragController()

const widgetA = new UIWidget({
  backgroundColor: 0xf97316,
  width: 1.8,
  height: 1.2,
})
widgetA.setPosition(-2, 0, 0)
widgetA.setDragController(sphereDragController)
widgetA.onClick((widget) => {
  widget.setBackgroundColor(Math.random() * 0xffffff)
})

const widgetB = new UIWidget({
  backgroundColor: 0x22c55e,
  width: 1.2,
  height: 1.8,
})
widgetB.setPosition(2, 0, 0)
widgetB.setDragController(sphereDragController)
widgetB.onClick((widget) => {
  widget.setBackgroundColor(Math.random() * 0xffffff)
})

const windowA = new UIWindow({
  width: 2.9,
  height: 1.6,
  borderSize: 0.01,
  borderColor: 0xf8fafc,
  title: 'Control Panel',
})
windowA.setPosition(0, 0, 0)
windowA.setDragController(sphereDragController)
windowA.onClick((windowWidget) => {
  windowWidget.borderColor = Math.random() * 0xffffff
  windowWidget.title = `Border Color: #${windowWidget.borderColor.toString(16).padStart(6, '0')}`
})

const windowB = new UIWindow({
  width: 2.2,
  height: 1.2,
  borderSize: 0.015,
  borderColor: 0x38bdf8,
  title: 'Inspector',
})
windowB.setPosition(3, 0, 0)
windowB.setDragController(sphereDragController)
windowB.onClick((windowWidget) => {
  windowWidget.borderColor = Math.random() * 0xffffff
  windowWidget.title = `Inspector: #${windowWidget.borderColor.toString(16).padStart(6, '0')}`
})

// Nested widget inside windowA (allowed: UIWidget.canBeNested = true)
const nestedWidget = new UIWidget({
  backgroundColor: 0x0ea5e9,
  width: 0.85,
  height: 0.5,
})
nestedWidget.setPosition(0, 0, 0.1)
nestedWidget.setDragController(new PlaneDragController())
nestedWidget.onClick((widget) => {
  widget.setBackgroundColor(Math.random() * 0xffffff)
})
windowA.addWidget(nestedWidget)

// Deeply nested widget inside nestedWidget (multi-level nesting: UIWidget in UIWidget)
const deepWidget = new UIWidget({
  backgroundColor: 0xf43f5e,
  width: 0.35,
  height: 0.2,
})
deepWidget.setPosition(0, 0, 0.1)
deepWidget.setDragController(new PlaneDragController())
deepWidget.onClick((widget) => {
  widget.setBackgroundColor(Math.random() * 0xffffff)
})
nestedWidget.addWidget(deepWidget)

app.add(widgetA)
app.add(widgetB)
app.add(windowA)
app.add(windowB)
