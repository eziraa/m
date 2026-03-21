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
  private static instance: AudioController | null = null;
  private audio: HTMLAudioElement | null = null;
  private currentSrc: string | null = null;
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
  }

  preload(src: string, options: AudioControllerOptions = {}): void {
    if (typeof window === "undefined") return;
    this.ensureAudio(src, options);
  }

  async play(src: string, options: PlayOptions = {}): Promise<boolean> {
    if (typeof window === "undefined") return false;
    const audio = this.ensureAudio(src, options);

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
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
      this.audio.load();
    }
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
    if (this.audio) {
      this.audio.muted = muted;
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
    if (!this.audio || this.currentSrc !== src) {
      if (this.audio) {
        this.audio.pause();
      }
      this.audio = new Audio(src);
      this.currentSrc = src;
    }

    this.audio.muted = this.muted;

    if (options.preload) this.audio.preload = options.preload;
    if (options.volume !== undefined) this.audio.volume = options.volume;
    if (options.loop !== undefined) this.audio.loop = options.loop;
    if (options.playbackRate !== undefined) {
      this.audio.playbackRate = options.playbackRate;
    }

    return this.audio;
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
