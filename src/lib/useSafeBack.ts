import { router, useRootNavigationState } from 'expo-router';

export function useSafeBack(fallback: string = '/') {
  const navState = useRootNavigationState();
  return () => {
    if ((navState?.index ?? 0) > 0) router.back();
    else router.replace(fallback as any);
  };
}
