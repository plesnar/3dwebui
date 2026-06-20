import * as THREE from 'three'
import type { EyeTrackingController } from './EyeTrackingController'
import type { CameraOrbitController } from './CameraOrbitController'

export interface HeadGazeCameraOptions {
  /** How strongly head rotation maps to camera orbit angle. */
  headSensitivity?: number
  /** How strongly eye gaze maps to camera orbit angle (set 0 to disable). */
  gazeSensitivity?: number
}

// Number of initial frames to average for the neutral calibration pose.
const CALIBRATION_FRAMES = 10
// Exponential smoothing factor applied to the final yaw/pitch offset each frame.
// Lower = smoother but more lag. 0.10 ≈ 100 ms time constant at 60 fps.
const SMOOTHING = 0.05
// Offsets smaller than these (radians) are treated as zero to suppress drift.
const DEAD_ZONE_YAW = 0.025
const DEAD_ZONE_PITCH = 0.018

/**
 * Drives the camera orbit using head pose (from the facial transformation matrix)
 * and eye gaze (iris position relative to eye corners).
 *
 * The neutral pose is established by averaging the first CALIBRATION_FRAMES
 * detected frames. Call `calibrate()` to reset and re-capture the neutral.
 */
export class HeadGazeCameraController {
  private readonly eyeTracker: EyeTrackingController
  private readonly orbitController: CameraOrbitController
  private readonly headSensitivity: number
  private readonly gazeSensitivity: number

  private neutralHeadYaw = 0
  private neutralHeadPitch = 0
  private neutralGazeOffsetX = 0
  private neutralGazeOffsetY = 0
  private calibrated = false
  // Multi-frame calibration accumulators
  private calibFrameCount = 0
  private calibYawSum = 0
  private calibPitchSum = 0
  private calibGazeXSum = 0
  private calibGazeYSum = 0
  // Smoothed output sent to the orbit controller
  private smoothedYaw = 0
  private smoothedPitch = 0

  constructor(
    eyeTracker: EyeTrackingController,
    orbitController: CameraOrbitController,
    options: HeadGazeCameraOptions = {},
  ) {
    this.eyeTracker = eyeTracker
    this.orbitController = orbitController
    this.headSensitivity = options.headSensitivity ?? 2.0
    this.gazeSensitivity = options.gazeSensitivity ?? 4.0
  }

  /** Reset the neutral pose — the next CALIBRATION_FRAMES frames with a detected face become the new baseline. */
  calibrate(): void {
    this.calibrated = false
    this.calibFrameCount = 0
    this.calibYawSum = 0
    this.calibPitchSum = 0
    this.calibGazeXSum = 0
    this.calibGazeYSum = 0
    this.smoothedYaw = 0
    this.smoothedPitch = 0
    this.orbitController.setHeadOffset(0, 0)
  }

  update(): void {
    const result = this.eyeTracker.getLatestResult()
    if (!result?.faceLandmarks.length || !result.facialTransformationMatrixes?.length) {
      return
    }

    const m = result.facialTransformationMatrixes[0].data
    const lm = result.faceLandmarks[0]

    // ── Head pose ────────────────────────────────────────────────────────────
    // Column 2 of the row-major 4x4 matrix = face-forward direction expressed
    // in MediaPipe camera space, which is Y-up / Z-toward-viewer — identical
    // to Three.js convention. No sign conversion is needed.
    // At neutral (face looking straight at camera): fwdZ ≈ +1, giving
    // atan2(0, 1) = 0, which is the stable centre of atan2's range.
    const fwdX = m[2]
    const fwdY = m[6]
    const fwdZ = m[10]
    const fwdLen = Math.sqrt(fwdX * fwdX + fwdY * fwdY + fwdZ * fwdZ)
    if (fwdLen < 0.001) return

    // Yaw: horizontal angle in XZ plane (atan2(x, z) = 0 when looking in +Z = straight at camera)
    const headYaw = Math.atan2(fwdX / fwdLen, fwdZ / fwdLen)
    // Pitch: vertical elevation (positive = tilted up)
    const headPitch = Math.asin(THREE.MathUtils.clamp(fwdY / fwdLen, -1, 1))

    // ── Gaze ─────────────────────────────────────────────────────────────────
    // Normalise iris position against the corresponding eye-corner span so
    // the gaze offset is scale-independent and head-rotation-independent.
    // MediaPipe landmark indices used:
    //   Left eye:  outer corner = 33,  inner corner = 133,  iris center = 468
    //   Right eye: inner corner = 362, outer corner = 263,  iris center = 473
    const leftEyeCenterX = (lm[33].x + lm[133].x) / 2
    const leftEyeCenterY = (lm[33].y + lm[133].y) / 2
    const leftEyeWidth = Math.abs(lm[133].x - lm[33].x) || 0.01

    const rightEyeCenterX = (lm[362].x + lm[263].x) / 2
    const rightEyeCenterY = (lm[362].y + lm[263].y) / 2
    const rightEyeWidth = Math.abs(lm[263].x - lm[362].x) || 0.01

    const gazeOffsetX =
      ((lm[468].x - leftEyeCenterX) / leftEyeWidth +
        (lm[473].x - rightEyeCenterX) / rightEyeWidth) /
      2
    const gazeOffsetY =
      ((lm[468].y - leftEyeCenterY) / leftEyeWidth +
        (lm[473].y - rightEyeCenterY) / rightEyeWidth) /
      2

    // ── Calibration: average first CALIBRATION_FRAMES frames ─────────────────
    if (!this.calibrated) {
      this.calibYawSum += headYaw
      this.calibPitchSum += headPitch
      this.calibGazeXSum += gazeOffsetX
      this.calibGazeYSum += gazeOffsetY
      this.calibFrameCount++
      if (this.calibFrameCount >= CALIBRATION_FRAMES) {
        this.neutralHeadYaw = this.calibYawSum / CALIBRATION_FRAMES
        this.neutralHeadPitch = this.calibPitchSum / CALIBRATION_FRAMES
        this.neutralGazeOffsetX = this.calibGazeXSum / CALIBRATION_FRAMES
        this.neutralGazeOffsetY = this.calibGazeYSum / CALIBRATION_FRAMES
        this.calibrated = true
      }
      return
    }

    // ── Compose raw offsets ───────────────────────────────────────────────────
    // Head contribution is negated: the head works as a compensatory control
    // (parallax-window model). Turn head LEFT → camera pans RIGHT so the left
    // side of the scene becomes visible — like looking through a window.
    let rawYaw = -(headYaw - this.neutralHeadYaw) * this.headSensitivity
    let rawPitch = -(headPitch - this.neutralHeadPitch) * this.headSensitivity

    // Gaze contribution keeps the natural following sign: look right → pan right.
    rawYaw += (gazeOffsetX - this.neutralGazeOffsetX) * this.gazeSensitivity
    rawPitch += -(gazeOffsetY - this.neutralGazeOffsetY) * this.gazeSensitivity

    // ── Dead zone: ignore sub-threshold movement to prevent idle drift ────────
    if (Math.abs(rawYaw) < DEAD_ZONE_YAW) rawYaw = 0
    if (Math.abs(rawPitch) < DEAD_ZONE_PITCH) rawPitch = 0

    // ── Exponential smoothing: damps noise and prevents sudden jumps ──────────
    this.smoothedYaw += (rawYaw - this.smoothedYaw) * SMOOTHING
    this.smoothedPitch += (rawPitch - this.smoothedPitch) * SMOOTHING

    this.orbitController.setHeadOffset(this.smoothedYaw, this.smoothedPitch)
  }
}
