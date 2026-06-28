import { Colors, Fonts } from '@/constants/colors';
import { useModerationCtx } from '@/lib/moderation/ModerationContext';
import { router } from 'expo-router';
import { AlertTriangle } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function formatRemaining(seconds: number | null): string {
  if (!seconds) return '';
  const days = Math.ceil(seconds / 86400);
  if (days >= 1) return `${days} روز`;
  const hours = Math.ceil(seconds / 3600);
  return `${hours} ساعت`;
}

export function RestrictionBanner() {
  const { moderationStatus } = useModerationCtx();

  if (!moderationStatus?.has_active_restriction || moderationStatus.is_banned) return null;

  const restriction = moderationStatus.active_restrictions[0];
  if (!restriction) return null;

  const remaining = formatRemaining(restriction.remaining_seconds);

  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={() => router.push('/settings/restrictions' as never)}
      activeOpacity={0.85}
    >
      <AlertTriangle size={14} color="#fff" strokeWidth={2.5} />
      <Text style={styles.txt} numberOfLines={1}>
        {restriction.label}{remaining ? ` · ${remaining} باقیمانده` : ''}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E67E22',
    paddingHorizontal: 14, paddingVertical: 8,
  },
  txt: { flex: 1, fontSize: 12, fontFamily: Fonts.semiBold, color: '#fff' },
});
