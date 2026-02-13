/**
 * Device detection utilities
 */

export const isIOS = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
};

export const isIOSStandalone = (): boolean => {
  if (typeof window === "undefined") return false;

  // Type-safe check for standalone mode
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return isIOS() && nav.standalone === true;
};

export const isNotificationSupported = (): boolean => {
  return (
    typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window
  );
};
