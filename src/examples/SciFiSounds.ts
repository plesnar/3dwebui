function createAudio(file: string, volume: number): HTMLAudioElement {
  const audio = new Audio(`${import.meta.env.BASE_URL}sounds/${file}`)
  audio.preload = 'auto'
  audio.volume = volume
  return audio
}

export class SciFiSounds {
  private readonly hover = createAudio('hover1.wav', 0.3)
  private readonly click = {
    default: createAudio('click2.ogg', 0.4),
    select1: createAudio('select1.mp3', 0.4),
    select2: createAudio('select2.mp3', 0.4),
  }
  private readonly radar = createAudio('radar.wav', 0.2)
  private radarActive = false
  private disposed = false

  public constructor() {
    this.radar.loop = true
  }

  public playHover(): void {
    this.play(this.hover)
  }

  public playClick(variant: 'default' | 'select1' | 'select2' = 'default'): void {
    this.play(this.click[variant])
  }

  public setRadarActive(active: boolean): void {
    if (this.disposed || this.radarActive === active) return
    this.radarActive = active
    if (active) {
      void this.radar.play().catch(() => {})
    } else {
      this.radar.pause()
      this.radar.currentTime = 0
    }
  }

  public dispose(): void {
    if (this.disposed) return
    this.disposed = true
    for (const audio of [this.hover, ...Object.values(this.click), this.radar]) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
  }

  private play(audio: HTMLAudioElement): void {
    if (this.disposed) return
    audio.currentTime = 0
    void audio.play().catch(() => {})
  }
}