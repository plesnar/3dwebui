import { FaceLandmarker, type FaceLandmarkerResult, FilesetResolver } from '@mediapipe/tasks-vision'

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

export class EyeTrackingController {
  private video: HTMLVideoElement | null = null
  private landmarker: FaceLandmarker | null = null
  private latestResult: FaceLandmarkerResult | null = null
  private running = false

  async init(): Promise<void> {
    this.video = document.createElement('video')
    this.video.playsInline = true
    this.video.muted = true
    this.video.style.display = 'none'
    document.body.appendChild(this.video)

    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    this.video.srcObject = stream
    await this.video.play()

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

  private runInferenceLoop = (): void => {
    if (!this.running || !this.landmarker || !this.video || this.video.readyState < 2) {
      requestAnimationFrame(this.runInferenceLoop)
      return
    }

    this.latestResult = this.landmarker.detectForVideo(this.video, performance.now())
    requestAnimationFrame(this.runInferenceLoop)
  }
}
