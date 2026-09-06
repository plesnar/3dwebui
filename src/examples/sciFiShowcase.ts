import * as THREE from 'three'
import { UIApp } from '../app/UIApp'
import { PlaneDragController } from '../drag/PlaneDragController'
import { SphereDragController } from '../drag/SphereDragController'
import { UILabel } from '../widgets/UILabel'
import { UISciFiButton } from '../widgets/UISciFiButton'
import { UISciFiWindow } from '../widgets/UISciFiWindow'
import { UIWidget } from '../widgets/UIWidget'
import { SciFiSounds } from './SciFiSounds'
import { StarfieldBackground } from './StarfieldBackground'
import { setupHeadGazeTracking } from './setupHeadGazeTracking'

const palette = {
  white: 0xe3eeec,
  muted: 0x98b2b6,
  cyan: 0x88e4ed,
  amber: 0xedc17e,
  green: 0x9edcba,
}
const font = '500 30px "Menlo", "Consolas", monospace'

export function createSciFiShowcaseApp(): UIApp {
  const app = new UIApp({ backgroundColor: 0x050809, camera: { fov: 64 } })
  const sounds = new SciFiSounds()
  app.once('close', () => sounds.dispose())
  new StarfieldBackground(app)
  const ambient = new THREE.AmbientLight(0xdce9e5, 1.4)
  const key = new THREE.DirectionalLight(0xffe4b8, 2)
  key.position.set(-3, 5, 6)
  app.sceneRoot.add(ambient, key)
  app.once('close', () => app.sceneRoot.remove(ambient, key))

  const sphereDrag = new SphereDragController()
  const navigation = createStation(app, sphereDrag, 'navigation', '02 / NAVIGATION', 3.05, palette.amber)
  const sensors = createStation(app, sphereDrag, 'sensors', '01 / SENSOR ARRAY', 3.4, palette.cyan)
  const systems = createStation(app, sphereDrag, 'systems', '03 / SYSTEMS', 3.05, palette.green)
  const state = { power: 72, paused: false }

  buildNavigation(navigation)
  buildSensors(app, sensors, state, sounds)
  const restoreLayout = fitStations(app, [navigation, sensors, systems])
  buildSystems(app, systems, state, restoreLayout)
  setupHeadGazeTracking(app)
  app.traverse((widget) => {
    if (!(widget instanceof UISciFiButton || widget instanceof UISciFiWindow)) return
    if (widget instanceof UISciFiButton) {
      widget.on('pointerenter', () => sounds.playHover())
    }
    if (widget.name === 'power-increase') {
      widget.on('click', () => sounds.playClick('select1'))
    } else if (widget.name === 'power-decrease') {
      widget.on('click', () => sounds.playClick('select2'))
    } else {
      widget.on('click', () => sounds.playClick())
    }
  })

  return app
}

function createStation(
  app: UIApp,
  drag: SphereDragController,
  name: string,
  title: string,
  width: number,
  accent: number,
): UISciFiWindow {
  const station = new UISciFiWindow({
    name,
    title,
    width,
    height: 3.5,
    color: 0x465c60,
    gradientColor: 0x92aca8,
    borderColor: accent,
    accentColor: accent,
    textColor: palette.white,
    transmission: 0.86,
    roughness: 0.32,
    closable: false,
  })
  station.setDragController(drag)
  app.add(station)
  return station
}

function addLabel(
  station: UISciFiWindow,
  name: string,
  text: string,
  x: number,
  y: number,
  width: number,
  color = palette.muted,
  height = 0.24,
): UILabel {
  const label = new UILabel({
    name,
    text,
    font,
    textColor: color,
    width,
    height,
    position: [x, y, station.depth + 0.016],
  })
  label.mesh.userData['uiOverlay'] = true
  label.mesh.traverse((object) => {
    object.raycast = () => {}
    if (object instanceof THREE.Mesh) {
      object.material.depthWrite = false
      object.material.toneMapped = false
    }
  })
  station.addWidget(label)
  return label
}

