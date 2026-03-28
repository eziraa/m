type AudioPreload = "auto" | "metadata" | "none";

type AudioControllerOptions = {
  volume?: number;
  loop?: boolean;
  playbackRate?: number;
  preload?: AudioPreload;
};

type PlayOptions = AudioControllerOptions & {
  restart?: boolean;
};

export class AudioController {
  private static readonly MUTE_STORAGE_KEY = "bingo_sound_muted";
  private static readonly SILENT_AUDIO_SRC =
    "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";
  private static instance: AudioController | null = null;
  private audio: HTMLAudioElement | null = null;
  private currentSrc: string | null = null;
  private readonly audioCache = new Map<string, HTMLAudioElement>();
  private muted = false;
  private unlocked = false;

  private constructor() {
    this.loadMutedFromStorage();
  }

  static getInstance(new_instance: boolean = false): AudioController {
    if (new_instance) {
      const controller = new AudioController();
      if (AudioController.instance?.muted) {
        controller.mute();
      }
      return controller;
    }
    if (!AudioController.instance) {
      AudioController.instance = new AudioController();
    }
    return AudioController.instance;
  }

  isMuted(): boolean {
    return this.muted;
  }

  unlock(): void {
    this.unlocked = true;
    void this.primeAudioPlayback();
  }

  preload(src: string, options: AudioControllerOptions = {}): void {
    if (typeof window === "undefined") return;
    const audio = this.ensureAudio(src, options);
    audio.load();
  }

  async play(src: string, options: PlayOptions = {}): Promise<boolean> {
    if (typeof window === "undefined") return false;
    const audio = this.ensureAudio(src, options);
    this.audio = audio;
    this.currentSrc = src;

    if (options.restart || audio.currentTime === audio.duration) {
      audio.currentTime = 0;
    }

    if (this.muted) {
      audio.muted = true;
    }

    try {
      await audio.play();
      return true;
    } catch (error) {
      if (!this.unlocked) {
        return false;
      }
      return false;
    }
  }

  pause(): void {
    if (this.audio) {
      this.audio.pause();
    }
  }

  resume(): void {
    if (this.audio) {
      void this.audio.play();
    }
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }

  destroy(): void {
    for (const audio of this.audioCache.values()) {
      audio.pause();
      audio.src = "";
      audio.load();
    }
    this.audioCache.clear();
    this.audio = null;
    this.currentSrc = null;
  }

  setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    if (this.audio) {
      this.audio.volume = clamped;
    }
  }

  mute(): void {
    this.setMuted(true);
  }

  unmute(): void {
    this.setMuted(false);
  }

  setMuted(muted: boolean, persist: boolean = true): void {
    this.muted = muted;
    for (const audio of this.audioCache.values()) {
      audio.muted = muted;
    }
    if (persist) {
      this.persistMuted();
    }
  }

  toggleMuted(persist: boolean = true): boolean {
    const next = !this.muted;
    this.setMuted(next, persist);
    return next;
  }

  setLoop(loop: boolean): void {
    if (this.audio) {
      this.audio.loop = loop;
    }
  }

  setPlaybackRate(playbackRate: number): void {
    if (this.audio) {
      this.audio.playbackRate = playbackRate;
    }
  }

  isPlaying(): boolean {
    return !!this.audio && !this.audio.paused;
  }

  getCurrentSrc(): string | null {
    return this.currentSrc;
  }

  private ensureAudio(
    src: string,
    options: AudioControllerOptions,
  ): HTMLAudioElement {
    let audio = this.audioCache.get(src);
    if (!audio) {
      audio = new Audio(src);
      this.audioCache.set(src, audio);
    }

    audio.muted = this.muted;

    if (options.preload) audio.preload = options.preload;
    if (options.volume !== undefined) audio.volume = options.volume;
    if (options.loop !== undefined) audio.loop = options.loop;
    if (options.playbackRate !== undefined) {
      audio.playbackRate = options.playbackRate;
    }

    return audio;
  }

  private async primeAudioPlayback(): Promise<void> {
    if (typeof window === "undefined") return;

    const audio = this.ensureAudio(AudioController.SILENT_AUDIO_SRC, {
      preload: "auto",
    });
    const previousMuted = audio.muted;
    const previousVolume = audio.volume;

    audio.muted = true;
    audio.volume = 0;
    audio.currentTime = 0;

    try {
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // Browsers can still reject priming outside a direct gesture.
    } finally {
      audio.muted = this.muted || previousMuted;
      audio.volume = previousVolume;
    }
  }

  private loadMutedFromStorage(): void {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(
        AudioController.MUTE_STORAGE_KEY,
      );
      if (stored === "true" || stored === "false") {
        this.muted = stored === "true";
      }
    } catch {
      this.muted = false;
    }
  }

  private persistMuted(): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        AudioController.MUTE_STORAGE_KEY,
        String(this.muted),
      );
    } catch {
      // ignore storage failures
    }
  }
}
