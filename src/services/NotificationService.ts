// src/services/NotificationService.ts

const APP_ICON = '/images/DineInGo favicon.png';

/**
 * Checks if the browser supports notifications.
 * @returns {boolean} True if notifications are supported.
 */
function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

/**
 * Gets the current notification permission status.
 * @returns {NotificationPermission} The current permission status.
 */
function getPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Requests notification permission from the user.
 * @returns {Promise<NotificationPermission>} The permission status after the request.
 */
async function requestPermission(): Promise<NotificationPermission> {
  const status = getPermissionStatus();
  if (status === 'unsupported' || status === 'denied') {
    return status;
  }
  
  return Notification.requestPermission();
}

/**
 * Shows a browser notification.
 * @param {string} title - The title of the notification.
 * @param {NotificationOptions} [options] - Optional notification options (e.g., body, icon).
 */
function showNotification(title: string, options?: NotificationOptions): void {
  const permission = getPermissionStatus();
  if (permission === 'granted') {
    new Notification(title, {
      ...options,
      icon: APP_ICON,
    });
  }
}

export const NotificationService = {
  isSupported: isNotificationSupported,
  getPermission: getPermissionStatus,
  requestPermission: requestPermission,
  show: showNotification,
}; 