import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import type { PlannedNotification } from '../engine/notificationPlan';

export const CHANNELS = {
  alerts: 'fast-alerts',
  reminders: 'reminders',
} as const;

const PLAN_PREFIX = 'cadence-plan-';
const DAILY_REMINDER_ID = 'cadence-daily-reminder';

let configured = false;

/** Call once at startup. Safe to call again. */
export async function configureNotifications(): Promise<void> {
  if (configured) return;
  configured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNELS.alerts, {
      name: 'Fast alerts',
      description: 'Zone changes, almost there, and goal reached.',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 120, 180],
      lightColor: '#F07C25',
    });
    await Notifications.setNotificationChannelAsync(CHANNELS.reminders, {
      name: 'Reminders',
      description: 'Daily reminder to start fasting and eating-window alerts.',
      importance: AndroidImportance.DEFAULT,
    });
  }
}

/** Asks once, at the moment it matters (the first fast), never at launch. */
export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return next.granted;
}

/**
 * Replaces every Cadence one-off notification with the given plan.
 * Ids are stable, so this is idempotent.
 */
export async function applyPlan(plan: PlannedNotification[]): Promise<void> {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    pending
      .filter((n) => n.identifier.startsWith(PLAN_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  for (const n of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: PLAN_PREFIX + n.id,
      content: {
        title: n.title,
        body: n.body,
        data: { kind: n.kind, url: 'cadence:///' },
        interruptionLevel: n.timeSensitive ? 'timeSensitive' : 'active',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: n.at,
        channelId: n.kind === 'window' ? CHANNELS.reminders : CHANNELS.alerts,
      },
    });
  }
}

export async function setDailyReminder(time: { hour: number; minute: number } | null): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
  if (!time) return;
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: { title: 'Time to start your fast', body: 'Tap to start the timer.', data: { url: 'cadence:///' } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: time.hour,
      minute: time.minute,
      channelId: CHANNELS.reminders,
    },
  });
}
