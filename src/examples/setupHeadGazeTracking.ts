import type { UIApp } from '../app/UIApp'
import { EyeTrackingController } from '../app/EyeTrackingController'
import { EyeTrackingOverlay } from '../app/EyeTrackingOverlay'
import { HeadGazeCameraController } from '../app/HeadGazeCameraController'

export function setupHeadGazeTracking(app: UIApp): void {
  const tracker = new EyeTrackingController({ fps: 15, pauseWhenHidden: true })
  tracker
    .init()
    .then(() => {
      if (app.closed) {
        tracker.dispose()
        return
      }
      app.once('close', () => tracker.dispose())

      const overlay = new EyeTrackingOverlay(app.sceneRoot, app.activeCamera, tracker)
      const refreshOverlay = (): void => overlay.setVisible(app.debug && app.trackingEnabled)
      refreshOverlay()
      app.on('debugchange', refreshOverlay)
      app.on('trackingchange', refreshOverlay)
      app.registerUpdateCallback(() => {
        if (app.trackingEnabled) {
          overlay.update()
        }
      })

      if (app.orbitController) {
        const headGaze = new HeadGazeCameraController(tracker, app.orbitController)
        app.registerUpdateCallback(() => {
          if (app.trackingEnabled) {
            headGaze.update()
          }
        })
        app.on('trackingchange', (event) => {
          if (!event.enabled) {
            headGaze.calibrate()
          }
        })
      }
    })
    .catch((err: unknown) => {
      tracker.dispose()
      console.warn('Eye tracking unavailable:', err)
    })
}