// Telegram WebApp SDK Bridge for Nimiq Arena
// Automatically optimizes viewport, theme, and user identity when running inside Telegram.

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export function isTelegramWebApp(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as any).Telegram?.WebApp?.initData);
}

export function getTelegramWebApp() {
  if (typeof window === "undefined") return null;
  return (window as any).Telegram?.WebApp ?? null;
}

export function getTelegramUser(): TelegramUser | null {
  const tg = getTelegramWebApp();
  if (!tg?.initDataUnsafe?.user) return null;
  return tg.initDataUnsafe.user as TelegramUser;
}

export function initTelegramApp() {
  const tg = getTelegramWebApp();
  if (!tg) return false;

  try {
    // Notify Telegram client that Mini App is initialized
    tg.ready();

    // Expand to full available mobile screen height
    tg.expand();

    // Prevent accidental swipe-down discard during intense gameplay
    if (typeof tg.enableClosingConfirmation === "function") {
      tg.enableClosingConfirmation();
    }

    // Set header color matching Arena theme
    if (typeof tg.setHeaderColor === "function") {
      tg.setHeaderColor("#090d16");
    }

    // Set background color matching Arena theme
    if (typeof tg.setBackgroundColor === "function") {
      tg.setBackgroundColor("#090d16");
    }

    return true;
  } catch (err) {
    console.warn("[Telegram MiniApp] Init warning:", err);
    return false;
  }
}
