import { Colors, Fonts } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.muted,
        tabBarStyle: {
          position: 'absolute',
          bottom: 16,
          left: 14,
          right: 14,
          height: 64,
          borderRadius: 26,
          backgroundColor: 'rgba(255,255,255,0.92)',
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: Colors.purple,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.18,
          shadowRadius: 14,
          paddingBottom: 0,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.semiBold,
          fontSize: 9.5,
          marginTop: -2,
        },
        tabBarIconStyle: { marginTop: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'کشف', tabBarLabel: 'کشف', tabBarIcon: ({ color }) => <TabIcon emoji="🧭" color={color} /> }}
      />
      <Tabs.Screen
        name="likes"
        options={{ title: 'مَچ', tabBarLabel: 'مَچ', tabBarIcon: ({ color }) => <TabIcon emoji="❤️" color={color} /> }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: 'پیام', tabBarLabel: 'پیام', tabBarIcon: ({ color }) => <TabIcon emoji="💬" color={color} /> }}
      />
      <Tabs.Screen
        name="gifts"
        options={{ title: 'هدیه', tabBarLabel: 'هدیه', tabBarIcon: ({ color }) => <TabIcon emoji="🎁" color={color} /> }}
      />
      <Tabs.Screen
        name="me"
        options={{ title: 'من', tabBarLabel: 'من', tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} /> }}
      />
    </Tabs>
  );
}

function TabIcon({ emoji }: { emoji: string; color?: unknown }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}
