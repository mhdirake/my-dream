import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/BlurredModal';
import { useChatToast } from '@/components/ui/ChatToast';
import { KeyboardAvoider } from '@/components/ui/KeyboardAvoider';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { Conversation, ConversationUser, chatApi, conversationPeer } from '@/lib/api/chat';
import { useAuth } from '@/lib/auth/AuthContext';
import { useConversations } from '@/lib/chat/useConversations';
import { formatPersianDate, formatPersianTime } from '@/lib/date/persian';
import { toFaDigits } from '@/lib/localization';
import { toast } from '@/lib/toast';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { Check, Clock, Search, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

function photoUrl(user: ConversationUser | null | undefined) {
  return user?.profile_photo?.urls?.thumbnail ?? null;
}

function timeAgo(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff >= 0 && diff < 60) return 'همین الان';
  if (diff >= 0 && diff < 3600) return `${toFaDigits(Math.floor(diff / 60))} دقیقه`;

  const now = new Date();
  const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);

  if (diffDays === 0) return formatPersianTime(iso);
  if (diffDays === 1) return 'دیروز';
  return formatPersianDate(iso, { year: d.getFullYear() !== now.getFullYear() });
}

type Tab = 'all' | 'requests';

type LockedGroup = {
  kind: 'locked_group';
  id: string;
  groupKey: 'silver' | 'gold';
  title: string;
  subtitle: string;
};

type ChatListItem = Conversation | LockedGroup;

const LOCKED_GROUPS: LockedGroup[] = [
  {
    kind: 'locked_group',
    id: 'locked-silver',
    groupKey: 'silver',
    title: 'گفتگوی گروهی نقره‌ای',
    subtitle: 'برای اعضای اشتراک نقره‌ای و طلایی',
  },
  {
    kind: 'locked_group',
    id: 'locked-gold',
    groupKey: 'gold',
    title: 'گفتگوی گروهی طلایی',
    subtitle: 'فضای اختصاصی کاربران طلایی',
  },
];

function isLockedGroup(item: ChatListItem): item is LockedGroup {
  return 'kind' in item && item.kind === 'locked_group';
}

