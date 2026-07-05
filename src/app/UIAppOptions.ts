/** Camera configuration for {@link UIApp}. */
export type UIAppCameraOptions = {
  fov?: number
  near?: number
  far?: number
  position?: { x: number; y: number; z: number }
}

export type UIAppOptions = {
  /** Element the renderer canvas is appended to. Defaults to document.body. */
  container?: HTMLElement
  /** Scene background colour. Defaults to 0x111827. */
  backgroundColor?: number
  /**
   * URL of an equirectangular image to use as the scene background. Supports
   * `.exr` (loaded via `EXRLoader`) as well as standard image formats. The
   * {@link backgroundColor} is shown until the image finishes loading.
   */
  backgroundImage?: string
  /**
   * Also use {@link backgroundImage} as the scene environment map (PMREM) so
   * lit materials pick up realistic reflections. Defaults to true.
   */
  backgroundImageAsEnvironment?: boolean
  /** Perspective camera configuration. */
  camera?: UIAppCameraOptions
  /** Enables WebGL antialiasing. Defaults to true. */
  antialias?: boolean
  /** Device pixel ratio override. Defaults to window.devicePixelRatio. */
  pixelRatio?: number
  /**
   * Exposure for the ACES filmic tone mapping applied to the renderer.
   * Higher values brighten the image. Defaults to 1.
   */
  toneMappingExposure?: number
  /** Enables empty-space camera orbit interaction. Defaults to true. */
  enableCameraOrbit?: boolean
  /** Enables head/eye tracking. Toggle at runtime with the "H" key. Defaults to false. */
  enableTracking?: boolean
  /** Starts the render loop immediately. Defaults to true. */
  autoStart?: boolean
  /** Starts the app in debug mode (camera feed + FPS counter). Defaults to false. */
  debug?: boolean
}
