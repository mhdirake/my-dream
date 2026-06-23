import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { chatApi } from '@/lib/api/chat';
import { useChatMessages } from '@/lib/chat/useChatMessages';
import { useAuth } from '@/lib/auth/AuthContext';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft, CheckCheck, Clock,
  Lock, MoreVertical, Pencil, Send, User, X,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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

const TYPING_DEBOUNCE = 3000;

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
  } = useChatMessages(conversationId, publicId ?? '', token);

  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
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

  // Auto-scroll to bottom when new messages arrive
  const prevLengthRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      prevLengthRef.current = messages.length;
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [messages.length]);

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

  const handleTextChange = (val: string) => {
    setText(val);
    if (val.length > 0) sendTypingSignal();
  };

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
        // rollback already handled inside editMsg
      }
      return;
    }

    try {
      await send(body, myId);
    } catch {
      setText(body);
    }
  };

  const handleMore = () => {
    Alert.alert(name ?? '...', undefined, [
      otherId
        ? { text: 'مشاهده پروفایل', onPress: () => router.push({ pathname: '/user/[id]', params: { id: otherId } } as never) }
        : undefined,
      { text: 'گزارش', onPress: () => router.push({ pathname: '/report-user', params: { userId: otherId ?? '', userName: name ?? '' } } as never) },
      { text: 'انصراف', style: 'cancel' },
    ].filter(Boolean) as any);
  };

  const handleMessageLongPress = useCallback((messageId: string, senderId: number, bodyText: string) => {
    const isMine = senderId === myId;
    if (isMine) {
      Alert.alert('پیام', undefined, [
        {
          text: 'ویرایش',
          onPress: () => { setEditingId(messageId); setText(bodyText); },
        },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () =>
            Alert.alert('حذف پیام', 'پیام برای همه حذف می‌شود.', [
              { text: 'لغو', style: 'cancel' },
              { text: 'حذف', style: 'destructive', onPress: () => deleteMsg(messageId) },
            ]),
        },
        bodyText
          ? { text: 'اشتراک‌گذاری', onPress: () => Share.share({ message: bodyText }).catch(() => {}) }
          : undefined,
        { text: 'انصراف', style: 'cancel' },
      ].filter(Boolean) as any);
    } else {
      Alert.alert('پیام', undefined, [
        {
          text: 'گزارش پیام',
          style: 'destructive',
          onPress: () => router.push({
            pathname: '/report-user',
            params: {
              userId: otherId ?? String(senderId),
              userName: name ?? '',
              conversationPublicId: publicId ?? '',
              messageId,
              context: 'message',
            },
          } as never),
        },
        bodyText
          ? { text: 'اشتراک‌گذاری', onPress: () => Share.share({ message: bodyText }).catch(() => {}) }
          : undefined,
        { text: 'انصراف', style: 'cancel' },
      ].filter(Boolean) as any);
    }
  }, [myId, otherId, name, publicId, deleteMsg]);

  // Reversed list — newest at bottom (FlatList inverted renders bottom → top)
  const reversed = [...messages].reverse();

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
          </View>
          <View>
            <Text style={styles.headerName}>{name ?? '...'}</Text>
            {isPending && (
              <Text style={styles.headerSub}>در انتظار تأیید</Text>
            )}
          </View>
        </Pressable>

        <TouchableOpacity style={styles.iconBtn} onPress={handleMore}>
          <MoreVertical size={20} color={Colors.ink} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.accent} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={reversed}
            inverted
            keyExtractor={m => m.message_id}
            renderItem={({ item }) => {
              if (item.is_deleted) return null;
              const isMine = item.sender_user_id === myId;
              const isSending = item.status === 'sending';

              return (
                <View style={[styles.msgWrap, isMine ? styles.msgWrapMine : styles.msgWrapTheirs]}>
                  <Pressable
                    onLongPress={() => handleMessageLongPress(item.message_id, item.sender_user_id, item.body_text || item.caption)}
                    delayLongPress={400}
                  >
                    <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
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
                      <View style={styles.bubbleMeta}>
                        <Text style={[styles.bubbleTime, isMine ? styles.bubbleTimeMine : styles.bubbleTimeTheirs]}>
                          {formatTime(item.created_at)}
                        </Text>
                        {isMine && (
                          isSending
                            ? <Clock size={10} color="rgba(255,255,255,0.5)" strokeWidth={2} />
                            : <CheckCheck size={10} color={isMine ? 'rgba(255,255,255,0.65)' : Colors.muted} strokeWidth={2} />
                        )}
                      </View>
                    </View>
                  </Pressable>
                </View>
              );
            }}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onEndReached={hasMore ? loadMore : undefined}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={
              canChat ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyEmoji}>💬</Text>
                  <Text style={styles.emptyTxt}>هنوز پیامی نیست</Text>
                  <Text style={styles.emptySub}>اولین پیام رو بفرست!</Text>
                </View>
              ) : null
            }
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

        <View style={[styles.inputBar, !canChat && styles.inputBarDisabled]}>
          {!canChat ? (
            <View style={styles.inputLocked}>
              <Lock size={14} color={Colors.muted} strokeWidth={1.8} />
              <Text style={styles.inputLockedTxt}>
                {isPending ? 'در انتظار تأیید…' : isExpired ? 'درخواست منقضی شده' : isRejected ? 'درخواست رد شده' : 'چت قفل است'}
              </Text>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={handleTextChange}
                placeholder={editingId ? 'ویرایش پیام…' : 'پیام بنویس…'}
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
    paddingBottom: Spacing.sm,
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
  msgWrap: { flexDirection: 'row', marginVertical: 3 },
  msgWrapMine: { justifyContent: 'flex-end' },
  msgWrapTheirs: { justifyContent: 'flex-start' },

  bubble: {
    maxWidth: '78%',
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
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.hair,
    borderBottomLeftRadius: 4,
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
});