function addButton(
  station: UISciFiWindow,
  name: string,
  text: string,
  x: number,
  y: number,
  width: number,
  accent: number,
): UISciFiButton {
  const button = new UISciFiButton({
    name,
    text,
    font,
    width,
    height: 0.36,
    color: 0x192e32,
    borderColor: accent,
    textColor: accent,
    hoverColor: 0x345758,
    pressedColor: 0x497574,
    position: [x, y, station.depth + 0.025],
  })
  station.addWidget(button)
  return button
}

function addLines(station: UISciFiWindow, points: number[], color: number, opacity = 0.5): THREE.LineSegments {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false })
  const lines = new THREE.LineSegments(geometry, material)
  lines.position.z = station.depth + 0.012
  lines.userData['uiOverlay'] = true
  lines.raycast = () => {}
  station.mesh.add(lines)
  station.once('dispose', () => {
    geometry.dispose()
    material.dispose()
    lines.removeFromParent()
  })
  return lines
}

function addScope(station: UISciFiWindow, color: number): void {
  const points: number[] = []
  for (const radius of [0.25, 0.5, 0.75]) {
    for (let index = 0; index < 96; index += 1) {
      const start = index / 96 * Math.PI * 2
      const end = (index + 1) / 96 * Math.PI * 2
      points.push(Math.cos(start) * radius, Math.sin(start) * radius + 0.12, 0)
      points.push(Math.cos(end) * radius, Math.sin(end) * radius + 0.12, 0)
    }
  }
  points.push(-0.83, 0.12, 0, 0.83, 0.12, 0, 0, -0.71, 0, 0, 0.95, 0)
  addLines(station, points, color, 0.25)
}

function buildNavigation(station: UISciFiWindow): void {
  addLabel(station, 'navigation-sector', 'ASTER / SECTOR 07', 0, 1.08, 2.4, palette.amber)
  addScope(station, palette.amber)
  const route = addLines(station, [0, 0.12, 0, 0.4, 0.4, 0], palette.amber, 0.8)
  const target = addButton(station, 'navigation-target', 'A1', 0.4, 0.4, 0.4, palette.amber)
  target.setDragController(new PlaneDragController())
  const coordinates = addLabel(station, 'navigation-coordinates', '', 0, -0.91, 2.6, palette.white)
  const updateTarget = (): void => {
    const position = target.mesh.position
    position.x = THREE.MathUtils.clamp(position.x, -0.62, 0.62)
    position.y = THREE.MathUtils.clamp(position.y, -0.5, 0.74)
    position.z = station.depth + 0.025
    const points = route.geometry.getAttribute('position')
    points.setXYZ(1, position.x, position.y, 0)
    points.needsUpdate = true
    route.geometry.computeBoundingSphere()
    coordinates.text = `X ${position.x.toFixed(2)} / Y ${(position.y - 0.12).toFixed(2)}`
  }
  target.on('dragmove', updateTarget)
  target.onClick(() => {
    target.text = target.text === 'A1' ? 'A2' : 'A1'
  })
  addButton(station, 'navigation-home', 'Recenter', 0, -1.3, 1.7, palette.amber).onClick(() => {
    target.setPosition(0, 0.12, station.depth + 0.025)
    updateTarget()
  })
  updateTarget()
}

