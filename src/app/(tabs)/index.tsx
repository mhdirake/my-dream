// Discover tab — Swipe + Daily Suggestions
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Colors, Fonts } from '@/constants/colors';

type Mode = 'swipe' | 'daily' | 'ai';

const MODES: { id: Mode; label: string }[] = [
  { id: 'swipe',  label: 'Swipe' },
  { id: 'daily',  label: 'پیشنهاد روزانه' },
  { id: 'ai',     label: 'AI Match ✦' },
];

const SAMPLE_PROFILES = [
  { id: 1, name: 'سارا', age: 26, city: 'تهران', goal: 'ازدواج', compat: 86, tags: ['🎬 فیلم', '☕ قهوه', '📚 کتاب'], verified: true },
];

const DAILY_PROFILES = [
  { id: 1, name: 'پریسا', age: 27, city: 'تهران', compat: 86, tags: ['☕ قهوه', '📚 کتاب', '🌿 طبیعت'], note: 'هدف رابطه بسیار نزدیک' },
  { id: 2, name: 'یاسمن', age: 30, city: 'کرج',   compat: 74, tags: ['🎬 فیلم', '🐱 گربه'],             note: 'سبک زندگی مشابه' },
  { id: 3, name: 'مهتاب', age: 25, city: 'تهران', compat: 68, tags: ['🌙 شب‌زنده', '🎮 گیمر'],          note: 'چند تگ مشترک' },
];

