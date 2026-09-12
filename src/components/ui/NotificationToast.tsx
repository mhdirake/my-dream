import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { Bell } from 'lucide-react-native';
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ToastData {
  title: string;
  body: string;
  onPress?: () => void;
}

interface NotificationToastCtxValue {
  showNotificationToast: (data: ToastData) => void;
}

const NotificationToastContext = createContext<NotificationToastCtxValue>({
  showNotificationToast: () => {},
});

export function NotificationToastProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<ToastData | null>(null);
  const translateY = useSharedValue(-140);
  const opacity = useSharedValue(0);
  const progress = useSharedValue(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    translateY.value = withTiming(-140, { duration: 280 });
    opacity.value = withTiming(0, { duration: 280 });
  }, [translateY, opacity]);

  const showNotificationToast = useCallback((next: ToastData) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    setData(next);

    translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
    opacity.value = withTiming(1, { duration: 180 });

    progress.value = 1;
    progress.value = withTiming(0, { duration: 4000 });

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
    data.onPress?.();
  }, [data, hide]);

  return (
    <NotificationToastContext.Provider value={{ showNotificationToast }}>
      {children}
      {data && (
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
      )}
    </NotificationToastContext.Provider>
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

  return (
    <Animated.View style={[styles.wrapper, { top: insets.top + 10 }, animStyle]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
      >
        <View style={[styles.accentBar, { backgroundColor: Colors.accent }]} />

        <View style={styles.content}>
          <View style={styles.icon}>
            <Bell size={20} color={Colors.accent} strokeWidth={2} />
          </View>
          <View style={styles.textBlock}>
            <Text style={styles.title} numberOfLines={1}>{data.title}</Text>
            <Text style={styles.body} numberOfLines={2}>{data.body}</Text>
          </View>

          <Pressable onPress={onDismiss} hitSlop={12} style={styles.closeBtn}>
            <Text style={styles.closeTxt}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressStyle, { backgroundColor: Colors.accent }]} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export const useNotificationToast = () => useContext(NotificationToastContext);

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
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.ink,
  },
  body: {
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
