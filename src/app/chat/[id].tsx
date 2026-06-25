import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { chatApi } from '@/lib/api/chat';
import { useChatMessages } from '@/lib/chat/useChatMessages';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from '@/lib/toast';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft, Check, CheckCheck, Clock,
  Lock, MoreVertical, Pencil, Search, Send, User, X,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
}

function MsgLimitCard() {
  return (
    <View style={msgLimitStyles.card}>
      <View style={msgLimitStyles.row}>
        <View style={msgLimitStyles.iconWrap}>
          <Lock size={17} color={Colors.goldDeep} strokeWidth={2} />
        </View>
        <Text style={msgLimitStyles.title}>سقف پیام روزانه</Text>
      </View>
      <Text style={msgLimitStyles.body}>
        به سقف پیام روزانه رسیدی. می‌تونی پاسخ‌ها رو ببینی و فردا دوباره پیام بفرستی.
      </Text>
      <TouchableOpacity
        style={msgLimitStyles.btn}
        activeOpacity={0.85}
        onPress={() => router.push('/subscription' as never)}
      >
        <Text style={msgLimitStyles.btnTxt}>ارتقا به Silver — ۵۰۰ پیام در روز</Text>
      </TouchableOpacity>
    </View>
  );
}

const msgLimitStyles = StyleSheet.create({
  card: {
    marginHorizontal: 4,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: Colors.goldSoft,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: `${Colors.gold}55`,
    padding: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.extraBold,
    fontSize: 13.5,
    color: Colors.ink,
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.inkSoft,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  btn: {
    backgroundColor: Colors.gold,
    borderRadius: Radius.pill,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnTxt: {
    fontFamily: Fonts.bold,
    fontSize: 12.5,
    color: Colors.ink,
  },
});

const TYPING_DEBOUNCE = 3000;

function formatLastSeen(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'همین الان';
  if (diff < 3600) return `${Math.floor(diff / 60)} دقیقه پیش`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ساعت پیش`;
  return `${Math.floor(diff / 86400)} روز پیش`;
}

export default function ConversationScreen() {
  const { id, publicId, name, avatar, status, otherId } = useLocalSearchParams<{
    id: string;
    publicId: string;
    name: string;
    avatar?: string;
    status?: string;
    otherId?: string;
  }>();

  const { session, user } = useAuth();
  const conversationId = Number(id);
  const myId = user?.id ?? -1;
  const token = session?.accessToken ?? '';

  const {
    messages, loading, sending, send,
    loadMore, hasMore, deleteMsg, editMsg,
    setReaction, removeReaction,
    loadContext, highlightId, clearHighlight,
  } = useChatMessages(conversationId, publicId ?? '', token);

  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [msgMenu, setMsgMenu] = useState<{ id: string; sender: number; body: string; myReaction?: string | null } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Presence
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Message search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<import('@/lib/api/chat').Message[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<TextInput>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<FlatList>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markedReadRef = useRef(false);

  const isPending = status === 'pending';
  const isLocked = status === 'locked';
  const isExpired = status === 'expired';
  const isRejected = status === 'rejected';
  const canChat = status === 'accepted';

  // Mark latest message as read on open (once)
  useEffect(() => {
    if (!token || !conversationId || markedReadRef.current) return;
    const others = messages.filter(m => m.sender_user_id !== myId && !m.is_deleted);
    const latest = others[others.length - 1];
    if (latest?.message_id && !latest.message_id.startsWith('optimistic')) {
      markedReadRef.current = true;
      chatApi.markRead(token, conversationId, latest.message_id).catch(() => {});
    }
  }, [messages, token, conversationId, myId]);

  // Auto-scroll to bottom when a new message arrives (not when old ones are prepended)
  const lastMsgIdRef = useRef<string | null>(null);
  const initialScrollDoneRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const [listReady, setListReady] = useState(false);

  // onContentSizeChange fires after FlatList has measured content — reliable for initial scroll
  const handleContentSizeChange = useCallback(() => {
    if (initialScrollDoneRef.current) return;
    if (messages.length === 0) return;
    listRef.current?.scrollToEnd({ animated: false });
    initialScrollDoneRef.current = true;
    lastMsgIdRef.current = messages[messages.length - 1]?.message_id ?? null;
    setListReady(true);
  }, [messages.length]);

  // For subsequent new messages (after initial load)
  useEffect(() => {
    if (!initialScrollDoneRef.current) return;
    const last = messages[messages.length - 1];
    if (!last || last.message_id === lastMsgIdRef.current) return;
    lastMsgIdRef.current = last.message_id;
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Debounced typing signal
  const sendTypingSignal = useCallback(() => {
    if (!token || !conversationId) return;
    if (typingTimerRef.current) return; // already sent recently
    chatApi.sendTyping(token, conversationId).catch(() => {});
    typingTimerRef.current = setTimeout(() => {
      typingTimerRef.current = null;
    }, TYPING_DEBOUNCE);
  }, [token, conversationId]);

  useEffect(() => () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  }, []);

  // Presence: fetch on open, heartbeat every 30s
  useEffect(() => {
    if (!token || !otherId) return;
    const uid = Number(otherId);
    chatApi.getPresence(token, uid)
      .then(p => { if (p) { setIsOnline(p.is_online); setLastSeen(p.last_seen_at ?? null); } })
      .catch(() => {});
    chatApi.heartbeat(token).catch(() => {});
    heartbeatRef.current = setInterval(() => {
      chatApi.heartbeat(token).catch(() => {});
    }, 30_000);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [token, otherId]);

  // Search debounce
  useEffect(() => {
    if (!searchOpen) { setSearchResults([]); return; }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await chatApi.searchMessages(token, conversationId, searchQuery.trim());
        setSearchResults((res.items ?? []).reverse());
      } catch {
        // silent
      } finally {
        setSearchLoading(false);
      }
    }, 400);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchQuery, searchOpen, token, conversationId]);

  // Focus search input when panel opens
  useEffect(() => {
    if (searchOpen) {
      const t = setTimeout(() => searchRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [searchOpen]);

  // Scroll to highlighted message
  useEffect(() => {
    if (!highlightId) return;
    const idx = messages.findIndex(m => m.message_id === highlightId);
    if (idx >= 0) {
      setTimeout(() => listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 }), 200);
    }
    const t = setTimeout(clearHighlight, 2000);
    return () => clearTimeout(t);
  }, [highlightId, messages, clearHighlight]);

  const handleTextChange = (val: string) => {
    setText(val);
    if (val.length > 0) sendTypingSignal();
  };

  const handleScroll = useCallback(({ nativeEvent }: { nativeEvent: { contentOffset: { y: number } } }) => {
    if (!hasMore || loadingMoreRef.current) return;
    if (nativeEvent.contentOffset.y < 100) {
      loadingMoreRef.current = true;
      loadMore().finally(() => { loadingMoreRef.current = false; });
    }
  }, [hasMore, loadMore]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setText('');
  }, []);

  const handleSend = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setText('');

    if (editingId) {
      setEditingId(null);
      try {
        await editMsg(editingId, body);
      } catch {
        toast.error('ویرایش پیام ناموفق بود');
      }
      return;
    }

    try {
      await send(body, myId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('limit exceeded') || msg.includes('Daily messages')) {
        setLimitReached(true);
      } else {
        setText(body);
        toast.error('ارسال پیام ناموفق بود');
      }
    }
  };

  const handleMore = () => setMenuOpen(true);

  const handleMessageLongPress = useCallback((messageId: string, senderId: number, bodyText: string, myReaction?: string | null) => {
    setMsgMenu({ id: messageId, sender: senderId, body: bodyText, myReaction });
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/chat' as never)}
        >
          <ArrowLeft size={20} color={Colors.ink} strokeWidth={2.5} />
        </TouchableOpacity>

        <Pressable
          style={styles.headerUser}
          onPress={() => otherId && router.push({ pathname: '/user/[id]', params: { id: otherId } } as never)}
        >
          <View style={styles.avatarWrap}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <View style={styles.avatarFallback}>
                <User size={16} color={Colors.muted} strokeWidth={1.5} />
              </View>
            )}
            {isOnline && <View style={styles.onlineDot} />}
          </View>
          <View>
            <Text style={styles.headerName}>{name ?? '...'}</Text>
            <Text style={styles.headerSub}>
              {isPending ? 'در انتظار تأیید' :
               isOnline ? 'آنلاین' :
               lastSeen ? `آخرین بازدید: ${formatLastSeen(lastSeen)}` : ''}
            </Text>
          </View>
        </Pressable>

        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setSearchOpen(s => !s)}>
            <Search size={18} color={searchOpen ? Colors.accent : Colors.ink} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleMore}>
            <MoreVertical size={20} color={Colors.ink} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search panel */}
      {searchOpen && (
        <View style={styles.searchPanel}>
          <TouchableOpacity onPress={() => { setSearchOpen(false); setSearchQuery(''); }}>
            <X size={18} color={Colors.muted} strokeWidth={2} />
          </TouchableOpacity>
          <TextInput
            ref={searchRef}
            style={styles.searchInput}
            placeholder="جستجو در گفتگو..."
            placeholderTextColor={Colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.accent} />
          </View>
        ) : searchOpen && searchQuery.trim() ? (
          /* Search results */
          searchLoading ? (
            <View style={styles.center}><ActivityIndicator color={Colors.accent} /></View>
          ) : searchResults.length === 0 ? (
            <View style={styles.searchEmpty}>
              <Text style={styles.searchEmptyTxt}>نتیجه‌ای پیدا نشد</Text>
            </View>
          ) : (
            <ScrollView style={styles.searchResults} keyboardShouldPersistTaps="handled">
              {searchResults.map(item => (
                <TouchableOpacity
                  key={item.message_id}
                  style={styles.searchResultItem}
                  onPress={async () => {
                    setSearchOpen(false);
                    setSearchQuery('');
                    await loadContext(item.message_id);
                  }}
                >
                  <Text style={styles.searchResultBody} numberOfLines={2}>{item.body_text || item.caption}</Text>
                  <Text style={styles.searchResultTime}>{formatTime(item.created_at)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={m => m.message_id}
            onScroll={handleScroll}
            scrollEventThrottle={200}
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            onContentSizeChange={handleContentSizeChange}
            style={!listReady && { opacity: 0 }}
            renderItem={({ item }) => {
              if (item.is_deleted) return null;
              const isMine = item.sender_user_id === myId;
              const isSending = item.status === 'sending';
              const isHighlighted = item.message_id === highlightId;

              // Tick icon: clock=sending, single check=sent, double grey=delivered, double accent=read
              const TickIcon = isSending ? Clock : item.read_at ? CheckCheck : item.delivered_at ? CheckCheck : item.status === 'sent' ? Check : CheckCheck;
              const tickColor = isSending ? 'rgba(255,255,255,0.4)'
                : item.read_at ? '#fff'
                : item.delivered_at ? 'rgba(255,255,255,0.55)'
                : 'rgba(255,255,255,0.55)';

              // Reaction summary: group by emoji
              const reactionGroups: Record<string, number> = {};
              for (const r of item.reactions ?? []) {
                reactionGroups[r.reaction] = (reactionGroups[r.reaction] ?? 0) + 1;
              }
              const reactionEntries: [string, number][] = Object.entries(reactionGroups);

              const BubbleContainer = isMine ? View : LinearGradient;
              const gradProps = isMine ? {} : {
                colors: Colors.gradSoftColors,
                start: { x: 0, y: 0 },
                end: { x: 1, y: 1 },
              };
              const bubbleContent = (
                <>
                  {item.message_type !== 'text' && item.message_type !== 'template_first_message' && (
                    <Text style={[styles.msgTypeBadge, isMine && { color: 'rgba(255,255,255,0.7)' }]}>
                      {item.message_type === 'gift' ? '🎁' :
                       item.message_type === 'image' ? '🖼' :
                       item.message_type === 'voice' ? '🎤' :
                       item.message_type === 'sticker' ? '😊' :
                       item.message_type === 'gif' ? 'GIF' : ''}
                    </Text>
                  )}
                  <Text style={[styles.bubbleTxt, isMine ? styles.bubbleTxtMine : styles.bubbleTxtTheirs]}>
                    {item.body_text || item.caption}
                  </Text>
                  {reactionEntries.length > 0 && (
                    <View style={styles.reactionsRow}>
                      {reactionEntries.map(([emoji, count]) => (
                        <TouchableOpacity
                          key={emoji}
                          style={[
                            styles.reactionChip,
                            isMine ? styles.reactionChipOnMine : styles.reactionChipOnTheirs,
                            item.my_reaction === emoji && styles.reactionChipActive,
                          ]}
                          onPress={() => {
                            if (item.my_reaction === emoji) removeReaction(item.message_id);
                            else setReaction(item.message_id, emoji);
                          }}
                        >
                          <Text style={styles.reactionEmoji}>{emoji}</Text>
                          {count > 1 && (
                            <Text style={[styles.reactionCount, isMine && styles.reactionCountMine]}>
                              {count}
                            </Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  <View style={styles.bubbleMeta}>
                    <Text style={[styles.bubbleTime, isMine ? styles.bubbleTimeMine : styles.bubbleTimeTheirs]}>
                      {formatTime(item.created_at)}
                    </Text>
                    {isMine && <TickIcon size={10} color={tickColor} strokeWidth={2.5} />}
                  </View>
                </>
              );

              return (
                <View style={[styles.msgWrap, isHighlighted && styles.msgHighlight]}>
                  <Pressable
                    style={isMine ? styles.bubblePressMine : styles.bubblePressTheirs}
                    onLongPress={() => handleMessageLongPress(item.message_id, item.sender_user_id, item.body_text || item.caption, item.my_reaction)}
                    delayLongPress={400}
                  >
                    <BubbleContainer
                      {...(gradProps as any)}
                      style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}
                    >
                      {bubbleContent}
                    </BubbleContainer>
                  </Pressable>
                </View>
              );
            }}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onScrollToIndexFailed={() => {}}
            ListEmptyComponent={
              canChat ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyEmoji}>💬</Text>
                  <Text style={styles.emptyTxt}>هنوز پیامی نیست</Text>
                  <Text style={styles.emptySub}>اولین پیام رو بفرست!</Text>
                </View>
              ) : null
            }
            ListFooterComponent={limitReached ? <MsgLimitCard /> : null}
          />
        )}

        {isPending && (
          <View style={styles.pendingBanner}>
            <Clock size={14} color={Colors.trust} strokeWidth={2} />
            <Text style={styles.pendingTxt}>
              در انتظار تأیید {name} — تا تأیید نشه چت باز نمیشه
            </Text>
          </View>
        )}

        {isExpired && (
          <View style={styles.expiredBanner}>
            <Clock size={14} color={Colors.muted} strokeWidth={2} />
            <Text style={styles.expiredTxt}>این درخواست منقضی شده</Text>
          </View>
        )}

        {isRejected && (
          <View style={styles.rejectedBanner}>
            <X size={14} color={Colors.danger} strokeWidth={2} />
            <Text style={styles.rejectedTxt}>این درخواست رد شده</Text>
          </View>
        )}

        {isLocked && (
          <View style={styles.lockedBanner}>
            <Lock size={14} color={Colors.muted} strokeWidth={2} />
            <Text style={styles.lockedTxt}>این گفت‌وگو قفل شده</Text>
          </View>
        )}

        {editingId && (
          <View style={styles.editBar}>
            <Pencil size={13} color={Colors.accent} strokeWidth={2} />
            <Text style={styles.editBarTxt} numberOfLines={1}>در حال ویرایش پیام</Text>
            <TouchableOpacity onPress={cancelEdit} hitSlop={8}>
              <X size={15} color={Colors.muted} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.inputBar, (!canChat || limitReached) && styles.inputBarDisabled]}>
          {!canChat || limitReached ? (
            <View style={styles.inputLocked}>
              <Lock size={14} color={Colors.muted} strokeWidth={1.8} />
              <Text style={styles.inputLockedTxt}>
                {limitReached ? 'سقف پیام روزانه' : isPending ? 'در انتظار تأیید…' : isExpired ? 'درخواست منقضی شده' : isRejected ? 'درخواست رد شده' : 'چت قفل است'}
              </Text>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={handleTextChange}
                placeholder={editingId ? 'ویرایش' : 'پیام'}
                placeholderTextColor={Colors.muted}
                multiline
                maxLength={2000}
                textAlign="right"
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[styles.sendBtn, !!text.trim() && styles.sendBtnActive]}
                onPress={handleSend}
                disabled={!text.trim() || sending}
                activeOpacity={0.8}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    {!!text.trim() && (
                      <LinearGradient colors={Colors.gradColors as [string, string]} style={StyleSheet.absoluteFill} />
                    )}
                    {editingId
                      ? <Pencil size={17} color={text.trim() ? '#fff' : Colors.muted} strokeWidth={2} />
                      : <Send style={[styles.sendBtnIcon]} size={18} color={text.trim() ? '#fff' : Colors.muted} strokeWidth={2} />
                    }
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Message long-press menu */}
      <Modal visible={!!msgMenu} transparent animationType="fade" onRequestClose={() => { setMsgMenu(null); setConfirmDeleteId(null); }}>
        <Pressable style={styles.menuOverlay} onPress={() => { setMsgMenu(null); setConfirmDeleteId(null); }}>
          <View style={styles.menuSheet}>
            <View style={styles.menuHandle} />
            {confirmDeleteId ? (
              <>
                <Text style={styles.msgMenuTitle}>پیام برای همه حذف می‌شود</Text>
                <TouchableOpacity style={[styles.menuRow, styles.menuRowDanger]} activeOpacity={0.7}
                  onPress={() => { deleteMsg(confirmDeleteId); setConfirmDeleteId(null); setMsgMenu(null); }}>
                  <Text style={[styles.menuRowTxt, styles.menuRowTxtDanger]}>تأیید حذف</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.menuRow, styles.menuCancel]} activeOpacity={0.7}
                  onPress={() => setConfirmDeleteId(null)}>
                  <Text style={styles.menuCancelTxt}>بازگشت</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Reaction picker — shown for all messages */}
                {(() => {
                  const EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '🔥'];
                  const curReaction = msgMenu?.myReaction;
                  return (
                    <View style={styles.reactionPicker}>
                      {EMOJIS.map(emoji => (
                        <TouchableOpacity
                          key={emoji}
                          style={[styles.reactionPickerBtn, curReaction === emoji && styles.reactionPickerBtnActive]}
                          onPress={() => {
                            if (!msgMenu) return;
                            if (curReaction === emoji) removeReaction(msgMenu.id);
                            else setReaction(msgMenu.id, emoji);
                            setMsgMenu(null);
                          }}
                        >
                          <Text style={styles.reactionPickerEmoji}>{emoji}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  );
                })()}

                {msgMenu?.sender === myId ? (
                  <>
                    <TouchableOpacity style={styles.menuRow} activeOpacity={0.7}
                      onPress={() => { setEditingId(msgMenu!.id); setText(msgMenu!.body); setMsgMenu(null); }}>
                      <Text style={styles.menuRowTxt}>ویرایش پیام</Text>
                    </TouchableOpacity>
                    {!!msgMenu?.body && (
                      <TouchableOpacity style={styles.menuRow} activeOpacity={0.7}
                        onPress={() => { Share.share({ message: msgMenu!.body }).catch(() => {}); setMsgMenu(null); }}>
                        <Text style={styles.menuRowTxt}>اشتراک‌گذاری</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={[styles.menuRow, styles.menuRowDanger]} activeOpacity={0.7}
                      onPress={() => setConfirmDeleteId(msgMenu!.id)}>
                      <Text style={[styles.menuRowTxt, styles.menuRowTxtDanger]}>حذف پیام</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {!!msgMenu?.body && (
                      <TouchableOpacity style={styles.menuRow} activeOpacity={0.7}
                        onPress={() => { Share.share({ message: msgMenu!.body }).catch(() => {}); setMsgMenu(null); }}>
                        <Text style={styles.menuRowTxt}>اشتراک‌گذاری</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={[styles.menuRow, styles.menuRowDanger]} activeOpacity={0.7}
                      onPress={() => { setMsgMenu(null); setTimeout(() => router.push({ pathname: '/report-user', params: { userId: otherId ?? String(msgMenu?.sender), userName: name ?? '', conversationPublicId: publicId ?? '', messageId: msgMenu?.id, context: 'message' } } as never), 100); }}>
                      <Text style={[styles.menuRowTxt, styles.menuRowTxtDanger]}>گزارش پیام</Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity style={[styles.menuRow, styles.menuCancel]} activeOpacity={0.7}
                  onPress={() => setMsgMenu(null)}>
                  <Text style={styles.menuCancelTxt}>انصراف</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* More menu */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
          <View style={styles.menuSheet}>
            <View style={styles.menuHandle} />
            {otherId && (
              <TouchableOpacity
                style={styles.menuRow}
                activeOpacity={0.7}
                onPress={() => { setMenuOpen(false); setTimeout(() => router.push({ pathname: '/user/[id]', params: { id: otherId } } as never), 100); }}
              >
                <Text style={styles.menuRowTxt}>مشاهده پروفایل</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.menuRow, styles.menuRowDanger]}
              activeOpacity={0.7}
              onPress={() => { setMenuOpen(false); setTimeout(() => router.push({ pathname: '/report-user', params: { userId: otherId ?? '', userName: name ?? '' } } as never), 100); }}
            >
              <Text style={[styles.menuRowTxt, styles.menuRowTxtDanger]}>گزارش تخلف</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuRow, styles.menuCancel]} activeOpacity={0.7} onPress={() => setMenuOpen(false)}>
              <Text style={styles.menuCancelTxt}>انصراف</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },

  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.hair,
    backgroundColor: Colors.surface,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  headerUser: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingHorizontal: 4,
  },
  avatarWrap: {
    width: 36, height: 36, borderRadius: 18,
    overflow: 'hidden', backgroundColor: Colors.ph2,
  },
  avatarFallback: {
    width: '100%', height: '100%',
    backgroundColor: Colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  headerName: { fontSize: 15, fontFamily: Fonts.extraBold, color: Colors.ink },
  headerSub: { fontSize: 10.5, fontFamily: Fonts.regular, color: Colors.trust, marginTop: 1 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  listContent: {
    padding: Spacing.md,
    paddingBottom: 80,
    flexGrow: 1,
  },

  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingTop: 60,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTxt: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.ink },
  emptySub: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.muted },

  // Message rows
  msgWrap: { marginVertical: 3 },
  bubblePressMine: { marginLeft: 'auto', maxWidth: '78%' },
  bubblePressTheirs: { marginRight: 'auto', maxWidth: '78%' },

  bubble: {
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleMine: {
    backgroundColor: Colors.accent,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    borderBottomLeftRadius: 4,
    shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  msgTypeBadge: {
    fontSize: 11, color: Colors.muted, marginBottom: 3,
  },
  bubbleTxt: { fontSize: 14, fontFamily: Fonts.regular, lineHeight: 22 },
  bubbleTxtMine: { color: '#fff' },
  bubbleTxtTheirs: { color: Colors.ink },
  bubbleMeta: {
    flexDirection: 'row', alignItems: 'center',
    gap: 4, marginTop: 3, justifyContent: 'flex-end',
  },
  bubbleTime: { fontSize: 10, fontFamily: Fonts.regular },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.6)' },
  bubbleTimeTheirs: { color: Colors.muted },

  // Edit mode bar
  editBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: Colors.accentSoft,
    borderTopWidth: 1, borderTopColor: Colors.accent + '33',
  },
  editBarTxt: {
    flex: 1, fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.accent,
  },

  // Banners
  expiredBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 12, marginBottom: 8,
    backgroundColor: Colors.ph2, borderRadius: Radius.lg, padding: 10,
  },
  expiredTxt: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.muted },
  rejectedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 12, marginBottom: 8,
    backgroundColor: Colors.dangerSoft, borderRadius: Radius.lg, padding: 10,
  },
  rejectedTxt: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.danger },

  // Banners
  pendingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 12, marginBottom: 8,
    backgroundColor: Colors.trustSoft, borderRadius: Radius.lg, padding: 10,
  },
  pendingTxt: {
    fontSize: 12, fontFamily: Fonts.regular, color: '#2C5C8F',
    flex: 1, lineHeight: 18,
  },
  lockedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 12, marginBottom: 8,
    backgroundColor: Colors.ph2, borderRadius: Radius.lg, padding: 10,
  },
  lockedTxt: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.muted },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.hair,
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 4,
  },
  inputBarDisabled: { backgroundColor: Colors.ph2, shadowOpacity: 0 },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 128,
    textAlign: 'right',
    backgroundColor: Colors.bg,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.hair,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 14.5,
    fontFamily: Fonts.regular,
    color: Colors.ink,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.ph2,
  },
  sendBtnIcon: {
    zIndex: 1
  },
  sendBtnActive: { backgroundColor: 'transparent' },
  inputLocked: {
    flex: 1, height: 44, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, paddingHorizontal: 16,
    backgroundColor: Colors.bg, borderRadius: 22,
    borderWidth: 1.5, borderColor: Colors.hair,
  },
  inputLockedTxt: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.muted },

  msgMenuTitle: {
    fontSize: 13, fontFamily: Fonts.regular, color: Colors.muted,
    textAlign: 'center', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md,
  },

  // More menu
  menuOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    paddingBottom: 32, paddingTop: 10,
    overflow: 'hidden',
  },
  menuHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.hair, alignSelf: 'center', marginBottom: 12,
  },
  menuRow: {
    paddingHorizontal: Spacing.xl, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.hair,
  },
  menuRowDanger: { },
  menuRowTxt: { fontSize: 15, fontFamily: Fonts.semiBold, color: Colors.ink, textAlign: 'right' },
  menuRowTxtDanger: { color: Colors.danger },
  menuCancel: { borderBottomWidth: 0, marginTop: 4 },
  menuCancelTxt: { fontSize: 15, fontFamily: Fonts.semiBold, color: Colors.muted, textAlign: 'right' },

  // Header extras
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.ok,
    borderWidth: 2, borderColor: Colors.surface,
  },

  // Reaction row inside bubble
  reactionsRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 4, marginTop: 6,
  },
  reactionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 10, borderWidth: 1,
  },
  reactionChipOnMine: {
    backgroundColor: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.35)',
  },
  reactionChipOnTheirs: {
    backgroundColor: 'rgba(0,0,0,0.07)', borderColor: 'rgba(0,0,0,0.12)',
  },
  reactionChipActive: {
    backgroundColor: 'rgba(255,255,255,0.4)', borderColor: '#fff',
  },
  reactionChipMine: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft },
  reactionEmoji: { fontSize: 13 },
  reactionCount: { fontSize: 11, fontFamily: Fonts.semiBold, color: Colors.ink },
  reactionCountMine: { color: 'rgba(255,255,255,0.9)' },

  // Reaction picker in menu
  reactionPicker: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.hair,
  },
  reactionPickerBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.ph2,
  },
  reactionPickerBtnActive: { backgroundColor: Colors.accentSoft },
  reactionPickerEmoji: { fontSize: 22 },

  // Search panel
  searchPanel: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.hair,
  },
  searchInput: {
    flex: 1, height: 38, borderRadius: 19,
    backgroundColor: Colors.bg, borderWidth: 1.5, borderColor: Colors.hair,
    paddingHorizontal: 14, fontSize: 13.5,
    fontFamily: Fonts.regular, color: Colors.ink, textAlign: 'right',
  },
  searchResults: {
    flex: 1, backgroundColor: Colors.bg,
  },
  searchResultItem: {
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.hair,
  },
  searchResultBody: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.ink },
  searchResultTime: { fontSize: 10.5, fontFamily: Fonts.regular, color: Colors.muted, marginTop: 2 },
  searchEmpty: {
    alignItems: 'center', paddingTop: 40, gap: 8,
  },
  searchEmptyTxt: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.inkSoft },

  // Message highlight
  msgHighlight: { backgroundColor: Colors.accentSoft + '55' },
});
