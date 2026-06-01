import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Search, PenLine, BellOff, Lock, Gift } from 'lucide-react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { Colors, Fonts } from '@/constants/colors';

const FILTERS = ['همه', 'درخواست‌ها ۲', 'گروه‌ها'];

const CHATS = [
  { id: 1, name: 'پریسا',          last: 'باشه، فردا حتماً صحبت می‌کنیم!', time: '۱۴:۲۲', unread: 2, online: true,  badge: 'ai'        as const },
  { id: 2, name: 'مهتاب',          last: 'یه هدیه فرستاد',                  time: '۱۲:۱۰', unread: 0, online: false, badge: 'community' as const, gift: true },
  { id: 3, name: 'سارا',           last: 'تو آماده‌ای؟',                    time: 'دیروز',  unread: 0, online: false, muted: true },
  { id: 4, name: 'یاسمن',          last: 'منتظر تأیید…',                    time: 'دیروز',  unread: 0, online: false, locked: true },
  { id: 5, name: 'مریم',           last: 'پیام شما: حتماً!',                time: '۲ روز',  unread: 0, online: false },
  { id: 6, name: 'یادداشت‌های من', last: 'پیام‌های ذخیره‌شده',            time: '۳ روز',  unread: 0, online: false, saved: true },
];

export default function ChatScreen() {
  const [filter, setFilter] = useState(0);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>پیام‌ها</Text>
        <View style={styles.headerActions}>
          <View style={styles.iconBtn}>
            <Search size={17} color={Colors.ink} strokeWidth={2} />
          </View>
          <View style={styles.iconBtn}>
            <PenLine size={17} color={Colors.ink} strokeWidth={2} />
          </View>
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f, i) => (
          <Chip key={f} active={filter === i} small onPress={() => setFilter(i)}>{f}</Chip>
        ))}
      </ScrollView>

      {/* Chat list */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {CHATS.map(c => (
          <Pressable
            key={c.id}
            style={[styles.chatRow, c.unread ? styles.chatRowUnread : null]}
          >
            <Avatar size={50} name={c.name} online={c.online} />
            <View style={styles.chatInfo}>
              <View style={styles.chatTop}>
                <View style={styles.chatNameRow}>
                  <Text style={styles.chatName}>{c.name}</Text>
                  {c.badge && <Badge kind={c.badge} label="" />}
                  {c.muted && <BellOff size={12} color={Colors.muted} strokeWidth={2} />}
                </View>
                <Text style={[styles.chatTime, c.unread ? styles.chatTimeUnread : null]}>
                  {c.time}
                </Text>
              </View>
              <View style={styles.chatBottom}>
                <Text style={[styles.chatLast, c.locked && styles.chatLastMuted]} numberOfLines={1}>
                  {c.locked && <Lock size={11} color={Colors.muted} strokeWidth={2} />}
                  {c.gift && <Gift size={11} color={Colors.goldDeep} strokeWidth={2} />}
                  {' '}{c.last}
                </Text>
                {c.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadTxt}>{c.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  header: {
    height: 54, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontFamily: Fonts.extraBold, color: Colors.ink },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center', justifyContent: 'center',
  },

  filterRow: { paddingHorizontal: 16, paddingBottom: 10, gap: 7 },
  list: { paddingHorizontal: 10, paddingBottom: 100 },

  chatRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 11, padding: 11, borderRadius: 16,
    marginBottom: 2,
  },
  chatRowUnread: { backgroundColor: Colors.accentSoft },

  chatInfo: { flex: 1 },
  chatTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  chatName: { fontSize: 14.5, fontFamily: Fonts.extraBold, color: Colors.ink },
  chatTime: { fontSize: 10.5, color: Colors.muted, fontFamily: Fonts.regular },
  chatTimeUnread: { color: Colors.accent, fontFamily: Fonts.bold },

  chatBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  chatLast: { fontSize: 12.5, color: Colors.inkSoft, flex: 1, fontFamily: Fonts.regular },
  chatLastMuted: { color: Colors.muted },

  unreadBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadTxt: { fontSize: 10, fontFamily: Fonts.bold, color: '#fff' },
});
