"use client";

import { useState, useEffect } from "react";
import {
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermissionStatus,
} from "@/utils/notification-permission";

const PERMISSION_CHECK_INTERVAL = 1000;

export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermissionStatus>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    const checkPermission = () => {
      const currentPermission = getNotificationPermission();
      setPermission(currentPermission);
    };

    // Initial check
    checkPermission();

    // Periodic check for permission changes
    const interval = setInterval(checkPermission, PERMISSION_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const requestPermission = async (): Promise<NotificationPermission> => {
    setIsRequesting(true);
    try {
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);
      return newPermission;
    } finally {
      setIsRequesting(false);
    }
  };

  return {
    permission,
    isRequesting,
    requestPermission,
  };
}
