import { Avatar } from '@/components/ui/Avatar';
import { AlertPortal } from './AlertLayer';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { Conversation, ConversationUser } from '@/lib/api/chat';
import { router } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ToastData {
  conv: Conversation;
  other: ConversationUser;
}

interface ChatToastCtxValue {
  showChatToast: (conv: Conversation, other: ConversationUser) => void;
}

const ChatToastContext = createContext<ChatToastCtxValue>({ showChatToast: () => {} });

export function ChatToastProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<ToastData | null>(null);
  const translateY = useSharedValue(-140);
  const opacity = useSharedValue(0);
  const progress = useSharedValue(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const hide = useCallback(() => {
    translateY.set(withTiming(-140, { duration: 280 }));
    opacity.set(withTiming(0, { duration: 280 }));
  }, [translateY, opacity]);

  const showChatToast = useCallback((conv: Conversation, other: ConversationUser) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    setData({ conv, other });

    // Slide in
    translateY.set(withSpring(0, { damping: 18, stiffness: 200 }));
    opacity.set(withTiming(1, { duration: 180 }));

    // Progress bar drains over 4s
    progress.set(1);
    progress.set(withTiming(0, { duration: 4000 }));

    // Auto-hide after 4s
    timerRef.current = setTimeout(() => hide(), 4000);
  }, [translateY, opacity, progress, hide]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as `${number}%`,
  }));

  const handlePress = useCallback(() => {
    if (!data) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    hide();
    const { conv, other } = data;
    router.push({
      pathname: '/chat/[id]',
      params: {
        id: String(conv.id),
        publicId: conv.public_id,
        otherId: conv.type === 'group' ? '' : String(other.id),
        name: other.first_name,
        avatar: other.profile_photo?.urls?.thumbnail ?? '',
        status: conv.status,
        conversationType: conv.type,
        groupKey: conv.group_key ?? '',
        memberCount: String(conv.participant_count ?? 0),
      },
    } as never);
  }, [data, hide]);

  return (
    <ChatToastContext.Provider value={{ showChatToast }}>
      {children}
      {data && (
        <AlertPortal>
        <ToastView
          data={data}
          animStyle={animStyle}
          progressStyle={progressStyle}
          onPress={handlePress}
          onDismiss={() => {
            if (timerRef.current) clearTimeout(timerRef.current);
            hide();
          }}
        />
        </AlertPortal>
      )}
    </ChatToastContext.Provider>
  );
}

function ToastView({
  data,
  animStyle,
  progressStyle,
  onPress,
  onDismiss,
}: {
  data: ToastData;
  animStyle: object;
  progressStyle: object;
  onPress: () => void;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { conv, other } = data;
  const preview = conv.last_message_preview ?? 'پیام جدید';

  return (
    <Animated.View style={[styles.wrapper, { top: insets.top + 10 }, animStyle]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        {/* Right accent bar */}
        <View style={[styles.accentBar, { backgroundColor: Colors.accent }]} />

        {/* Content */}
        <View style={styles.content}>
          <Avatar
            size={44}
            name={other.first_name}
            photoUrl={other.profile_photo?.urls?.thumbnail ?? null}
          />
          <View style={styles.textBlock}>
            <View style={styles.row}>
              <Text style={styles.name} numberOfLines={1}>{other.first_name}</Text>
              <Text style={styles.time}>همین الان</Text>
            </View>
            <Text style={styles.preview} numberOfLines={2}>{preview}</Text>
          </View>

          {/* Dismiss */}
          <Pressable onPress={onDismiss} hitSlop={12} style={styles.closeBtn}>
            <Text style={styles.closeTxt}>✕</Text>
          </Pressable>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressStyle, { backgroundColor: Colors.accent }]} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export const useChatToast = () => useContext(ChatToastContext);

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 16,
    flexDirection: 'column',
  },
  cardPressed: { backgroundColor: Colors.surface2 },
  accentBar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopRightRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    paddingRight: 20,
    gap: Spacing.sm,
  },
  textBlock: {
    flex: 1,
    gap: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.ink,
    flex: 1,
  },
  time: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.muted,
    marginLeft: Spacing.sm,
  },
  preview: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.inkSoft,
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 4,
  },
  closeTxt: {
    fontSize: 13,
    color: Colors.muted,
  },
  progressTrack: {
    height: 3,
    backgroundColor: Colors.hair,
    width: '100%',
  },
  progressFill: {
    height: 3,
    overflow: 'hidden',
  },
});
