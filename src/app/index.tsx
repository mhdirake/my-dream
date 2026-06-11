import { useAuth } from '@/lib/auth/AuthContext';
import { onboardingApi } from '@/lib/api/onboarding';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '@/constants/colors';

export default function Index() {
  const { isAuthenticated, isLoading, session } = useAuth();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/onboarding' as any);
      return;
    }

    setChecking(true);
    onboardingApi
      .getStatus(session!.accessToken)
      .then(status => {
        const { flags } = status;
        if (flags.must_complete_required_profile || flags.force_required_profile_screen) {
          router.replace('/profile-setup/basic-info' as any);
        } else if (
          flags.must_upload_profile_photo ||
          flags.force_profile_photo_screen ||
          flags.must_replace_profile_photo
        ) {
          router.replace('/profile-setup/photo' as any);
        } else {
          router.replace('/(tabs)' as any);
        }
      })
      .catch(() => {
        router.replace('/(tabs)' as any);
      })
      .finally(() => setChecking(false));
  }, [isLoading, isAuthenticated]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
      <ActivityIndicator color={Colors.accent} />
    </View>
  );
}
