import { Checkbox } from '@/components/ui/Checkbox';
import { Sheet } from '@/components/ui/Sheet';
import { Colors, Fonts, Radius } from '@/constants/colors';
import { hasBadge, reqDone, type Tier } from '@/constants/verificationTiers';
import type { ClientProfile } from '@/lib/api/profile';
import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  tier: Tier | null;
  profile: ClientProfile | null;
  onClose: () => void;
};

/**
 * Explains one verification badge: whether the viewer already has it and,
 * if not, exactly which requirements are still outstanding. Opened by
 * tapping a badge next to the username on the profile tab.
 */
export function VerificationBadgeModal({ tier, profile, onClose }: Props) {
  const earned = tier ? hasBadge(profile, tier.slug) : false;

  return (
    <Sheet
      visible={!!tier}
      onClose={onClose}
      title={tier?.title}
      footer={
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: tier?.color ?? Colors.accent }]}
          activeOpacity={0.85}
          onPress={() => { onClose(); router.push('/verification' as never); }}
        >
          <Text style={styles.ctaTxt}>
            {earned ? 'مشاهده‌ی صفحه‌ی احراز هویت' : 'رفتن به صفحه‌ی احراز هویت'}
          </Text>
        </TouchableOpacity>
      }
    >
      {tier ? (
        <>
          <View style={styles.hero}>
            <View style={[styles.iconWrap, { backgroundColor: tier.softColor }]}>{tier.icon}</View>
            <View style={[styles.statusChip, { backgroundColor: earned ? tier.softColor : Colors.hair }]}>
              {earned && <Check size={12} color={tier.color} strokeWidth={2.5} />}
              <Text style={[styles.statusTxt, { color: earned ? tier.color : Colors.muted }]}>
                {earned ? 'این بج رو داری' : 'هنوز این بج رو نداری'}
              </Text>
            </View>
            <Text style={styles.explainer}>
              {earned
                ? 'تبریک! همه‌ی شرط‌های این سطح رو کامل کردی.'
                : 'برای گرفتن این بج باید موارد زیر رو کامل کنی:'}
            </Text>
          </View>

          <View style={styles.reqs}>
            {tier.requirements.map((req, i) => {
              const done = reqDone(tier.slug, i, profile, earned);
              return (
                <View key={i} style={styles.reqRow}>
                  <Checkbox checked={done} color={tier.color} size={18} />
                  <Text style={[styles.reqTxt, done && styles.reqTxtDone]}>{req}</Text>
                </View>
              );
            })}
          </View>
        </>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 10, paddingTop: 4, paddingBottom: 4 },
  iconWrap: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill,
  },
  statusTxt: { fontSize: 12, fontFamily: Fonts.bold },
  explainer: {
    fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.inkSoft,
    textAlign: 'center', lineHeight: 20,
  },

  reqs: { gap: 12 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reqTxt: { flex: 1, fontSize: 13, fontFamily: Fonts.regular, color: Colors.muted, textAlign: 'right', lineHeight: 20 },
  reqTxtDone: { color: Colors.ink, fontFamily: Fonts.semiBold },

  cta: {
    alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.pill, paddingVertical: 13,
  },
  ctaTxt: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.onAccent },
});
