import { Platform } from 'react-native';

const DEV_PROXY_PATH = '/__dev_api';

export function apiUrl(path: string): string {
  if (__DEV__ && Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${DEV_PROXY_PATH}${path}`;
  }

  return `${process.env.EXPO_PUBLIC_API_URL}${path}`;
}
