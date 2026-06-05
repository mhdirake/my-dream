import { Colors, Fonts } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, Tabs } from 'expo-router';
import { Compass, Gift, Heart, MessageCircle, User } from 'lucide-react-native';
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
          bottom: 20,
          left: 16,
          right: 16,
          height: 68,
          borderRadius: 30,
          backgroundColor: 'rgba(255,251,249,0.96)',
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#6C4AB6',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          paddingBottom: 0,
          paddingTop: 0,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.semiBold,
          fontSize: 9,
          marginTop: 0,
          marginBottom: 8,
        },
        tabBarItemStyle: {
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'کشف',
          tabBarLabel: 'کشف',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={Compass} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="likes"
        options={{
          title: 'مَچ',
          tabBarLabel: 'مَچ',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={Heart} focused={focused} fill={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'پیام',
          tabBarLabel: 'پیام',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={MessageCircle} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="gifts"
        options={{
          title: 'هدیه',
          tabBarLabel: 'هدیه',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={Gift} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'من',
          tabBarLabel: 'من',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={User} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

type LucideIcon = React.ComponentType<{ size?: number; color?: string; fill?: string; strokeWidth?: number }>;

function TabIcon({ icon: Icon, focused, fill = false }: { icon: LucideIcon; focused: boolean; fill?: boolean }) {
  if (focused) {
    return (
      <LinearGradient
        colors={['#D94F70', '#6C4AB6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 40,
          height: 28,
          borderRadius: 14,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Icon
          size={18}
          color="#fff"
          fill={fill ? '#fff' : 'transparent'}
          strokeWidth={2}
        />
      </LinearGradient>
    );
  }

  return (
    <Icon
      size={20}
      color={Colors.muted}
      fill="transparent"
      strokeWidth={1.75}
    />
  );
}
