import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { aiCoachApi, type CoachSession } from '@/lib/api/ai-coach';
import { useAuth } from '@/lib/auth/AuthContext';
import { formatPersianDate } from '@/lib/date/persian';
import { router } from 'expo-router';
import { Bot, ChevronLeft, MessageCircle, Plus, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatDate(iso: string) {
  return formatPersianDate(iso, { month: 'short' });
}

export default function AiCoachIndex() {
  const { session } = useAuth();
  const token = session?.accessToken ?? '';

  const [sessions, setSessions] = useState<CoachSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const data = await aiCoachApi.listSessions(token);
      setSessions(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const createSession = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const s = await aiCoachApi.createSession(token);
      router.push({ pathname: '/ai-coach/[id]', params: { id: s.id } } as never);
    } catch {
      Alert.alert('خطا', 'ایجاد گفتگو ممکن نشد. دوباره امتحان کن.');
    } finally {
      setCreating(false);
    }
  };

  const deleteSession = (s: CoachSession) => {
    Alert.alert('حذف گفتگو', `گفتگو «${s.title ?? 'بدون عنوان'}» حذف بشه؟`, [
      { text: 'لغو', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive',
        onPress: async () => {
          try {
            await aiCoachApi.deleteSession(token, s.id);
            setSessions(prev => prev.filter(x => x.id !== s.id));
          } catch {
            Alert.alert('خطا', 'حذف ممکن نشد.');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: CoachSession }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/ai-coach/[id]', params: { id: item.id } } as never)}
    >
      <View style={styles.cardIcon}>
        <MessageCircle size={18} color={Colors.accent} strokeWidth={2} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title ?? 'گفتگوی بدون عنوان'}
        </Text>
        <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => deleteSession(item)}
        hitSlop={8}
      >
        <Trash2 size={15} color={Colors.muted} strokeWidth={2} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={22} color={Colors.ink} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Bot size={18} color={Colors.accent} strokeWidth={2} />
          <Text style={styles.headerTxt}>مربی هوش مصنوعی</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.center}>
          <Bot size={48} color={Colors.lineSoft} strokeWidth={1.5} />
          <Text style={styles.emptyTxt}>هنوز گفتگویی نداری</Text>
          <Text style={styles.emptySub}>با AI Coach شروع کن</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={s => String(s.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}

      <View style={styles.fabWrap}>
        <TouchableOpacity style={styles.fab} onPress={createSession} activeOpacity={0.85}>
          {creating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Plus size={22} color="#fff" strokeWidth={2.5} />
          )}
          <Text style={styles.fabTxt}>گفتگوی جدید</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.hair,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  headerTxt: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.ink },

  list: { padding: Spacing.lg, gap: 0 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.hair,
  },
  cardIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.accent + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.ink },
  cardDate: { fontSize: 11.5, fontFamily: Fonts.regular, color: Colors.muted, marginTop: 2 },
  deleteBtn: { padding: 4 },

  fabWrap: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  fab: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.accent,
    borderRadius: Radius.pill, paddingVertical: 14,
  },
  fabTxt: { fontSize: 15, fontFamily: Fonts.bold, color: '#fff' },

  emptyTxt: { fontSize: 15, fontFamily: Fonts.semiBold, color: Colors.inkSoft },
  emptySub: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.muted },
});
