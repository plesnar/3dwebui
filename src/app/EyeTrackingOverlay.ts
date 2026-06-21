import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import type { EyeTrackingController } from './EyeTrackingController'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

const IRIS_CIRCLE_SEGMENTS = 32
const ANCHOR_DISTANCE = 2.0
const ANCHOR_PADDING = 0.06

// Line thickness in world units (Line2 worldUnits mode).
const CIRCLE_LINE_WIDTH = 0.005
const VECTOR_LINE_WIDTH = 0.007

// Direction-vector visualization tuning (fractions of overlay width).
const HEAD_VECTOR_LENGTH = 0.45
const GAZE_VECTOR_LENGTH = 0.6

// MediaPipe face-mesh landmark indices.
const NOSE_TIP = 1
const LEFT_IRIS_CENTER = 468
const RIGHT_IRIS_CENTER = 473
const LEFT_EYE_OUTER = 33
const LEFT_EYE_INNER = 133
const RIGHT_EYE_INNER = 362
const RIGHT_EYE_OUTER = 263

const HEAD_VECTOR_COLOR = 0x4ea1ff
const GAZE_VECTOR_COLOR = 0x7dff8a

export class EyeTrackingOverlay {
  private readonly group = new THREE.Group()
  private readonly feedMesh: THREE.Mesh
  private readonly videoTexture: THREE.VideoTexture
  private readonly irisCircles: [Line2, Line2]
  private readonly headVector: Line2
  private readonly gazeVectors: [Line2, Line2]
  private readonly controller: EyeTrackingController
  // Reusable position buffers to avoid per-frame allocation.
  private readonly circleBuffer = new Float32Array((IRIS_CIRCLE_SEGMENTS + 1) * 3)
  private readonly segmentBuffer = new Float32Array(2 * 3)
  private overlayWidth: number
  private overlayHeight: number

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, controller: EyeTrackingController, overlayWidth = 1) {
    this.controller = controller
    this.overlayWidth = overlayWidth
    this.overlayHeight = overlayWidth * (3 / 4)

    const video = controller.getVideo()
    this.videoTexture = new THREE.VideoTexture(video)
    // Mirror the feed horizontally so it shows as a selfie view,
    // consistent with the (0.5 - lm.x) landmark X mapping.
    this.videoTexture.offset.x = 1
    this.videoTexture.repeat.x = -1

    video.addEventListener('loadedmetadata', () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        this.overlayHeight = this.overlayWidth * (video.videoHeight / video.videoWidth)
        this.feedMesh.geometry.dispose()
        this.feedMesh.geometry = new THREE.PlaneGeometry(this.overlayWidth, this.overlayHeight)
        this.positionInCorner(camera)
      }
    })

    this.feedMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(this.overlayWidth, this.overlayHeight),
      new THREE.MeshBasicMaterial({ map: this.videoTexture }),
    )
    this.group.add(this.feedMesh)

    this.irisCircles = [
      makeCircleLine(0xffffff, CIRCLE_LINE_WIDTH),
      makeCircleLine(0xffffff, CIRCLE_LINE_WIDTH),
    ]

    for (const obj of this.irisCircles) {
      obj.renderOrder = 1
      this.group.add(obj)
    }

    this.headVector = makeVectorLine(HEAD_VECTOR_COLOR, VECTOR_LINE_WIDTH)
    this.gazeVectors = [
      makeVectorLine(GAZE_VECTOR_COLOR, VECTOR_LINE_WIDTH),
      makeVectorLine(GAZE_VECTOR_COLOR, VECTOR_LINE_WIDTH),
    ]

    for (const obj of [this.headVector, ...this.gazeVectors]) {
      obj.renderOrder = 2
      this.group.add(obj)
    }

    this.setLinesVisible(false)
    this.updateResolution()

    // Parent the group to the camera so it is fixed in screen space.
    // Adding the camera to the scene is required for its children to be rendered.
    scene.add(camera)
    camera.add(this.group)
    this.positionInCorner(camera)
    window.addEventListener('resize', () => {
      this.positionInCorner(camera)
      this.updateResolution()
    })
  }

  /** LineMaterial needs the viewport resolution to compute screen-correct widths. */
  private updateResolution(): void {
    for (const obj of [...this.irisCircles, this.headVector, ...this.gazeVectors]) {
      ;(obj.material as LineMaterial).resolution.set(window.innerWidth, window.innerHeight)
    }
  }

  /** Shows or hides the entire overlay (camera feed and tracking lines). */
  setVisible(visible: boolean): void {
    this.group.visible = visible
  }

  update(): void {
    const result = this.controller.getLatestResult()
    if (!result?.faceLandmarks.length) {
      this.setLinesVisible(false)
      return
    }

    this.setLinesVisible(true)

    const landmarks = result.faceLandmarks[0]

    this.updateIrisCircle(this.irisCircles[0], landmarks, 468, 469)
    this.updateIrisCircle(this.irisCircles[1], landmarks, 473, 474)

    this.updateHeadVector(landmarks, result.facialTransformationMatrixes?.[0]?.data)
    this.updateGazeVectors(landmarks)
  }

  private positionInCorner(camera: THREE.PerspectiveCamera): void {
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * ANCHOR_DISTANCE
    const halfW = halfH * camera.aspect
    this.group.position.set(
      halfW - this.overlayWidth / 2 - ANCHOR_PADDING,
      -(halfH - this.overlayHeight / 2 - ANCHOR_PADDING),
      -ANCHOR_DISTANCE,
    )
  }

  private landmarkToLocal(lm: NormalizedLandmark): THREE.Vector3 {
    return new THREE.Vector3(
      (0.5 - lm.x) * this.overlayWidth,   // flip X: raw-image left → right of mirrored display
      (0.5 - lm.y) * this.overlayHeight,  // flip Y: image Y-down → Three.js Y-up
      -lm.z * this.overlayWidth,           // negate Z: smaller MediaPipe z = closer to camera = +Z in Three.js
    )
  }

  private updateIrisCircle(
    circle: Line2,
    landmarks: NormalizedLandmark[],
    centerIdx: number,
    edgeIdx: number,
  ): void {
    const center = this.landmarkToLocal(landmarks[centerIdx])
    const edge = this.landmarkToLocal(landmarks[edgeIdx])
    const radius = center.distanceTo(edge)

    const buf = this.circleBuffer
    for (let i = 0; i < IRIS_CIRCLE_SEGMENTS; i++) {
      const angle = (i / IRIS_CIRCLE_SEGMENTS) * Math.PI * 2
      buf[i * 3] = center.x + Math.cos(angle) * radius
      buf[i * 3 + 1] = center.y + Math.sin(angle) * radius
      buf[i * 3 + 2] = center.z
    }
    // Close the loop by repeating the first point.
    buf[IRIS_CIRCLE_SEGMENTS * 3] = buf[0]
    buf[IRIS_CIRCLE_SEGMENTS * 3 + 1] = buf[1]
    buf[IRIS_CIRCLE_SEGMENTS * 3 + 2] = buf[2]
    circle.geometry.setPositions(buf)
  }

  /**
   * Draws the head-forward direction as a line anchored at the nose tip.
   * The forward axis is column 2 of the facial transformation matrix
   * (MediaPipe camera space, Y-up / Z-toward-viewer). Only the X/Y
   * (yaw/pitch) components are drawn — projected flat into the panel plane —
   * so a neutral pose collapses to a dot and head turns produce a clear 2D
   * arrow. X is negated to match the mirrored selfie display.
   */
  private updateHeadVector(landmarks: NormalizedLandmark[], matrix?: number[]): void {
    if (!matrix) {
      this.headVector.visible = false
      return
    }

    const fwdX = matrix[2]
    const fwdY = matrix[6]
    const fwdZ = matrix[10]
    const len = Math.sqrt(fwdX * fwdX + fwdY * fwdY + fwdZ * fwdZ)
    if (len < 0.001) {
      this.headVector.visible = false
      return
    }

    const origin = this.landmarkToLocal(landmarks[NOSE_TIP])
    // Flatten onto the panel plane: the nose tip protrudes toward the camera
    // (positive local z), which perspective would otherwise shift sideways
    // relative to where the nose appears on the flat video feed.
    origin.z = 0
    const scale = HEAD_VECTOR_LENGTH * this.overlayWidth
    const tip = new THREE.Vector3(
      origin.x + (fwdX / len) * scale,
      origin.y + (-fwdY / len) * scale,
      origin.z,
    )
    this.setLineSegment(this.headVector, origin, tip)
  }

  /**
   * Draws per-eye gaze direction as lines anchored at each iris center.
   * Gaze offset is the iris displacement from the eye-corner midpoint,
   * normalized by eye width; X/Y are negated to match the mirrored display.
   */
  private updateGazeVectors(landmarks: NormalizedLandmark[]): void {
    this.updateGazeVector(
      this.gazeVectors[0],
      landmarks,
      LEFT_IRIS_CENTER,
      LEFT_EYE_OUTER,
      LEFT_EYE_INNER,
    )
    this.updateGazeVector(
      this.gazeVectors[1],
      landmarks,
      RIGHT_IRIS_CENTER,
      RIGHT_EYE_INNER,
      RIGHT_EYE_OUTER,
    )
  }

  private updateGazeVector(
    line: Line2,
    landmarks: NormalizedLandmark[],
    irisIdx: number,
    cornerAIdx: number,
    cornerBIdx: number,
  ): void {
    const iris = landmarks[irisIdx]
    const cornerA = landmarks[cornerAIdx]
    const cornerB = landmarks[cornerBIdx]

    const eyeCenterX = (cornerA.x + cornerB.x) / 2
    const eyeCenterY = (cornerA.y + cornerB.y) / 2
    const eyeWidth = Math.abs(cornerB.x - cornerA.x) || 0.01

    const gazeX = (iris.x - eyeCenterX) / eyeWidth
    const gazeY = (iris.y - eyeCenterY) / eyeWidth

    const origin = this.landmarkToLocal(iris)
    const scale = GAZE_VECTOR_LENGTH * this.overlayWidth
    const tip = new THREE.Vector3(
      origin.x + -gazeX * scale,
      origin.y + -gazeY * scale,
      origin.z,
    )
    this.setLineSegment(line, origin, tip)
  }

  private setLineSegment(line: Line2, from: THREE.Vector3, to: THREE.Vector3): void {
    line.visible = true
    const buf = this.segmentBuffer
    buf[0] = from.x
    buf[1] = from.y
    buf[2] = from.z
    buf[3] = to.x
    buf[4] = to.y
    buf[5] = to.z
    line.geometry.setPositions(buf)
  }

  private setLinesVisible(visible: boolean): void {
    for (const l of this.irisCircles) l.visible = visible
    this.headVector.visible = visible
    for (const v of this.gazeVectors) v.visible = visible
  }
}

function makeFatLineMaterial(color: number, linewidth: number): LineMaterial {
  return new LineMaterial({
    color,
    linewidth,
    worldUnits: true,
    depthTest: false,
  })
}

function makeCircleLine(color: number, linewidth: number): Line2 {
  const geo = new LineGeometry()
  geo.setPositions(new Float32Array((IRIS_CIRCLE_SEGMENTS + 1) * 3))
  return new Line2(geo, makeFatLineMaterial(color, linewidth))
}

function makeVectorLine(color: number, linewidth: number): Line2 {
  const geo = new LineGeometry()
  geo.setPositions(new Float32Array(2 * 3))
  return new Line2(geo, makeFatLineMaterial(color, linewidth))
}
