import { AppState, Platform } from 'react-native';

export function watchProfileResume(refresh: () => void): () => void {
  const refreshVisible = () => {
    if (AppState.currentState === 'background') return;
    if (Platform.OS === 'web' && typeof document !== 'undefined' && document.hidden) return;
    refresh();
  };
  const subscription = AppState.addEventListener('change', state => {
    if (state === 'active') refreshVisible();
  });
  const web = Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined';
  if (web) {
    window.addEventListener('focus', refreshVisible);
    document.addEventListener('visibilitychange', refreshVisible);
  }
  return () => {
    subscription.remove();
    if (web) {
      window.removeEventListener('focus', refreshVisible);
      document.removeEventListener('visibilitychange', refreshVisible);
    }
  };
}
