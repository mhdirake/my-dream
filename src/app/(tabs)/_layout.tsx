import { Colors, Fonts } from '@/constants/colors';
import { toFaDigits } from '@/lib/localization';
import { useAuth } from '@/lib/auth/AuthContext';
import { ChatToastProvider } from '@/components/ui/ChatToast';
import { NotificationToastProvider, useNotificationToast } from '@/components/ui/NotificationToast';
import { RestrictionBanner } from '@/components/moderation/RestrictionBanner';
import { UnreadProvider, useUnreadCtx } from '@/lib/chat/UnreadContext';
import { useModerationCtx } from '@/lib/moderation/ModerationContext';
import { useCentrifugoCtx } from '@/lib/chat/CentrifugoContext';
import {
  consumeLastPushResponse,
  registerAndSyncPushToken,
  showLocalNotificationFromRealtime,
  subscribeToPushResponses,
} from '@/lib/notifications/push';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router, Tabs } from 'expo-router';
import { Compass, Gift, Heart, MessageCircle, User } from 'lucide-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    <UnreadProvider>
      <ChatToastProvider>
        <NotificationToastProvider>
          <ModerationGate />
        </NotificationToastProvider>
      </ChatToastProvider>
    </UnreadProvider>
  );
}

function ModerationGate() {
  const { moderationStatus, isLoading, hasUnacknowledgedRestriction } = useModerationCtx();

  if (!isLoading && moderationStatus?.is_banned) {
    return <Redirect href="/moderation/banned" />;
  }

  if (!isLoading && hasUnacknowledgedRestriction) {
    return <Redirect href="/moderation/restriction-warning" />;
  }

  return <TabsNav />;
}

function TabsNav() {
  const insets = useSafeAreaInsets();
  const { totalUnread } = useUnreadCtx();
  const { session } = useAuth();
  const { addUserEventHandler } = useCentrifugoCtx();
  const { showNotificationToast } = useNotificationToast();

  useEffect(() => {
    if (!session?.accessToken) return;

    registerAndSyncPushToken(session.accessToken).catch(() => undefined);
    const openNotification = (notificationId: number) => {
      router.push({ pathname: '/notifications' as any, params: { open: String(notificationId) } });
    };
    const unsubscribe = subscribeToPushResponses(openNotification);
    consumeLastPushResponse(openNotification).catch(() => undefined);

    return unsubscribe;
  }, [session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken) return;

    return addUserEventHandler(data => {
      if (data.event !== 'notification.created' || AppState.currentState !== 'active') return;
      const payload = data.payload as {
        notification?: {
          id: number;
          type: string;
          title: string | null;
          body: string | null;
        };
      } | undefined;
      if (!payload?.notification?.id) return;

      showLocalNotificationFromRealtime(payload.notification).catch(() => undefined);
      showNotificationToast({
        title: payload.notification.title ?? 'My Dream',
        body: payload.notification.body ?? '',
        onPress: () => router.push({
          pathname: '/notifications' as any,
          params: { open: String(payload.notification!.id) },
        }),
      });
    });
  }, [addUserEventHandler, session?.accessToken, showNotificationToast]);

  return (
    <View style={{ flex: 1 }}>
      <RestrictionBanner />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.accent,
          tabBarInactiveTintColor: Colors.muted,
          tabBarStyle: {
            position: 'absolute',
            bottom: insets.bottom + 8,
            left: 16,
            right: 16,
            height: 68,
            borderRadius: 30,
            backgroundColor: 'rgba(16,19,26,0.96)',
            borderTopWidth: 0,
            elevation: 20,
            shadowColor: Colors.purple,
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
            tabBarBadge: totalUnread > 0 ? toFaDigits(totalUnread > 99 ? '99+' : totalUnread) : undefined,
            tabBarBadgeStyle: {
              backgroundColor: Colors.accent,
              fontSize: 10,
              fontFamily: Fonts.bold,
              minWidth: 18,
              height: 18,
            },
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
    </View>
  );
}

type LucideIcon = React.ComponentType<{ size?: number; color?: string; fill?: string; strokeWidth?: number }>;

function TabIcon({ icon: Icon, focused, fill = false }: { icon: LucideIcon; focused: boolean; fill?: boolean }) {
  if (focused) {
    return (
      <LinearGradient
        colors={Colors.gradColors}
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
          color={Colors.onAccent}
          fill={fill ? Colors.onAccent : 'transparent'}
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
