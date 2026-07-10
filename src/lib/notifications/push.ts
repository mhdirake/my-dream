import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from '../api/client';

// expo-notifications remote push is unsupported in Expo Go (Android since SDK 53);
// merely importing the module there throws, so load it lazily and only outside Expo Go.
const isExpoGo = Constants.appOwnership === 'expo';
const Notifications = isExpoGo
  ? null
  : (require('expo-notifications') as typeof import('expo-notifications'));

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android' || !Notifications) return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'اعلان‌های My Dream',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
  });
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Notifications) return null;
  try {
    await ensureAndroidChannel();

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return null;

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId) return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    return token;
  } catch {
    return null;
  }
}

export async function registerAndSyncPushToken(authToken: string): Promise<void> {
  const token = await registerForPushNotificationsAsync();
  if (!token) return;
  try {
    await api.post('/api/client/push-tokens', { token, platform: Platform.OS }, authToken);
  } catch {
    // backend endpoint may not exist yet — silent, non-blocking
  }
}
