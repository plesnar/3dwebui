import * as THREE from 'three'
import type { EyeTrackingController } from './EyeTrackingController'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

const IRIS_CIRCLE_SEGMENTS = 32
const ANCHOR_DISTANCE = 2.0
const ANCHOR_PADDING = 0.06

export class EyeTrackingOverlay {
  private readonly group = new THREE.Group()
  private readonly feedMesh: THREE.Mesh
  private readonly videoTexture: THREE.VideoTexture
  private readonly irisCircles: [THREE.LineLoop, THREE.LineLoop]
  private readonly controller: EyeTrackingController
  private overlayWidth: number
  private overlayHeight: number

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, controller: EyeTrackingController, overlayWidth = 1.5) {
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

    this.irisCircles = [makeCircleLine(), makeCircleLine()]

    for (const obj of this.irisCircles) {
      obj.renderOrder = 1
      ;(obj.material as THREE.LineBasicMaterial).depthTest = false
      this.group.add(obj)
    }

    this.setLinesVisible(false)

    // Parent the group to the camera so it is fixed in screen space.
    // Adding the camera to the scene is required for its children to be rendered.
    scene.add(camera)
    camera.add(this.group)
    this.positionInCorner(camera)
    window.addEventListener('resize', () => this.positionInCorner(camera))
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
    circle: THREE.LineLoop,
    landmarks: NormalizedLandmark[],
    centerIdx: number,
    edgeIdx: number,
  ): void {
    const center = this.landmarkToLocal(landmarks[centerIdx])
    const edge = this.landmarkToLocal(landmarks[edgeIdx])
    const radius = center.distanceTo(edge)

    const pos = circle.geometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < IRIS_CIRCLE_SEGMENTS; i++) {
      const angle = (i / IRIS_CIRCLE_SEGMENTS) * Math.PI * 2
      pos.setXYZ(i, center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * radius, center.z)
    }
    pos.needsUpdate = true
  }

  private setLinesVisible(visible: boolean): void {
    for (const l of this.irisCircles) l.visible = visible
  }
}

function makeCircleLine(): THREE.LineLoop {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(IRIS_CIRCLE_SEGMENTS * 3), 3),
  )
  return new THREE.LineLoop(geo, new THREE.LineBasicMaterial({ color: 0xffffff }))
}
