import { useAuth } from '@/lib/auth/AuthContext';
import { Colors } from '@/constants/colors';
import { Stack } from 'expo-router';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function OnboardingLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_left' }} />
  );
}