function ModeSwitch({ active, onPress }: { active: Mode; onPress: (m: Mode) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeScroll}>
      {MODES.map(m => {
        const on = m.id === active;
        return (
          <TouchableOpacity
            key={m.id}
            onPress={() => onPress(m.id)}
            style={[styles.modeBtn, on && styles.modeBtnActive]}
          >
            <Text style={[styles.modeTxt, on && styles.modeTxtActive]}>{m.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function SwipeCard() {
  const p = SAMPLE_PROFILES[0];
  return (
    <View style={styles.swipeCard}>
      {/* Photo placeholder */}
      <View style={styles.cardPhoto}>
        <Text style={styles.cardPhotoEmoji}>🌸</Text>
        <Text style={styles.cardPhotoHint}>[ profile photo ]</Text>
      </View>

      {/* Top badges */}
      <View style={styles.cardTopRight}>
        <Badge kind="ai" label="AI Trusted" />
      </View>
      <View style={styles.cardTopLeft}>
        <View style={styles.compatBadge}>
          <Text style={styles.compatText}>✦ {p.compat}٪</Text>
        </View>
      </View>

      {/* Bottom info overlay */}
      <View style={styles.cardBottom}>
        <View style={styles.cardGlass}>
          <View style={styles.cardNameRow}>
            <Text style={styles.cardName}>{p.name}، {p.age}</Text>
            <Text style={{ color: Colors.trust, fontSize: 14, marginRight: 4 }}>✓</Text>
          </View>
          <View style={styles.cardMeta}>
            <Text style={styles.cardMetaTxt}>📍 {p.city}</Text>
            <Text style={styles.cardDot}>·</Text>
            <Text style={styles.cardGoal}>{p.goal}</Text>
          </View>
          <View style={styles.tagRow}>
            {p.tags.map(t => (
              <View key={t} style={styles.tagPill}>
                <Text style={styles.tagTxt}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function ActionButtons() {
  return (
    <View style={styles.actions}>
      <TouchableOpacity style={styles.actionBtn}>
        <Text style={styles.actionEmoji}>✕</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.actionBtn, styles.actionGift]}>
        <Text style={styles.actionEmoji}>🎁</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.actionBtn, styles.actionLike]}>
        <Text style={[styles.actionEmoji, { fontSize: 28 }]}>❤️</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.actionBtn, styles.actionChat]}>
        <Text style={styles.actionEmoji}>💬</Text>
      </TouchableOpacity>
    </View>
  );
}

function SwipeView() {
  return (
    <ScrollView contentContainerStyle={styles.swipeContent} showsVerticalScrollIndicator={false}>
      <SwipeCard />
      <ActionButtons />
      <Text style={styles.swipeRemain}>۷ کشف باقی‌مانده امروز · Basic</Text>
    </ScrollView>
  );
}

function DailyView() {
  return (
    <ScrollView contentContainerStyle={styles.dailyContent} showsVerticalScrollIndicator={false}>
      {DAILY_PROFILES.map(p => (
        <Card key={p.id} style={styles.dailyCard}>
          <View style={styles.dailyRow}>
            {/* Avatar placeholder */}
            <View style={styles.dailyAvatar}>
              <Text style={{ fontSize: 30 }}>🌸</Text>
              <View style={styles.dailyCompat}>
                <Text style={styles.dailyCompatTxt}>{p.compat}٪</Text>
              </View>
            </View>
            <View style={styles.dailyInfo}>
              <Text style={styles.dailyName}>{p.name}، {p.age}</Text>
              <Text style={styles.dailyCity}>{p.city}</Text>
              <View style={styles.dailyNote}>
                <Text style={styles.dailyNoteTxt}>✦ {p.note}</Text>
              </View>
              <View style={styles.tagRow}>
                {p.tags.map(t => <Chip key={t} small>{t}</Chip>)}
              </View>
            </View>
          </View>
        </Card>
      ))}
      <Card soft style={styles.upgradeCard}>
        <Text style={styles.upgradeTxt}>پیشنهادهای بیشتر؟</Text>
        <Text style={styles.upgradeSub}>Silver: ۵ · Gold: ۱۰ پیشنهاد در روز</Text>
      </Card>
    </ScrollView>
  );
}

function AiView() {
  return (
    <View style={styles.aiEmpty}>
      <Text style={{ fontSize: 48 }}>✨</Text>
      <Text style={styles.aiTitle}>AI Match Assistant</Text>
      <Text style={styles.aiSub}>این قابلیت فقط برای کاربران Gold فعال است</Text>
      <View style={[styles.upgradeCard, { marginTop: 24, width: '100%' }]}>
        <Text style={[styles.upgradeTxt, { color: Colors.gold }]}>⭐ Gold</Text>
        <Text style={styles.upgradeSub}>دسترسی به هوش مصنوعی برای Match دقیق‌تر</Text>
      </View>
    </View>
  );
}

export default function DiscoverScreen() {
  const [mode, setMode] = useState<Mode>('swipe');

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>کشف</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn}>
            <Text style={styles.iconBtnTxt}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <View>
              <Text style={styles.iconBtnTxt}>🔔</Text>
              <View style={styles.notifDot} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ModeSwitch active={mode} onPress={setMode} />

      {mode === 'swipe'  && <SwipeView />}
      {mode === 'daily'  && <DailyView />}
      {mode === 'ai'     && <AiView />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontFamily: Fonts.extraBold, color: Colors.ink },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnTxt: { fontSize: 17 },
  notifDot: {
    position: 'absolute', top: -2, right: -2,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.accent, borderWidth: 1.5, borderColor: '#fff',
  },

  modeScroll: { paddingHorizontal: 16, paddingVertical: 8, gap: 7 },
  modeBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: 'rgba(36,33,42,0.04)',
  },
  modeBtnActive: {
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  modeTxt: { fontFamily: Fonts.semiBold, fontSize: 12.5, color: Colors.muted },
  modeTxtActive: { color: '#fff', fontFamily: Fonts.extraBold },

  // Swipe card
  swipeContent: { padding: 16, paddingBottom: 100 },
  swipeCard: {
    height: 440,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: Colors.purpleSoft,
    shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  cardPhoto: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cardPhotoEmoji: { fontSize: 64 },
  cardPhotoHint: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular },
  cardTopRight: { position: 'absolute', top: 14, right: 14 },
  cardTopLeft: { position: 'absolute', top: 14, left: 14 },
  compatBadge: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
  },
  compatText: { fontFamily: Fonts.extraBold, fontSize: 13, color: Colors.purple },
  cardBottom: { position: 'absolute', bottom: 12, left: 12, right: 12 },
  cardGlass: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  cardNameRow: { flexDirection: 'row', alignItems: 'center' },
  cardName: { fontSize: 22, fontFamily: Fonts.extraBold, color: Colors.ink, letterSpacing: -0.5 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  cardMetaTxt: { fontSize: 12.5, color: Colors.inkSoft, fontFamily: Fonts.regular },
  cardDot: { color: Colors.muted },
  cardGoal: { fontSize: 12.5, color: Colors.accent, fontFamily: Fonts.bold },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tagPill: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  tagTxt: { fontSize: 11, fontFamily: Fonts.semiBold, color: Colors.inkSoft },

  // Action buttons
  actions: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 16, marginTop: 20,
  },
  actionBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  actionGift: { backgroundColor: Colors.goldSoft },
  actionLike: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent, shadowOpacity: 0.5,
  },
  actionChat: { backgroundColor: Colors.trustSoft },
  actionEmoji: { fontSize: 22 },
  swipeRemain: {
    textAlign: 'center', marginTop: 14,
    fontSize: 11.5, color: Colors.muted, fontFamily: Fonts.semiBold,
  },

  // Daily
  dailyContent: { padding: 16, gap: 12, paddingBottom: 100 },
  dailyCard: { padding: 12 },
  dailyRow: { flexDirection: 'row', gap: 12 },
  dailyAvatar: {
    width: 78, height: 98, borderRadius: 16,
    backgroundColor: Colors.ph2, alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  dailyCompat: {
    position: 'absolute', bottom: 5,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2,
  },
  dailyCompatTxt: { fontFamily: Fonts.extraBold, fontSize: 10.5, color: Colors.purple },
  dailyInfo: { flex: 1 },
  dailyName: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.ink },
  dailyCity: { fontSize: 11.5, color: Colors.muted, fontFamily: Fonts.regular, marginTop: 1 },
  dailyNote: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.purpleSoft, borderRadius: 999,
    paddingHorizontal: 9, paddingVertical: 3, marginTop: 6, alignSelf: 'flex-start',
  },
  dailyNoteTxt: { fontSize: 10.5, color: Colors.purple, fontFamily: Fonts.bold },
  upgradeCard: { padding: 14, alignItems: 'center', gap: 6 },
  upgradeTxt: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.ink },
  upgradeSub: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular, textAlign: 'center' },

  // AI
  aiEmpty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32,
  },
  aiTitle: { fontSize: 18, fontFamily: Fonts.bold, color: Colors.ink, marginTop: 12 },
  aiSub: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.regular, textAlign: 'center', marginTop: 6 },
});
