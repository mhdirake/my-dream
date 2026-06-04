import { useAuth } from '@/lib/auth/AuthContext';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '@/constants/colors';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/(tabs)' : '/onboarding'} />;
}