function buildSensors(
  app: UIApp,
  station: UISciFiWindow,
  state: { power: number; paused: boolean },
  sounds: SciFiSounds,
): void {
  const status = addLabel(station, 'sensor-status', 'DEEP SPACE / STANDBY', 0, 1.08, 2.85, palette.cyan)
  addScope(station, palette.cyan)
  const sweep = addLines(station, [0, 0, 0, 0.75, 0, 0], palette.cyan, 0.9)
  sweep.position.y = 0.12
  const contacts = addLines(station, [
    -0.42, 0.37, 0, -0.34, 0.37, 0,
    -0.38, 0.33, 0, -0.38, 0.41, 0,
    0.26, -0.15, 0, 0.34, -0.15, 0,
    0.3, -0.19, 0, 0.3, -0.11, 0,
    0.14, 0.66, 0, 0.22, 0.66, 0,
    0.18, 0.62, 0, 0.18, 0.7, 0,
  ], palette.green, 1)
  contacts.visible = false
  const readout = addLabel(station, 'sensor-readout', '--- km / --- %', 0, -0.91, 2.8, palette.white)
  const scan = addButton(station, 'sensor-scan', 'Scan', -0.72, -1.3, 1.2, palette.cyan)
  const reset = addButton(station, 'sensor-reset', 'Reset', 0.72, -1.3, 1.2, palette.muted)
  reset.enabled = false
  let progress: number | undefined
  let previousPercent = -1
  let sample = 0
  scan.onClick(() => {
    progress = 0
    previousPercent = -1
    contacts.visible = false
    status.text = 'ACQUIRING / 0 %'
    scan.text = 'Scanning'
    scan.enabled = false
    reset.enabled = true
    sounds.setRadarActive(!state.paused)
  })
  reset.onClick(() => {
    progress = undefined
    sounds.setRadarActive(false)
    sample = 0
    contacts.visible = false
    status.text = 'DEEP SPACE / STANDBY'
    readout.text = '--- km / --- %'
    scan.text = 'Scan'
    scan.enabled = true
    reset.enabled = false
  })
  station.once('dispose', () => sounds.setRadarActive(false))
  station.once('dispose', app.on('update', ({ delta }) => {
    sounds.setRadarActive(progress !== undefined && !state.paused)
    if (state.paused) return
    sweep.rotation.z -= delta * (0.3 + state.power / 100)
    if (progress === undefined) return
    progress = Math.min(1, progress + delta * (0.12 + state.power / 160))
    const percent = Math.floor(progress * 100)
    if (percent !== previousPercent) {
      status.text = `ACQUIRING / ${percent} %`
      previousPercent = percent
    }
    if (progress < 1) return
    sample += 1
    contacts.visible = true
    status.text = '3 CONTACTS / LINKED'
    readout.text = `${(842.6 + sample * 1.3).toFixed(1)} km / ${Math.min(99, 80 + Math.round(state.power / 5))} %`
    scan.text = 'Rescan'
    scan.enabled = true
    progress = undefined
    sounds.setRadarActive(false)
  }))
}

function buildSystems(
  app: UIApp,
  station: UISciFiWindow,
  state: { power: number; paused: boolean },
  restoreLayout: () => void,
): void {
  addLabel(station, 'systems-power-heading', 'ARRAY POWER', 0, 1.08, 2.4, palette.green)
  const power = addLabel(station, 'systems-power', '72 %', 0, 0.59, 1.35, palette.white, 0.4)
  const decrease = addButton(station, 'power-decrease', '-', -1.03, 0.59, 0.38, palette.green)
  const increase = addButton(station, 'power-increase', '+', 1.03, 0.59, 0.38, palette.green)
  const bars = Array.from({ length: 12 }, (_, index) => {
    const horizontal = -1.05 + index * 0.19
    return addLines(station, [horizontal, 0.1, 0, horizontal, 0.3, 0], palette.green)
  })
  const refreshPower = (): void => {
    power.text = `${state.power} %`
    decrease.enabled = state.power > 8
    increase.enabled = state.power < 100
    bars.forEach((bar, index) => {
      const material = bar.material as THREE.LineBasicMaterial
      material.opacity = index / bars.length < state.power / 100 ? 1 : 0.15
    })
  }
  decrease.onClick(() => {
    state.power = Math.max(8, state.power - 8)
    refreshPower()
  })
  increase.onClick(() => {
    state.power = Math.min(100, state.power + 8)
    refreshPower()
  })
  refreshPower()

  const status = addLabel(station, 'systems-status', 'ARRAY / ONLINE', 0, -0.2, 2.4, palette.green)
  const uptime = addLabel(station, 'systems-uptime', 'UPTIME / 00:00', 0, -0.55, 2.4)
  const hold = addButton(station, 'systems-hold', 'Hold', 0, -0.91, 2.15, palette.green)
  hold.onClick(() => {
    state.paused = !state.paused
    hold.text = state.paused ? 'Resume' : 'Hold'
    status.text = state.paused ? 'ARRAY / SUSPENDED' : 'ARRAY / ONLINE'
    status.textColor = state.paused ? palette.amber : palette.green
  })
  addButton(station, 'systems-layout', 'Restore layout', 0, -1.35, 2.15, palette.muted).onClick(restoreLayout)
  let elapsed = 0
  let previousSecond = 0
  station.once('dispose', app.on('update', ({ delta }) => {
    if (state.paused) return
    elapsed += delta
    const second = Math.floor(elapsed)
    if (second === previousSecond) return
    previousSecond = second
    const minutes = String(Math.floor(second / 60) % 100).padStart(2, '0')
    const seconds = String(second % 60).padStart(2, '0')
    uptime.text = `UPTIME / ${minutes}:${seconds}`
  }))
}