export default function ChatScreen() {
  const { session, user } = useAuth();
  const { bottom } = useSafeAreaInsets();
  const myId = user?.id ?? -1;
  const { showChatToast } = useChatToast();

  const handleNewMessage = useCallback(async (conv: Conversation) => {
    const other = conversationPeer(conv, myId);
    showChatToast(conv, other);
    if (Platform.OS === 'web') return;
  }, [myId, showChatToast]);

  const { conversations, pendingIncoming, pendingOutgoing, loading, refreshing, loadingMore, hasMore, refresh, loadMore, resetUnread } = useConversations(
    session?.accessToken,
    handleNewMessage,
  );
  const [tab, setTab] = useState<Tab>('all');
  const [responding, setResponding] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [lockedGroupModal, setLockedGroupModal] = useState<LockedGroup | null>(null);
  const searchRef = useRef<TextInput>(null);

  useEffect(() => {
    if (searchOpen) {
      const t = setTimeout(() => searchRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [searchOpen]);

  // Safety net for when a realtime event (e.g. conversation.accepted) is missed —
  // e.g. the socket was disconnected when it fired — so the list still self-heals.
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  function otherUser(c: Conversation): ConversationUser {
    return conversationPeer(c, myId);
  }

  const openConversation = (c: Conversation) => {
    const other = otherUser(c);
    resetUnread(c.public_id);
    setSearchOpen(false);
    setQuery('');
    router.push({
      pathname: '/chat/[id]',
      params: {
        id: String(c.id),
        publicId: c.public_id,
        otherId: c.type === 'group' ? '' : String(other.id),
        name: other.first_name,
        avatar: photoUrl(other) ?? '',
        status: c.status,
        isSender: c.first_user_id === myId ? '1' : '0',
        conversationType: c.type,
        groupKey: c.group_key ?? '',
        memberCount: String(c.participant_count ?? 0),
        unreadCount: String(c.unread_count ?? 0),
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
      toast.error(action === 'accepted' ? 'خطا در پذیرش درخواست' : 'خطا در رد درخواست');
    } finally {
      setResponding(null);
    }
  };

  const requestsList = [...pendingIncoming, ...pendingOutgoing];
  const activeConversations = conversations.filter(
    c => c.status === 'accepted' || c.status === 'locked',
  );
  const activeGroupKeys = new Set(activeConversations.filter(c => c.type === 'group').map(c => c.group_key));
  const lockedGroupPreviews = LOCKED_GROUPS.filter(group => !activeGroupKeys.has(group.groupKey));

  const q = query.trim().toLowerCase();
  const allItems: ChatListItem[] = tab === 'all'
    ? [...lockedGroupPreviews, ...activeConversations]
    : requestsList;
  const filtered = allItems.filter(item => {
    if (!q) return true;
    if (isLockedGroup(item)) {
      return item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q);
    }
    const other = otherUser(item);
    return (other.first_name ?? '').toLowerCase().includes(q) ||
           (other.last_name ?? '').toLowerCase().includes(q) ||
           (other.username ?? '').toLowerCase().includes(q);
  });
  const displayed = filtered;
  const pendingCount = requestsList.length;

  const openLockedGroup = (group: LockedGroup) => {
    setLockedGroupModal(group);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        {searchOpen ? (
          <>
            <TextInput
              ref={searchRef}
              style={styles.searchInput}
              placeholder="جستجو در مکالمات…"
              placeholderTextColor={Colors.muted}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={styles.iconBtn}
              activeOpacity={0.7}
              onPress={() => { setSearchOpen(false); setQuery(''); }}
            >
              <X size={17} color={Colors.ink} strokeWidth={2} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.headerTitle}>پیام‌ها</Text>
            <TouchableOpacity
              style={styles.iconBtn}
              activeOpacity={0.7}
              onPress={() => setSearchOpen(true)}
            >
              <Search size={17} color={Colors.ink} strokeWidth={2} />
            </TouchableOpacity>
          </>
        )}
      </View>

      <KeyboardAvoider>
      <SegmentedTabs
        value={tab}
        onChange={setTab}
        style={styles.tabs}
        items={[
          { key: 'all', label: 'همه' },
          { key: 'requests', label: 'درخواست‌ها', count: pendingCount },
        ]}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : displayed.length === 0 ? (
        <View style={styles.center}>
          {q ? (
            <>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTxt}>نتیجه‌ای پیدا نشد</Text>
              <Text style={styles.emptySub}>«{query}» در هیچ مکالمه‌ای نیست</Text>
            </>
          ) : (
            <>
              <Text style={styles.emptyEmoji}>{tab === 'all' ? '💬' : '📨'}</Text>
              <Text style={styles.emptyTxt}>
                {tab === 'all' ? 'هنوز مکالمه‌ای نداری' : 'درخواست جدیدی نداری'}
              </Text>
              <Text style={styles.emptySub}>
                {tab === 'all'
                  ? 'وقتی کسی قبول کنه اینجا میاد'
                  : 'درخواست‌های جدید اینجا نشون داده میشن'}
              </Text>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={item => isLockedGroup(item) ? item.id : String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, { paddingBottom: bottom + 92 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.accent} />
          }
          renderItem={({ item: c }) =>
            isLockedGroup(c) ? (
              <LockedGroupRow group={c} onPress={() => openLockedGroup(c)} />
            ) : tab === 'all' ? (
                <ActiveRow
                  conversation={c}
                  myId={myId}
                  other={otherUser(c)}
                  onPress={() => openConversation(c)}
                />
              ) : (() => {
                const isSender = c.first_user_id === myId;
                return (
                  <PendingRow
                    conversation={c}
                    other={conversationPeer(c, myId)}
                    isSender={isSender}
                    isResponding={responding === c.id}
                    onAccept={() => handleRespond(c, 'accepted')}
                    onReject={() => handleRespond(c, 'rejected')}
                    onPress={() => openConversation(c)}
                  />
                );
              })()
          }
          onEndReached={tab === 'all' && !q && hasMore ? loadMore : undefined}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.accent} /> : null}
        />
      )}
      </KeyboardAvoider>
      <LockedGroupModal
        group={lockedGroupModal}
        onClose={() => setLockedGroupModal(null)}
        onSubscribe={() => {
          setLockedGroupModal(null);
          router.push('/subscription' as never);
        }}
      />
    </SafeAreaView>
  );
}

const MSG_TYPE_PREFIX: Record<string, string> = {
  image: '🖼 ',
  voice: '🎤 ',
  gift: '🎁 ',
  sticker: '😊 ',
  gif: 'GIF · ',
};

// وقتی پیام کپشن/متن نداره (عکس/صوت/هدیه/استیکر بدون متن)، last_message_preview از سمت
// backend خالی/null میاد — این fallback به‌جای نمایش «...» عنوان نوع پیام رو نشون می‌ده
const MSG_TYPE_FALLBACK: Record<string, string> = {
  image: '🖼 عکس',
  voice: '🎤 پیام صوتی',
  gift: '🎁 هدیه',
  sticker: '😊 استیکر',
  gif: '🎞 گیف',
};

function LockedGroupModal({
  group,
  onClose,
  onSubscribe,
}: {
  group: LockedGroup | null;
  onClose: () => void;
  onSubscribe: () => void;
}) {
  const isGold = group?.groupKey === 'gold';

  return (
    <Modal visible={!!group} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.lockedDialog}>
          <LinearGradient
            colors={isGold ? [Colors.goldSoft, Colors.surface2] : [Colors.trustSoft, Colors.surface2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.lockedDialogIcon}
          >
            <Text style={styles.lockedDialogIconTxt}>{isGold ? 'ط' : 'ن'}</Text>
          </LinearGradient>
          <Text style={styles.lockedDialogTitle}>{group?.title ?? ''}</Text>
          <Text style={styles.lockedDialogBody}>
            {isGold
              ? 'برای ورود به این گروه باید اشتراک طلایی فعال داشته باشی.'
              : 'برای ورود به این گروه باید اشتراک نقره‌ای یا طلایی فعال داشته باشی.'}
          </Text>
          <View style={styles.lockedDialogActions}>
            <TouchableOpacity style={styles.lockedDialogCancel} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.lockedDialogCancelTxt}>بعداً</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.lockedDialogCta} onPress={onSubscribe} activeOpacity={0.85}>
              <Text style={styles.lockedDialogCtaTxt}>مشاهده اشتراک‌ها</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function LockedGroupRow({ group, onPress }: { group: LockedGroup; onPress: () => void }) {
  const isGold = group.groupKey === 'gold';

  return (
    <Pressable
      style={({ pressed }) => [styles.lockedGroupRow, pressed && { backgroundColor: Colors.ph2 }]}
      onPress={onPress}
    >
      <LinearGradient
        colors={isGold ? [Colors.goldSoft, Colors.surface2] : [Colors.trustSoft, Colors.surface2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.lockedGroupIcon}
      >
        <Text style={styles.lockedGroupIconTxt}>{isGold ? 'ط' : 'ن'}</Text>
      </LinearGradient>
      <View style={styles.chatInfo}>
        <View style={styles.chatTop}>
          <Text style={styles.chatName}>{group.title}</Text>
          <View style={styles.lockPill}>
            <Text style={styles.lockPillTxt}>اشتراک</Text>
          </View>
        </View>
        <Text style={styles.chatLast} numberOfLines={1}>{group.subtitle}</Text>
      </View>
    </Pressable>
  );
}

// ── Active conversation row ───────────────────────────────────────

function ActiveRow({
  conversation: c,
  myId,
  other,
  onPress,
}: {
  conversation: Conversation;
  myId: number;
  other: ConversationUser;
  onPress: () => void;
}) {
  const unread = c.unread_count ?? 0;
  const hasUnread = unread > 0;
  const lastTime = timeAgo(c.last_message_at);
  const isLastMine = c.last_message_sender_user_id === myId;

  const typePrefix = c.last_message_type ? (MSG_TYPE_PREFIX[c.last_message_type] ?? '') : '';
  const typeFallback = c.last_message_type ? MSG_TYPE_FALLBACK[c.last_message_type] : undefined;
  const preview = c.last_message_preview
    ? `${isLastMine ? 'شما: ' : ''}${typePrefix}${c.last_message_preview}`
    : typeFallback
      ? `${isLastMine ? 'شما: ' : ''}${typeFallback}`
      : '...';

  return (
    <Pressable
      style={({ pressed }) => [styles.chatRow, pressed && { backgroundColor: Colors.ph2 }]}
      onPress={onPress}
    >
      <Avatar size={50} name={other.first_name} photoUrl={photoUrl(other)} />
      <View style={styles.chatInfo}>
        <View style={styles.chatTop}>
          <Text style={[styles.chatName, hasUnread && styles.chatNameUnread]}>{other.first_name}</Text>
          <View style={styles.chatTopRight}>
            <Text style={[styles.chatTime, hasUnread && styles.chatTimeUnread]}>{lastTime}</Text>
            {hasUnread && (
              <View style={[styles.unreadBadge, { backgroundColor: Colors.accent }]}>
                <Text style={styles.unreadTxt}>{unread > 99 ? '۹۹+' : toFaDigits(unread)}</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={[styles.chatLast, hasUnread && styles.chatLastUnread]} numberOfLines={1}>
          {preview}
        </Text>
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
  const msgBody = c.last_message_preview ?? '';
  const lastTime = timeAgo(c.last_message_at);
  const goToProfile = () => router.push({ pathname: '/user/[id]', params: { id: String(other.id) } } as never);

  return (
    <Pressable style={styles.pendingCard} onPress={onPress}>
      <View style={styles.pendingTop}>
        <TouchableOpacity onPress={goToProfile} activeOpacity={0.8}>
          <Avatar size={46} name={other.first_name} photoUrl={photoUrl(other)} />
        </TouchableOpacity>
        <View style={styles.pendingInfo}>
          <View style={styles.chatTop}>
            <TouchableOpacity onPress={goToProfile} activeOpacity={0.7}>
              <Text style={styles.chatName}>{other.first_name}</Text>
            </TouchableOpacity>
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
              <ActivityIndicator size="small" color={Colors.accent} />
            ) : (
              <>
                <Check size={16} color={Colors.accent} strokeWidth={2.5} />
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
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerTitle: { fontSize: 18, fontFamily: Fonts.extraBold, color: Colors.ink },
  searchInput: {
    flex: 1,
    height: 36,
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.ink,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: Colors.hair,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabs: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 10,
    marginBottom: 0,
  },

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

  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },

  // Locked groups
  lockedGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 11,
    borderRadius: Radius.lg,
    marginBottom: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.hair,
  },
  lockedGroupIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lockedGroupIconTxt: {
    fontSize: 17,
    fontFamily: Fonts.extraBold,
    color: Colors.ink,
  },
  lockPill: {
    backgroundColor: Colors.accentSoft,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  lockPillTxt: { fontSize: 10, fontFamily: Fonts.bold, color: Colors.accent },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.modalBackdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  lockedDialog: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.hair,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 12,
  },
  lockedDialogIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lockedDialogIconTxt: { fontSize: 18, fontFamily: Fonts.extraBold, color: Colors.ink },
  lockedDialogTitle: {
    fontSize: 15.5,
    fontFamily: Fonts.extraBold,
    color: Colors.ink,
    textAlign: 'center',
  },
  lockedDialogBody: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
    color: Colors.inkSoft,
    lineHeight: 20,
    textAlign: 'center',
  },
  lockedDialogActions: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 4 },
  lockedDialogCancel: {
    flex: 1,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.hair,
    alignItems: 'center',
    paddingVertical: 11,
  },
  lockedDialogCancelTxt: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.ink },
  lockedDialogCta: {
    flex: 1.25,
    borderRadius: Radius.md,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  lockedDialogCtaTxt: { fontSize: 13, fontFamily: Fonts.bold, color: '#fff' },

  // Active row
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 11,
    borderRadius: Radius.lg,
    marginBottom: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.hair,
  },
  chatInfo: { flex: 1 },
  chatTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatTopRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chatName: { fontSize: 14.5, fontFamily: Fonts.semiBold, color: Colors.ink },
  chatNameUnread: { fontFamily: Fonts.extraBold },
  chatTime: { fontSize: 10.5, color: Colors.muted, fontFamily: Fonts.regular },
  chatTimeUnread: { color: Colors.accent, fontFamily: Fonts.semiBold },
  chatLast: { fontSize: 12.5, color: Colors.muted, fontFamily: Fonts.regular },
  chatLastUnread: { color: Colors.inkSoft, fontFamily: Fonts.semiBold },
  unreadBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadTxt: { fontSize: 10, fontFamily: Fonts.bold, color: '#fff' },

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
    borderWidth: 1.5,
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSoft,
  },
  acceptTxt: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.accent },

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
