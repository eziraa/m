const AUDIO_MUTED_KEY = "mella_audio_muted";

export class AudioController {
  private static instance: AudioController;
  private muted = false;

  private constructor() {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(AUDIO_MUTED_KEY);
      this.muted = saved === "1";
    }
  }

  static getInstance() {
    if (!AudioController.instance) {
      AudioController.instance = new AudioController();
    }
    return AudioController.instance;
  }

  isMuted() {
    return this.muted;
  }

  toggleMuted() {
    this.muted = !this.muted;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AUDIO_MUTED_KEY, this.muted ? "1" : "0");
    }
    return this.muted;
  }
}
