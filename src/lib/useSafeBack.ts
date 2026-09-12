import { Href, router } from 'expo-router';

export function useSafeBack(fallback: Href = '/') {
  return () => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  };
}
