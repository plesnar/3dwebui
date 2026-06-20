import { FaceLandmarker, type FaceLandmarkerResult, FilesetResolver } from '@mediapipe/tasks-vision'

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

export interface EyeTrackingOptions {
  /**
   * Target frames per second for face-landmark inference. Lower values reduce
   * CPU/GPU load and improve battery life. Set to 0 for uncapped (every frame).
   */
  fps?: number
  /**
   * When true (default), the camera stream is stopped while the document is
   * hidden (tab in background / window minimized) and re-acquired on return.
   */
  pauseWhenHidden?: boolean
}

export class EyeTrackingController {
  private video: HTMLVideoElement | null = null
  private landmarker: FaceLandmarker | null = null
  private latestResult: FaceLandmarkerResult | null = null
  private running = false

  private readonly frameInterval: number
  private readonly pauseWhenHidden: boolean
  private lastInferenceTime = 0

  private stream: MediaStream | null = null
  private cameraActive = false

  constructor(options: EyeTrackingOptions = {}) {
    const fps = options.fps ?? 20
    this.frameInterval = fps > 0 ? 1000 / fps : 0
    this.pauseWhenHidden = options.pauseWhenHidden ?? true
  }

  async init(): Promise<void> {
    this.video = document.createElement('video')
    this.video.playsInline = true
    this.video.muted = true
    this.video.style.display = 'none'
    document.body.appendChild(this.video)

    await this.startCamera()

    const filesetResolver = await FilesetResolver.forVisionTasks(WASM_URL)
    this.landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'GPU',
      },
      outputFacialTransformationMatrixes: true,
      runningMode: 'VIDEO',
      numFaces: 1,
    })

    if (this.pauseWhenHidden) {
      document.addEventListener('visibilitychange', this.handleVisibilityChange)
    }

    this.running = true
    this.runInferenceLoop()
  }

  getVideo(): HTMLVideoElement {
    if (!this.video) {
      throw new Error('EyeTrackingController not initialized — call init() first')
    }
    return this.video
  }

  getLatestResult(): FaceLandmarkerResult | null {
    return this.latestResult
  }

  /** Stop inference, release the camera, and remove listeners. */
  dispose(): void {
    this.running = false
    if (this.pauseWhenHidden) {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    }
    this.stopCamera()
    this.landmarker?.close()
    this.landmarker = null
    this.video?.remove()
    this.video = null
    this.latestResult = null
  }

  private async startCamera(): Promise<void> {
    if (this.cameraActive || !this.video) {
      return
    }
    this.stream = await navigator.mediaDevices.getUserMedia({ video: true })
    this.video.srcObject = this.stream
    await this.video.play()
    this.cameraActive = true
  }

  private stopCamera(): void {
    if (!this.cameraActive) {
      return
    }
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
    if (this.video) {
      this.video.srcObject = null
    }
    this.cameraActive = false
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.stopCamera()
    } else if (this.running) {
      void this.startCamera().catch((err: unknown) => {
        console.warn('Failed to restart camera after visibility change:', err)
      })
    }
  }

  private runInferenceLoop = (): void => {
    if (!this.running) {
      return
    }

    requestAnimationFrame(this.runInferenceLoop)

    if (!this.landmarker || !this.cameraActive || !this.video || this.video.readyState < 2) {
      return
    }

    const now = performance.now()
    if (this.frameInterval > 0 && now - this.lastInferenceTime < this.frameInterval) {
      return
    }
    this.lastInferenceTime = now

    this.latestResult = this.landmarker.detectForVideo(this.video, now)
  }
}
