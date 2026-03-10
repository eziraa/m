declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        ready: () => void;
        expand: () => void;
      };
    };
  }
}

export function getTelegramInitData(): string {
  if (typeof window === "undefined") return "";
  return window.Telegram?.WebApp?.initData || "";
}

export function initTelegramWebApp() {
  if (typeof window === "undefined") return;
  const app = window.Telegram?.WebApp;
  if (!app) return;
  app.ready();
  app.expand();
}
