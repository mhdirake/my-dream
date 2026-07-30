import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from '../api/client';

export type PushPreferences = {
  enabled: boolean;
  active_devices: number;
};

type NotificationsModule = typeof import('expo-notifications');
type NotificationResponse = Awaited<
  ReturnType<NotificationsModule['getLastNotificationResponseAsync']>
>;

// Remote push is unavailable in Expo Go on Android. Import expo-notifications
// lazily so Expo Go never evaluates the native module.
const isExpoGo = Constants.appOwnership === 'expo';
let notificationsPromise: Promise<NotificationsModule | null> | null = null;

async function getNotifications(): Promise<NotificationsModule | null> {
  if (isExpoGo || Platform.OS === 'web') return null;

  notificationsPromise ??= import('expo-notifications')
    .then(Notifications => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
      return Notifications;
    })
    .catch(() => null);

  return notificationsPromise;
}

async function ensureAndroidChannel() {
  const Notifications = await getNotifications();
  if (Platform.OS !== 'android' || !Notifications) return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'اعلان‌های My Dream',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
  });
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  const Notifications = await getNotifications();
  if (!Notifications || Platform.OS === 'web') return null;
  try {
    await ensureAndroidChannel();

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted) {
      const requested = await Notifications.requestPermissionsAsync();
      granted = requested.granted;
    }
    if (!granted) return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    return token;
  } catch {
    return null;
  }
}

export async function showLocalNotificationFromRealtime(notification: {
  id: number;
  type: string;
  title: string | null;
  body: string | null;
}): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications || Platform.OS === 'web') return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title ?? 'My Dream',
      body: notification.body ?? '',
      data: {
        notification_id: notification.id,
        type: notification.type,
        url: `/notifications?open=${notification.id}`,
      },
    },
    trigger: null,
  });
}

export async function getPushPreferences(authToken: string): Promise<PushPreferences> {
  const response = await api.get<{ data: PushPreferences }>('/api/client/push-notifications/preferences', authToken);
  return response.data;
}

export async function setPushPreferences(authToken: string, enabled: boolean): Promise<PushPreferences> {
  const response = await api.patch<{ data: PushPreferences }>(
    '/api/client/push-notifications/preferences',
    { enabled },
    authToken,
  );
  return response.data;
}

export async function registerAndSyncPushToken(authToken: string): Promise<void> {
  const preferences = await getPushPreferences(authToken).catch(() => null);
  if (preferences && !preferences.enabled) return;

  const token = await registerForPushNotificationsAsync();
  if (!token) return;
  await api.post('/api/client/push-tokens', { token, platform: Platform.OS }, authToken);
}

function notificationIdFromResponse(response: NonNullable<NotificationResponse>): number | null {
  const value = response.notification.request.content.data?.notification_id;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function subscribeToPushResponses(onOpen: (notificationId: number) => void): () => void {
  if (isExpoGo || Platform.OS === 'web') return () => undefined;

  let subscription: { remove: () => void } | null = null;
  let cancelled = false;

  getNotifications().then(Notifications => {
    if (!Notifications || cancelled) return;
    subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const notificationId = notificationIdFromResponse(response);
      if (notificationId) onOpen(notificationId);
    });
  });

  return () => {
    cancelled = true;
    subscription?.remove();
  };
}

export async function consumeLastPushResponse(onOpen: (notificationId: number) => void): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return;

  const notificationId = notificationIdFromResponse(response);
  if (notificationId) onOpen(notificationId);
  await Notifications.clearLastNotificationResponseAsync();
}
