import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Colors, Fonts } from '@/constants/colors';

const LIKES = [
  { id: 1, name: 'کیان',    age: 29, city: 'تهران',   compat: 82, badge: 'ai'        as const, anonymous: false },
  { id: 2, name: '???',     age: 0,  city: 'تهران',   compat: 0,  badge: undefined,              anonymous: true  },
  { id: 3, name: 'آرمان',   age: 31, city: 'اصفهان',  compat: 69, badge: 'community' as const, anonymous: false },
  { id: 4, name: '???',     age: 0,  city: '???',      compat: 0,  badge: undefined,              anonymous: true  },
];

const ANON_SENT = [
  { id: 1, name: 'پریسا', age: 27, city: 'تهران', compat: 86 },
  { id: 2, name: 'مهتاب', age: 30, city: 'کرج',   compat: 74 },
];

export default function LikesScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>مَچ و لایک</Text>
        </View>

        {/* Section: Received likes */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>لایک‌های دریافتی</Text>
          <Text style={styles.sectionSub}>۴ نفر لایک کردن · ۲ تا ناشناس</Text>
        </View>

        <View style={styles.grid}>
          {LIKES.map(l => (
            <TouchableOpacity key={l.id} style={styles.likeCard}>
              {l.anonymous ? (
                <View style={[styles.likeAvatar, styles.likeAvatarBlur]}>
                  <Text style={{ fontSize: 28 }}>👤</Text>
                  <View style={styles.anonymousBadge}>
                    <Text style={styles.anonymousTxt}>ناشناس</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.likeAvatar}>
                  <Text style={{ fontSize: 36 }}>🌸</Text>
                  {l.badge && (
                    <View style={styles.avatarBadge}>
                      <Badge kind={l.badge} label="" />
                    </View>
                  )}
                  <View style={styles.compatOverlay}>
                    <Text style={styles.compatTxt}>✦ {l.compat}٪</Text>
                  </View>
                </View>
              )}
              <Text style={styles.likeCardName} numberOfLines={1}>
                {l.anonymous ? '???' : `${l.name}، ${l.age}`}
              </Text>
              <Text style={styles.likeCardCity} numberOfLines={1}>
                {l.anonymous ? 'برای دیدن، سکه خرج کن' : l.city}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reveal card */}
        <Card tint="gold" style={styles.revealCard}>
          <Text style={styles.revealTitle}>🔍 کی علاقه ناشناس فرستاده؟</Text>
          <Text style={styles.revealSub}>با ۵۰ سکه هویت یک نفر رو ببین</Text>
          <TouchableOpacity style={styles.revealBtn}>
            <Text style={styles.revealBtnTxt}>🪙 خرید بسته هفتگی</Text>
          </TouchableOpacity>
        </Card>

        {/* Section: Sent anonymous */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>علاقه ناشناس فرستاده شده</Text>
        </View>

        {ANON_SENT.map(p => (
          <View key={p.id} style={styles.anonRow}>
            <View style={styles.anonAvatar}>
              <Text style={{ fontSize: 24 }}>🌸</Text>
            </View>
            <View style={styles.anonInfo}>
              <Text style={styles.anonName}>{p.name}، {p.age}</Text>
              <Text style={styles.anonCity}>{p.city}</Text>
            </View>
            <View style={styles.anonCompat}>
              <Text style={styles.anonCompatTxt}>✦ {p.compat}٪</Text>
            </View>
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16 },

  header: {
    height: 54, flexDirection: 'row', alignItems: 'center', marginBottom: 4,
  },
  headerTitle: { fontSize: 18, fontFamily: Fonts.extraBold, color: Colors.ink },

  sectionHeader: { marginTop: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.ink },
  sectionSub: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular, marginTop: 2 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  likeCard: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.hair,
  },
  likeAvatar: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: Colors.ph2,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  likeAvatarBlur: { backgroundColor: Colors.purpleSoft },
  avatarBadge: { position: 'absolute', top: -4, right: -4 },
  compatOverlay: {
    position: 'absolute', bottom: 4,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2,
  },
  compatTxt: { fontSize: 10, fontFamily: Fonts.extraBold, color: Colors.purple },
  anonymousBadge: {
    position: 'absolute', bottom: 4,
    backgroundColor: Colors.purple + 'CC',
    borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2,
  },
  anonymousTxt: { fontSize: 9.5, fontFamily: Fonts.bold, color: '#fff' },
  likeCardName: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.ink },
  likeCardCity: { fontSize: 10.5, color: Colors.muted, fontFamily: Fonts.regular, textAlign: 'center' },

  revealCard: { marginTop: 16, gap: 8, alignItems: 'center' },
  revealTitle: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.goldDeep },
  revealSub: { fontSize: 11.5, color: Colors.inkSoft, fontFamily: Fonts.regular },
  revealBtn: {
    backgroundColor: Colors.gold, borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 9, marginTop: 4,
  },
  revealBtnTxt: { fontSize: 13, fontFamily: Fonts.bold, color: '#3A2C0A' },

  anonRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.hair, marginBottom: 8,
  },
  anonAvatar: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: Colors.ph2, alignItems: 'center', justifyContent: 'center',
  },
  anonInfo: { flex: 1 },
  anonName: { fontSize: 13.5, fontFamily: Fonts.bold, color: Colors.ink },
  anonCity: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular, marginTop: 1 },
  anonCompat: {
    backgroundColor: Colors.purpleSoft, borderRadius: 999,
    paddingHorizontal: 9, paddingVertical: 4,
  },
  anonCompatTxt: { fontSize: 11, fontFamily: Fonts.extraBold, color: Colors.purple },
});
