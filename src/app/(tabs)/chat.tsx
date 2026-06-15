import { Avatar } from '@/components/ui/Avatar';
import { Colors, Fonts, Radius } from '@/constants/colors';
import { Conversation, ConversationUser, chatApi } from '@/lib/api/chat';
import { useAuth } from '@/lib/auth/AuthContext';
import { useConversations } from '@/lib/chat/useConversations';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Check, Clock, PenLine, Search, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const MEDIA_BASE = process.env.EXPO_PUBLIC_MEDIA_URL ?? process.env.EXPO_PUBLIC_API_URL ?? '';

function photoUrl(user: ConversationUser | undefined) {
  if (!user?.profile_photo_path) return null;
  const p = user.profile_photo_path;
  return p.startsWith('http') ? p : `${MEDIA_BASE}/${p}`;
}

function timeAgo(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'همین الان';
  if (diff < 3600) return `${Math.floor(diff / 60)} دقیقه`;
  if (diff < 86400) return d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  return 'دیروز';
}

type Tab = 'all' | 'requests';

export default function ChatScreen() {
  const { session, user } = useAuth();
  const { bottom } = useSafeAreaInsets();
  const { conversations, pendingIncoming, pendingOutgoing, loading, refreshing, refresh } = useConversations(
    session?.accessToken,
  );
  const [tab, setTab] = useState<Tab>('all');
  const [responding, setResponding] = useState<number | null>(null);

  const myId = user?.id ?? -1;

  function otherUser(c: Conversation): ConversationUser {
    return c.first_user_id === myId ? c.second_user : c.first_user;
  }

  const openConversation = (c: Conversation) => {
    const other = otherUser(c);
    router.push({
      pathname: '/chat/[id]',
      params: {
        id: String(c.id),
        name: other.first_name,
        avatar: photoUrl(other) ?? '',
        status: c.status,
      },
    } as never);
  };

  const handleRespond = async (c: Conversation, action: 'accepted' | 'rejected') => {
    if (!session) return;
    setResponding(c.id);
    try {
      if (action === 'accepted') {
        await chatApi.acceptConversation(session.accessToken, c.id);
        refresh();
        openConversation({ ...c, status: 'accepted' });
      } else {
        await chatApi.rejectConversation(session.accessToken, c.id);
        refresh();
      }
    } catch {
      // ignore
    } finally {
      setResponding(null);
    }
  };

  const requestsList = [...pendingIncoming, ...pendingOutgoing];
  const displayed = tab === 'all' ? conversations : requestsList;
  const pendingCount = requestsList.length;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>پیام‌ها</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <Search size={17} color={Colors.ink} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <PenLine size={17} color={Colors.ink} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'all' && styles.tabBtnActive]}
          onPress={() => setTab('all')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabTxt, tab === 'all' && styles.tabTxtActive]}>همه</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'requests' && styles.tabBtnActive]}
          onPress={() => setTab('requests')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabTxt, tab === 'requests' && styles.tabTxtActive]}>
            درخواست‌ها
          </Text>
          {pendingCount > 0 && (
            <View style={[styles.tabBadge, tab === 'requests' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeTxt, tab === 'requests' && styles.tabBadgeTxtActive]}>
                {pendingCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : displayed.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>{tab === 'all' ? '💬' : '📨'}</Text>
          <Text style={styles.emptyTxt}>
            {tab === 'all' ? 'هنوز مکالمه‌ای نداری' : 'درخواست جدیدی نداری'}
          </Text>
          <Text style={styles.emptySub}>
            {tab === 'all'
              ? 'وقتی کسی قبول کنه اینجا میاد'
              : 'درخواست‌های جدید اینجا نشون داده میشن'}
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, { paddingBottom: bottom + 92 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.accent} />
          }
        >
          {tab === 'all'
            ? displayed.map(c => (
                <ActiveRow
                  key={c.id}
                  conversation={c}
                  other={otherUser(c)}
                  onPress={() => openConversation(c)}
                />
              ))
            : displayed.map(c => {
                const isSender = c.first_user_id === myId;
                return (
                  <PendingRow
                    key={c.id}
                    conversation={c}
                    other={isSender ? c.second_user : c.first_user}
                    isSender={isSender}
                    isResponding={responding === c.id}
                    onAccept={() => handleRespond(c, 'accepted')}
                    onReject={() => handleRespond(c, 'rejected')}
                    onPress={() => openConversation(c)}
                  />
                );
              })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Active conversation row ───────────────────────────────────────

function ActiveRow({
  conversation: c,
  other,
  onPress,
}: {
  conversation: Conversation;
  other: ConversationUser;
  onPress: () => void;
}) {
  const lastMsg = c.messages[c.messages.length - 1];
  const lastBody = lastMsg?.body ?? '...';
  const lastTime = timeAgo(c.last_message_at);

  return (
    <Pressable style={styles.chatRow} onPress={onPress}>
      <Avatar size={50} name={other.first_name} photoUrl={photoUrl(other)} />
      <View style={styles.chatInfo}>
        <View style={styles.chatTop}>
          <Text style={styles.chatName}>{other.first_name}</Text>
          <Text style={styles.chatTime}>{lastTime}</Text>
        </View>
        <View style={styles.chatBottom}>
          <Text style={styles.chatLast} numberOfLines={1}>
            {lastBody}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ── Pending (request) row ─────────────────────────────────────────

function PendingRow({
  conversation: c,
  other,
  isSender,
  isResponding,
  onAccept,
  onReject,
  onPress,
}: {
  conversation: Conversation;
  other: ConversationUser;
  isSender: boolean;
  isResponding: boolean;
  onAccept: () => void;
  onReject: () => void;
  onPress: () => void;
}) {
  const firstMsg = c.messages[0];
  const msgBody = firstMsg?.body ?? '';
  const lastTime = timeAgo(c.last_message_at);

  return (
    <Pressable style={styles.pendingCard} onPress={onPress}>
      <View style={styles.pendingTop}>
        <Avatar size={46} name={other.first_name} photoUrl={photoUrl(other)} />
        <View style={styles.pendingInfo}>
          <View style={styles.chatTop}>
            <Text style={styles.chatName}>{other.first_name}</Text>
            <Text style={styles.chatTime}>{lastTime}</Text>
          </View>
          {msgBody ? (
            <Text style={styles.pendingMsg} numberOfLines={2}>
              {msgBody}
            </Text>
          ) : null}
        </View>
      </View>

      {isSender ? (
        <View style={styles.awaitingRow}>
          <Clock size={14} color={Colors.muted} strokeWidth={2} />
          <Text style={styles.awaitingTxt}>در انتظار تأیید</Text>
        </View>
      ) : (
        <View style={styles.pendingActions}>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={onReject}
            disabled={isResponding}
            activeOpacity={0.8}
          >
            {isResponding ? (
              <ActivityIndicator size="small" color={Colors.danger} />
            ) : (
              <X size={16} color={Colors.danger} strokeWidth={2.5} />
            )}
            <Text style={styles.rejectTxt}>رد</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={onAccept}
            disabled={isResponding}
            activeOpacity={0.85}
          >
            {isResponding ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <LinearGradient
                  colors={Colors.gradColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <Check size={16} color="#fff" strokeWidth={2.5} />
                <Text style={styles.acceptTxt}>تأیید</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </Pressable>
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
  },
  tabBtnActive: { backgroundColor: Colors.ink },
  tabTxt: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.muted },
  tabTxtActive: { color: '#fff' },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeActive: { backgroundColor: Colors.accent },
  tabBadgeTxt: { fontSize: 10, fontFamily: Fonts.bold, color: Colors.accent },
  tabBadgeTxtActive: { color: '#fff' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyTxt: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.ink },
  emptySub: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.muted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  list: { paddingHorizontal: 10, paddingBottom: 100 },

  // Active row
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 11,
    borderRadius: Radius.lg,
    marginBottom: 2,
  },
  chatInfo: { flex: 1 },
  chatTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatName: { fontSize: 14.5, fontFamily: Fonts.extraBold, color: Colors.ink },
  chatTime: { fontSize: 10.5, color: Colors.muted, fontFamily: Fonts.regular },
  chatBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  chatLast: { fontSize: 12.5, color: Colors.inkSoft, flex: 1, fontFamily: Fonts.regular },

  // Pending card
  pendingCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.lineSoft,
    shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  pendingTop: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  pendingInfo: { flex: 1 },
  pendingMsg: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
    color: Colors.inkSoft,
    lineHeight: 20,
    marginTop: 4,
  },
  pendingActions: { flexDirection: 'row', gap: 8 },
  rejectBtn: {
    flex: 1,
    height: 40,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: Colors.dangerSoft,
    backgroundColor: Colors.dangerSoft,
  },
  rejectTxt: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.danger },
  acceptBtn: {
    flex: 2,
    height: 40,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  acceptTxt: { fontSize: 13, fontFamily: Fonts.bold, color: '#fff' },

  awaitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.lineSoft,
    backgroundColor: Colors.bg,
  },
  awaitingTxt: { fontSize: 12.5, fontFamily: Fonts.semiBold, color: Colors.muted },
});