function fitStations(app: UIApp, stations: [UISciFiWindow, UISciFiWindow, UISciFiWindow]): () => void {
  const radius = UIWidget.TOP_LEVEL_BASE_RADIUS
  const angularScale = UIWidget.TOP_LEVEL_ANGULAR_SCALE
  let selectedStation = 1
  const tabs = stations.map((station, index) => {
    const tab = new UISciFiButton({
      name: `${station.name}-tab`,
      text: ['Navigation', 'Sensors', 'Systems'][index],
      font: '500 26px "Menlo", "Consolas", monospace',
      width: 1.05,
      height: 0.46,
      borderColor: [palette.amber, palette.cyan, palette.green][index],
      color: 0x243739,
    })
    tab.onClick(() => {
      selectedStation = index
      fit()
      app.focus(station)
    })
    app.add(tab)
    return tab
  })
  const fit = (): void => {
    const camera = app.activeCamera
    const vertical = THREE.MathUtils.degToRad(camera.fov / 2)
    const horizontal = Math.atan(Math.tan(vertical) * camera.aspect)
    const portrait = camera.aspect < 1
    if (portrait) {
      const scale = Math.min(1.15, 2 * radius * Math.tan(horizontal) * 0.9 / 3.4)
      stations.forEach((station, index) => {
        station.visible = index === selectedStation
        station.enabled = station.visible
        station.setScale(scale)
        station.setPosition(0, 0, 0)
      })
      tabs.forEach((tab, index) => {
        tab.visible = true
        tab.enabled = true
        tab.opacity = index === selectedStation ? 1 : 0.4
        tab.setScale(scale)
        tab.setPosition(
          (1 - index) * Math.atan(1.14 * scale / radius) / angularScale,
          Math.atan(2.17 * scale / radius) / angularScale,
          0,
        )
      })
      return
    }
    tabs.forEach((tab) => {
      tab.visible = false
      tab.enabled = false
    })
    let lower = 0
    let upper = 1.15
    for (let iteration = 0; iteration < 24; iteration += 1) {
      const candidate = (lower + upper) / 2
      const halfExtents = stations.map((station) => Math.atan(station.width * candidate / (2 * radius)))
      const total = halfExtents.reduce((sum, extent) => sum + extent, 0) + candidate * 0.08
      const crossExtent = Math.atan(3.5 * candidate / (2 * radius))
      if (total < horizontal * 0.91 && crossExtent < vertical * 0.84) {
        lower = candidate
      } else {
        upper = candidate
      }
    }
    const center = stations[1]
    const centerHalf = Math.atan(center.width * lower / (2 * radius))
    stations.forEach((station, index) => {
      station.visible = true
      station.enabled = true
      station.setScale(lower)
      const sideHalf = Math.atan(station.width * lower / (2 * radius))
      const offset = (centerHalf + sideHalf + lower * 0.04) / angularScale
      station.setPosition((1 - index) * offset, 0, 0)
    })
  }
  const stopResizing = app.on('resize', fit)
  app.once('close', stopResizing)
  fit()
  return fit
}