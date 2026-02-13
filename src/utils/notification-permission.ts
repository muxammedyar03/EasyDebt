/**
 * Notification permission utilities
 */

export type NotificationPermissionStatus = NotificationPermission | null;

export const getNotificationPermission = (): NotificationPermissionStatus => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }
  return Notification.permission;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    throw new Error("Notification API is not supported");
  }
  return await Notification.requestPermission();
};

export const isPermissionGranted = (permission: NotificationPermissionStatus): boolean => {
  return permission === "granted";
};

export const isPermissionDenied = (permission: NotificationPermissionStatus): boolean => {
  return permission === "denied";
};

export const isPermissionDefault = (permission: NotificationPermissionStatus): boolean => {
  return permission === "default";
};
