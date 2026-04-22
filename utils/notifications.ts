// ─── Notification Utilities ───────────────────────────────────────────────────
// expo-notifications requires a development build on Android — it is not
// compatible with Expo Go on Android (SDK 53+) due to push-token
// auto-registration being removed from the store client.
//
// This file is a no-op stub so the rest of the app compiles and runs cleanly.
// To enable notifications:
//   1. Run: npx expo install expo-notifications
//   2. Build with: npx expo run:android  (requires JAVA_HOME set)
//      or:         eas build -p android --profile development
//   3. Replace this file with the full implementation from utils/notifications.full.ts
//      (or re-implement using the function signatures below).

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

/** Always false until a proper development build is used. */
export function notificationsSupported(): boolean {
  return false;
}

/** No-op stub — returns 'denied' so the UI shows the info banner. */
export async function requestNotificationPermissions(): Promise<PermissionStatus> {
  return 'denied';
}

/** No-op stub. */
export async function scheduleDailyReminder(_hour: number, _minute: number): Promise<void> {
  return;
}

/** No-op stub. */
export async function scheduleTargetReminder(
  _habitName:   string,
  _targetCount: number,
  _period:      'daily' | 'weekly' | 'monthly',
): Promise<void> {
  return;
}

/** No-op stub. */
export async function cancelAllNotifications(): Promise<void> {
  return;
}
