import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { ApiError } from '@/lib/api/client';
import { Message, type MessageSender, chatApi } from '@/lib/api/chat';
import { BackendGift } from '@/lib/api/discover';
import { giftsApi } from '@/lib/api/gifts';
import { profileApi } from '@/lib/api/profile';
import { useChatMessages } from '@/lib/chat/useChatMessages';
import { useCentrifugoCtx } from '@/lib/chat/CentrifugoContext';
import { selectInitialChatPosition, type InitialChatPosition } from '@/lib/chat/initialPosition';
import { formatPersianDate, formatPersianTime } from '@/lib/date/persian';
import { useVoiceRecorder } from '@/lib/chat/useVoiceRecorder';
import { toFaDigits } from '@/lib/localization';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from '@/lib/toast';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  ArrowRight, Check, CheckCheck, Clock, Gift as GiftIcon,
  ImageOff, ImagePlus, Lock, Mic, MoreVertical, Paperclip, Pause, Pencil, Play,
  RefreshCw, Search, Send, Trash2, User, Users, X,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Keyboard,
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
  ViewToken,
  View,
} from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

function formatTime(iso: string) {
  return formatPersianTime(iso);
}

function toPersianNum(n: number) {
  return String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);
}

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return toFaDigits(`${m}:${String(s).padStart(2, '0')}`);
}

const VOICE_WAVE_BARS = [3, 5, 10, 18, 18, 15, 18, 9, 8, 10, 7, 5, 6, 13, 16, 14, 19, 12, 10, 16, 20, 8, 6, 13, 9, 17, 19, 17, 16, 13, 11, 10, 8];

function VoiceBubblePlayer({
  uri, durationSeconds, isMine, tint,
}: {
  uri: string;
  durationSeconds: number;
  isMine: boolean;
  tint: string;
}) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  const toggle = () => {
    if (status.playing) player.pause();
    else {
      if (status.currentTime >= (status.duration || durationSeconds)) player.seekTo(0);
      player.play();
    }
  };

  if (status.error) {
    return (
      <View style={styles.voicePlayerRow}>
        <ImageOff size={16} color={tint} strokeWidth={1.8} />
        <Text style={[styles.voiceDurationTxt, { color: tint }]}>پیام صوتی در دسترس نیست</Text>
      </View>
    );
  }

  const remaining = status.playing || status.currentTime > 0
    ? Math.max(0, Math.ceil((status.duration || durationSeconds) - status.currentTime))
    : durationSeconds;

  return (
    <View style={styles.voicePlayerRow}>
      <TouchableOpacity style={[styles.voicePlayBtn, { backgroundColor: isMine ? 'rgba(255,255,255,0.84)' : '#D8E3EE' }]} onPress={toggle} activeOpacity={0.8}>
        {status.playing
          ? <Pause size={18} color={isMine ? Colors.accent : Colors.ink} strokeWidth={2.6} />
          : <Play size={18} color={isMine ? Colors.accent : Colors.ink} fill={isMine ? Colors.accent : Colors.ink} strokeWidth={0} />
        }
      </TouchableOpacity>
      <View style={styles.voiceContent}>
        <View style={styles.voiceWave}>
          {VOICE_WAVE_BARS.map((height, index) => (
            <View
              key={`${height}-${index}`}
              style={[
                styles.voiceWaveBar,
                {
                  height,
                  backgroundColor: isMine ? 'rgba(255,255,255,0.58)' : '#9AABBC',
                },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.voiceDurationTxt, { color: isMine ? 'rgba(255,255,255,0.76)' : Colors.muted }]}>{formatDuration(remaining)}</Text>
      </View>
    </View>
  );
}

const GIFT_SLUG_EMOJI: Record<string, string> = {
  'dream-rose':    '🌹',
  'coffee-invite': '☕',
  'cool-moon':     '🌙',
  'golden-heart':  '💛',
  'legendary-star':'⭐',
};

function isSameDay(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function formatDayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diffDays === 0) return 'امروز';
  if (diffDays === 1) return 'دیروز';
  return formatPersianDate(iso, { year: d.getFullYear() !== now.getFullYear() });
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
const CHAT_VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 60, minimumViewTime: 250 };
const RESOLVING_INITIAL_POSITION: InitialChatPosition = { kind: 'resolving' };
const MESSAGE_BUBBLE_MIN_WIDTH = 132;
const GROUP_AVATAR_SIZE = 30;
const ANDROID_KEYBOARD_COMPOSER_GAP = 24;

function formatLastSeen(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'همین الان';
  if (diff < 3600) return `${Math.floor(diff / 60)} دقیقه پیش`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ساعت پیش`;
  return `${Math.floor(diff / 86400)} روز پیش`;
}

function resolveMessageSender(
  message: Message,
  allMessages: Message[],
  mySender: MessageSender | null,
): MessageSender | null {
  return message.sender
    ?? (message.sender_user_id === mySender?.id ? mySender : null)
    ?? allMessages.find(item => item.sender_user_id === message.sender_user_id && item.sender)?.sender
    ?? null;
}

function senderDisplayName(
  message: Message,
  allMessages: Message[],
  mySender: MessageSender | null,
): string {
  const sender = resolveMessageSender(message, allMessages, mySender);

  return [sender?.first_name, sender?.last_name].filter(Boolean).join(' ')
    || sender?.username
    || `کاربر ${toFaDigits(message.sender_user_id)}`;
}

function senderAvatarUrl(
  message: Message,
  allMessages: Message[],
  mySender: MessageSender | null,
): string | null {
  const sender = resolveMessageSender(message, allMessages, mySender);

  return sender?.profile_photo?.urls?.thumbnail
    ?? sender?.profile_photo?.urls?.small
    ?? sender?.profile_photo?.urls?.medium
    ?? null;
}

function senderById(userId: number, allMessages: Message[], mySender: MessageSender | null): MessageSender | null {
  if (userId === mySender?.id || userId === -1) return mySender;
  return allMessages.find(item => item.sender_user_id === userId && item.sender)?.sender ?? null;
}

function reactionAvatarUrl(userId: number, allMessages: Message[], mySender: MessageSender | null): string | null {
  const sender = senderById(userId, allMessages, mySender);

  return sender?.profile_photo?.urls?.thumbnail
    ?? sender?.profile_photo?.urls?.small
    ?? sender?.profile_photo?.urls?.medium
    ?? null;
}

function replyPreviewText(message: Message | null): string {
  if (!message) return 'مشاهده پیام';
  if (message.body_text || message.caption) return message.body_text || message.caption;
  if (message.message_type === 'voice') return 'پیام صوتی';
  if (message.message_type === 'image') return 'تصویر';
  if (message.message_type === 'gift') return 'هدیه';
  if (message.message_type === 'sticker') return message.sticker_id || 'استیکر';
  if (message.message_type === 'gif') return 'GIF';
  return 'مشاهده پیام';
}

export default function ConversationScreen() {
  const insets = useSafeAreaInsets();
  const { id, publicId, name, avatar, status, otherId, isSender, conversationType, groupKey, memberCount, targetMessageId } = useLocalSearchParams<{
    id: string;
    publicId: string;
    name: string;
    avatar?: string;
    status?: string;
    otherId?: string;
    isSender?: string;
    conversationType?: 'direct' | 'group';
    groupKey?: 'silver' | 'gold';
    memberCount?: string;
    targetMessageId?: string;
  }>();

  const { session, user } = useAuth();
  const conversationId = Number(id);
  const myId = user?.id ?? -1;
  const token = session?.accessToken ?? '';
  const isGroup = conversationType === 'group';

  const {
    messages, loading, loadError, send, sendTyped, retryMessage, pushMessage, typingUserId,
    loadMore, hasMore, deleteMsg, editMsg,
    setReaction, removeReaction,
    loadContext, highlightId, clearHighlight, refresh,
  } = useChatMessages(conversationId, publicId ?? '', token, myId, isGroup ? 'group' : 'direct');
  const { connectionState } = useCentrifugoCtx();

  const otherTyping = typingUserId != null && (isGroup ? typingUserId !== myId : String(typingUserId) === otherId);

  const [text, setText] = useState('');
  const [pendingImage, setPendingImage] = useState<{ uri: string; mimeType: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [myPlan, setMyPlan] = useState<string>('basic');
  const [mySender, setMySender] = useState<MessageSender | null>(null);
  const [giftPickerOpen, setGiftPickerOpen] = useState(false);
  const [gifts, setGifts] = useState<BackendGift[]>([]);
  const [giftsLoading, setGiftsLoading] = useState(false);
  const [sendingGiftId, setSendingGiftId] = useState<number | null>(null);
  const [selectedGift, setSelectedGift] = useState<BackendGift | null>(null);
  const [giftNote, setGiftNote] = useState('');
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [failedImageUris, setFailedImageUris] = useState<Set<string>>(new Set());
  const [sendingVoice, setSendingVoice] = useState(false);
  const voiceRecorder = useVoiceRecorder();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [attachmentTrayOpen, setAttachmentTrayOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [msgMenu, setMsgMenu] = useState<{ id: string; sender: number; body: string; type?: string; myReaction?: string | null } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // پیش‌بارگذاری کاتالوگ هدیه‌ها تا پیام‌های نوع gift (حتی قبل از باز کردن picker) بتونن به عکس/عنوان واقعی وصل بشن
  useEffect(() => {
    if (!token || gifts.length > 0) return;
    giftsApi.list(token).then(setGifts).catch(() => {});
  }, [token, gifts.length]);

  // Presence
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  // Message search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<import('@/lib/api/chat').MessageSearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<TextInput>(null);
  const composerRef = useRef<TextInput>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composerFocusTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const listRef = useRef<FlatList>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatRuntimeRef = useRef({ conversationId, myId, token });
  const lastMarkedReadIdRef = useRef<string | null>(null);
  const lastMarkedDeliveredIdRef = useRef<string | null>(null);
  const isScreenFocusedRef = useRef(false);
  const initialScrollDoneRef = useRef(false);

  const [reqStatus, setReqStatus] = useState(status);
  const [responding, setResponding] = useState(false);

  const isPending = reqStatus === 'pending';
  const isLocked = reqStatus === 'locked';
  const isExpired = reqStatus === 'expired';
  const isRejected = reqStatus === 'rejected';
  const canChat = reqStatus === 'accepted';
  const canRespond = isPending && isSender !== '1';

  useEffect(() => {
    chatRuntimeRef.current = { conversationId, myId, token };
  }, [conversationId, myId, token]);

  const focusComposerOnWeb = useCallback(() => {
    if (Platform.OS !== 'web') return;

    const focus = () => composerRef.current?.focus();
    focus();

    for (const delay of [0, 80, 180]) {
      const timer = setTimeout(() => {
        composerFocusTimersRef.current = composerFocusTimersRef.current.filter(item => item !== timer);
        focus();
      }, delay);
      composerFocusTimersRef.current.push(timer);
    }
  }, []);

  const preventComposerBlurOnWeb = useCallback((event: unknown) => {
    if (Platform.OS !== 'web') return;

    const maybeEvent = event as {
      preventDefault?: () => void;
      nativeEvent?: { preventDefault?: () => void };
    };
    maybeEvent.preventDefault?.();
    maybeEvent.nativeEvent?.preventDefault?.();
    composerRef.current?.focus();
  }, []);

  useEffect(() => () => {
    for (const timer of composerFocusTimersRef.current) clearTimeout(timer);
    composerFocusTimersRef.current = [];
  }, []);

  const handleRespond = async (action: 'accepted' | 'rejected') => {
    if (!token || !conversationId) return;
    setResponding(true);
    try {
      if (action === 'accepted') {
        await chatApi.acceptConversation(token, conversationId);
        setReqStatus('accepted');
      } else {
        await chatApi.rejectConversation(token, conversationId);
        setReqStatus('rejected');
      }
    } catch {
      toast.error(action === 'accepted' ? 'خطا در پذیرش درخواست' : 'خطا در رد درخواست');
    } finally {
      setResponding(false);
    }
  };

  // Mark latest inbound message as read — روی هر پیام جدیدی که حین باز بودن صفحه می‌رسه هم اجرا می‌شه
  useFocusEffect(useCallback(() => {
    isScreenFocusedRef.current = true;
    return () => { isScreenFocusedRef.current = false; };
  }, []));

  useEffect(() => {
    if (!token || !conversationId || AppState.currentState !== 'active') return;
    const others = messages.filter(m => m.sender_user_id !== myId && !m.is_deleted);
    const latest = others[others.length - 1];
    if (
      latest?.message_id &&
      !latest.message_id.startsWith('optimistic') &&
      lastMarkedDeliveredIdRef.current !== latest.message_id
    ) {
      lastMarkedDeliveredIdRef.current = latest.message_id;
      chatApi.markDelivered(token, conversationId, latest.message_id).catch(() => {});
    }
  }, [messages, token, conversationId, myId]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken<Message>[] }) => {
    if (
      !initialScrollDoneRef.current ||
      !isScreenFocusedRef.current ||
      AppState.currentState !== 'active'
    ) return;
    const {
      conversationId: currentConversationId,
      myId: currentMyId,
      token: currentToken,
    } = chatRuntimeRef.current;
    if (!currentToken || !currentConversationId) return;
    const latestVisibleInbound = viewableItems
      .filter(item => item.isViewable && item.item.sender_user_id !== currentMyId && !item.item.is_deleted)
      .map(item => item.item)
      .at(-1);
    if (
      !latestVisibleInbound?.message_id ||
      latestVisibleInbound.message_id.startsWith('optimistic') ||
      lastMarkedReadIdRef.current === latestVisibleInbound.message_id
    ) return;
    lastMarkedReadIdRef.current = latestVisibleInbound.message_id;
    chatApi.markRead(currentToken, currentConversationId, latestVisibleInbound.message_id).catch(() => {});
  }, []);

  // Auto-scroll to bottom when a new message arrives (not when old ones are prepended)
  const lastMsgIdRef = useRef<string | null>(null);
  const loadingMoreRef = useRef(false);
  const isNearTailRef = useRef(true);
  const [listReady, setListReady] = useState(false);
  const [unseenMessageCount, setUnseenMessageCount] = useState(0);
  const messagesRef = useRef(messages);
  const initialHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tailScrollTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pendingScrollRetryRef = useRef<{ index: number; viewPosition: number } | null>(null);
  const conversationKey = publicId ?? String(conversationId);
  const [initialPositionState, setInitialPositionState] = useState<{
    conversationKey: string;
    position: InitialChatPosition;
  }>({ conversationKey, position: RESOLVING_INITIAL_POSITION });
  const initialPosition = initialPositionState.conversationKey === conversationKey
    ? initialPositionState.position
    : RESOLVING_INITIAL_POSITION;
  const listIsReady = initialPositionState.conversationKey === conversationKey && listReady;
  const inputBottomPadding = insets.bottom + 10;
  const composerLift = Platform.OS === 'android' && keyboardHeight > 0
    ? Math.max(0, keyboardHeight - insets.bottom + ANDROID_KEYBOARD_COMPOSER_GAP)
    : 0;
  const setInitialPosition = useCallback((position: InitialChatPosition) => {
    setInitialPositionState({ conversationKey, position });
  }, [conversationKey]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    initialScrollDoneRef.current = false;
    lastMsgIdRef.current = null;
    isNearTailRef.current = true;
    queueMicrotask(() => setListReady(false));
    pendingScrollRetryRef.current = null;
    tailScrollTimersRef.current.forEach(clearTimeout);
    tailScrollTimersRef.current = [];
  }, [publicId]);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;

    const resolveInitialPosition = async () => {
      if (!token || !conversationId) {
        if (!cancelled) setInitialPosition({ kind: 'tail' });
        return;
      }

      if (targetMessageId) {
        const position = selectInitialChatPosition({ targetMessageId, isGroup });
        setInitialPosition(position);
        const loadedId = await loadContext(targetMessageId);
        if (!loadedId && !messagesRef.current.some(message => message.message_id === targetMessageId)) {
          if (!cancelled) {
            toast.error('پیام موردنظر پیدا نشد');
            setInitialPosition({ kind: 'tail' });
          }
        }
        return;
      }

      if (!cancelled) setInitialPosition({ kind: 'tail' });
    };

    resolveInitialPosition().catch(() => {
      if (!cancelled) setInitialPosition({ kind: 'tail' });
    });
    return () => { cancelled = true; };
  }, [loading, token, conversationId, targetMessageId, isGroup, loadContext, setInitialPosition]);

  useEffect(() => () => {
    if (initialHighlightTimerRef.current) clearTimeout(initialHighlightTimerRef.current);
    if (scrollRetryTimerRef.current) clearTimeout(scrollRetryTimerRef.current);
    tailScrollTimersRef.current.forEach(clearTimeout);
  }, []);

  const scrollToTail = useCallback((animated: boolean) => {
    listRef.current?.scrollToEnd({ animated });

    tailScrollTimersRef.current.forEach(clearTimeout);
    tailScrollTimersRef.current = [80, 180, 360].map(delay =>
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: false });
      }, delay),
    );
  }, []);

  // onContentSizeChange fires after FlatList has measured content — reliable for initial scroll
  const handleContentSizeChange = useCallback(() => {
    if (initialScrollDoneRef.current) return;
    if (initialPosition.kind === 'resolving') return;
    if (messages.length === 0) {
      // چت خالی: empty state باید دیده بشه — بدون این، لیست برای همیشه opacity:0 می‌مونه
      initialScrollDoneRef.current = true;
      setListReady(true);
      return;
    }

    requestAnimationFrame(() => {
      if (initialPosition.kind === 'message') {
        const index = messages.findIndex(message => message.message_id === initialPosition.id);
        if (index < 0) return;
        pendingScrollRetryRef.current = { index, viewPosition: initialPosition.viewPosition };
        if (scrollRetryTimerRef.current) clearTimeout(scrollRetryTimerRef.current);
        scrollRetryTimerRef.current = setTimeout(() => {
          pendingScrollRetryRef.current = null;
        }, 1000);
        listRef.current?.scrollToIndex({
          index,
          animated: false,
          viewPosition: initialPosition.viewPosition,
        });
        isNearTailRef.current = index >= messages.length - 2;
        if (initialHighlightTimerRef.current) clearTimeout(initialHighlightTimerRef.current);
        initialHighlightTimerRef.current = setTimeout(clearHighlight, 2000);
      } else {
        scrollToTail(false);
        isNearTailRef.current = true;
      }
      lastMsgIdRef.current = messages[messages.length - 1]?.message_id ?? null;
      initialScrollDoneRef.current = true;
      setListReady(true);
    });
  }, [messages, initialPosition, clearHighlight, scrollToTail]);

  // The unread lookup can finish after FlatList's first content-size event.
  // Re-attempt positioning when the resolved destination becomes available.
  useEffect(() => {
    if (loading || initialPosition.kind === 'resolving' || initialScrollDoneRef.current) return;
    const frame = requestAnimationFrame(handleContentSizeChange);
    return () => cancelAnimationFrame(frame);
  }, [loading, initialPosition, handleContentSizeChange]);

  // For subsequent new messages (after initial load)
  useEffect(() => {
    if (!initialScrollDoneRef.current) return;
    const last = messages[messages.length - 1];
    if (!last || last.message_id === lastMsgIdRef.current) return;
    lastMsgIdRef.current = last.message_id;
    if (isNearTailRef.current || last.sender_user_id === myId) {
      requestAnimationFrame(() => scrollToTail(true));
      setUnseenMessageCount(0);
    } else {
      setUnseenMessageCount(count => count + 1);
    }
  }, [messages, myId, scrollToTail]);

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

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const showSub = Keyboard.addListener('keyboardDidShow', event => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Presence: fetch on open, heartbeat every 30s
  useEffect(() => {
    if (!token || !otherId) return;
    const uid = Number(otherId);
    chatApi.getPresence(token, uid)
      .then(p => { if (p) { setIsOnline(p.is_online); setLastSeen(p.last_seen_at ?? null); } })
      .catch(() => {});
  }, [token, otherId]);

  // Search debounce
  useEffect(() => {
    if (!searchOpen) {
      queueMicrotask(() => setSearchResults([]));
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (searchQuery.trim().length < 3) {
      queueMicrotask(() => setSearchResults([]));
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await chatApi.searchMessages(token, conversationId, searchQuery.trim());
        setSearchResults([...(res.items ?? [])]);
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
    if (
      !initialScrollDoneRef.current &&
      initialPosition.kind === 'message' &&
      initialPosition.id === highlightId
    ) return;
    const idx = messages.findIndex(m => m.message_id === highlightId);
    if (idx >= 0) {
      setTimeout(() => listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 }), 200);
    }
    const t = setTimeout(clearHighlight, 2000);
    return () => clearTimeout(t);
  }, [highlightId, messages, clearHighlight, initialPosition]);

  const handleTextChange = (val: string) => {
    setText(val);
    if (val.length > 0) sendTypingSignal();
  };

  useFocusEffect(useCallback(() => {
    if (!token) return;
    profileApi.getProfile(token)
      .then(p => {
        setMyPlan(p.active_subscription?.plan?.slug ?? 'basic');
        setMySender({
          id: p.id,
          username: p.username,
          first_name: p.first_name,
          last_name: p.last_name,
          profile_photo: p.profile_photo,
        });
      })
      .catch(() => {});
  }, [token]));

  const handlePickImage = async () => {
    if (isGroup) {
      toast.error('در گفتگوی گروهی فقط متن، صدا و استیکر مجاز است');
      return;
    }
    if (myPlan !== 'gold') {
      toast.error('ارسال تصویر مخصوص اشتراک طلایی است');
      router.push('/subscription' as never);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error('دسترسی به گالری داده نشد');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize != null && asset.fileSize > 3 * 1024 * 1024) {
      toast.error('حجم تصویر باید کمتر از ۳ مگابایت باشد');
      return;
    }
    setPendingImage({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' });
  };

  const handleSendImage = async () => {
    if (!pendingImage || uploadingImage) return;
    const caption = text.trim();
    focusComposerOnWeb();
    setUploadingImage(true);
    try {
      const media = await chatApi.uploadConversationImage(
        token,
        conversationId,
        pendingImage.uri,
        pendingImage.mimeType,
        caption || undefined,
      );
      await sendTyped(
        {
          type: 'image',
          media_file_id: media.media_file_id,
          media_url: media.media_url,
          media_size: media.media_size,
          mime_type: media.mime_type,
          width: media.width,
          height: media.height,
          ...(caption ? { caption } : {}),
          reply_to_message_id: replyingTo?.message_id,
        },
        pendingImage.uri,
      );
      setPendingImage(null);
      setText('');
      setReplyingTo(null);
    } catch (err: unknown) {
      const status = err instanceof ApiError ? err.status : null;
      const msg = err instanceof Error ? err.message : '';
      if (status === 403 || msg.includes('403') || msg.includes('مجاز') || msg.toLowerCase().includes('forbidden')) {
        toast.error('ارسال تصویر مخصوص اشتراک طلایی است');
      } else if (status === 429 || msg.includes('limit exceeded') || msg.includes('Daily messages')) {
        setLimitReached(true);
      } else {
        toast.error('ارسال تصویر ناموفق بود');
      }
    } finally {
      setUploadingImage(false);
      focusComposerOnWeb();
    }
  };

  const handleMicPress = async () => {
    setAttachmentTrayOpen(false);
    setStickerPickerOpen(false);
    if (myPlan === 'basic') {
      toast.error('ارسال پیام صوتی مخصوص اشتراک نقره‌ای یا طلایی است');
      router.push('/subscription' as never);
      return;
    }
    if (voiceRecorder.isRecording) {
      await voiceRecorder.stop();
      return;
    }
    const started = await voiceRecorder.start();
    if (!started) toast.error('دسترسی به میکروفون داده نشد');
  };

  const handleCancelVoice = async () => {
    await voiceRecorder.cancel();
  };

  const handleSendVoice = async () => {
    if (!voiceRecorder.recordedUri || sendingVoice) return;
    const uri = voiceRecorder.recordedUri;
    const duration = voiceRecorder.recordedDuration;
    setSendingVoice(true);
    try {
      const media = await chatApi.uploadConversationVoice(token, conversationId, uri, duration);
      await sendTyped(
        {
          type: 'voice',
          media_file_id: media.media_file_id,
          media_url: media.media_url,
          media_size: media.media_size,
          mime_type: media.mime_type,
          duration_seconds: media.duration_seconds ?? duration,
          reply_to_message_id: replyingTo?.message_id,
        },
        uri,
      );
      voiceRecorder.reset();
      setReplyingTo(null);
    } catch (err: unknown) {
      const status = err instanceof ApiError ? err.status : null;
      const msg = err instanceof Error ? err.message : '';
      if (status === 403 || msg.includes('403') || msg.includes('مجاز') || msg.toLowerCase().includes('forbidden')) {
        toast.error('ارسال پیام صوتی مخصوص اشتراک نقره‌ای یا طلایی است');
      } else if (status === 429 || msg.includes('limit exceeded') || msg.includes('Daily messages')) {
        setLimitReached(true);
      } else {
        toast.error('ارسال پیام صوتی ناموفق بود');
      }
    } finally {
      setSendingVoice(false);
    }
  };

  const handleOpenGiftPicker = async () => {
    setGiftPickerOpen(true);
    setSelectedGift(null);
    setGiftNote('');
    if (gifts.length > 0 || giftsLoading) return;
    setGiftsLoading(true);
    try {
      setGifts(await giftsApi.list(token));
    } catch {
      toast.error('دریافت هدیه‌ها ناموفق بود');
      setGiftPickerOpen(false);
    } finally {
      setGiftsLoading(false);
    }
  };

  const closeGiftPicker = () => {
    setGiftPickerOpen(false);
    setSelectedGift(null);
    setGiftNote('');
  };

  const handleSendGift = async (gift: BackendGift, note?: string) => {
    if (sendingGiftId != null || !otherId) return;
    setSendingGiftId(gift.id);
    try {
      const res = await giftsApi.send(token, gift.id, Number(otherId), note?.trim() || undefined, true);
      closeGiftPicker();
      // پیام گیفت با message_id واقعی از پاسخ ارسال push می‌شه تا فرستنده فوراً
      // ببینه — echo بعدی Centrifugo با همین message_id توسط pushMessage dedupe می‌شه.
      const sent = res.data;
      if (sent?.message_id) {
        pushMessage({
          message_id: sent.message_id,
          client_message_id: `sent-gift-${sent.sent_gift_id}`,
          conversation_id: publicId ?? '',
          conversation_type: 'direct',
          sender_user_id: myId,
          message_type: 'gift',
          body_text: note?.trim() || gift.title,
          caption: '',
          media_url: '',
          sticker_id: '',
          gif_id: '',
          gift_id: gift.id,
          sent_gift_id: sent.sent_gift_id,
          reply_to_message_id: null,
          status: 'sent',
          is_edited: false,
          is_deleted: false,
          created_at: new Date().toISOString(),
          reactions: [],
          my_reaction: null,
        });
      }
      toast.success('هدیه ارسال شد 🎁');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(msg.includes('coin') || msg.includes('سکه') ? 'سکه کافی نداری' : 'ارسال هدیه ناموفق بود');
    } finally {
      setSendingGiftId(null);
    }
  };

  const handleScroll = useCallback(({ nativeEvent }: { nativeEvent: {
    contentOffset: { y: number };
    contentSize: { height: number };
    layoutMeasurement: { height: number };
  } }) => {
    const distanceFromTail = nativeEvent.contentSize.height
      - nativeEvent.layoutMeasurement.height
      - nativeEvent.contentOffset.y;
    const nearTail = distanceFromTail <= 96;
    isNearTailRef.current = nearTail;
    if (nearTail) {
      initialScrollDoneRef.current = true;
      setUnseenMessageCount(0);
    }
    if (hasMore && !loadingMoreRef.current && nativeEvent.contentOffset.y < 100) {
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
    if (!body) return;
    if (myId <= 0) {
      toast.error('حساب کاربری هنوز آماده نشده. چند لحظه دیگر دوباره تلاش کن.');
      return;
    }
    focusComposerOnWeb();
    setText('');
    setAttachmentTrayOpen(false);

    if (editingId) {
      setEditingId(null);
      try {
        await editMsg(editingId, body);
      } catch {
        toast.error('ویرایش پیام ناموفق بود');
      }
      focusComposerOnWeb();
      return;
    }

    try {
      if (replyingTo) {
        await sendTyped({ type: 'text', body, reply_to_message_id: replyingTo.message_id });
        setReplyingTo(null);
      } else {
        await send(body);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('limit exceeded') || msg.includes('Daily messages')) {
        setLimitReached(true);
      } else {
        toast.error('ارسال پیام ناموفق بود');
      }
    } finally {
      focusComposerOnWeb();
    }
  };

  const handleMore = () => setMenuOpen(true);

  const handleMessageLongPress = useCallback((messageId: string, senderId: number, bodyText: string, myReaction?: string | null, messageType?: string) => {
    setMsgMenu({ id: messageId, sender: senderId, body: bodyText, type: messageType, myReaction });
  }, []);

  const sendSticker = useCallback(async (sticker: string) => {
    setStickerPickerOpen(false);
    try {
      await sendTyped({
        type: 'sticker',
        sticker_id: sticker,
        reply_to_message_id: replyingTo?.message_id,
      });
      setReplyingTo(null);
    } catch {
      toast.error('ارسال استیکر ناموفق بود');
    }
  }, [replyingTo, sendTyped]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/chat' as never)}
        >
          <ArrowRight size={20} color={Colors.ink} strokeWidth={2.5} />
        </TouchableOpacity>

        <Pressable
          style={styles.headerUser}
          onPress={() => !isGroup && otherId && router.push({ pathname: '/user/[id]', params: { id: otherId } } as never)}
        >
          <View style={styles.avatarWrap}>
            {avatar && !isGroup ? (
              <Image source={{ uri: avatar }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <View style={styles.avatarFallback}>
                {isGroup
                  ? <Users size={17} color={Colors.purple} strokeWidth={1.8} />
                  : <User size={16} color={Colors.muted} strokeWidth={1.5} />}
              </View>
            )}
            {!isGroup && isOnline && <View style={styles.onlineDot} />}
          </View>
          <View>
            <Text style={styles.headerName}>{name ?? '...'}</Text>
            <Text style={styles.headerSub}>
              {isGroup ? `${groupKey === 'gold' ? 'گروه طلایی' : 'گروه نقره‌ای'} · ${toFaDigits(memberCount ?? '0')} عضو` :
               isPending ? 'در انتظار تأیید' :
               otherTyping ? 'در حال تایپ...' :
               isOnline ? 'آنلاین' :
               lastSeen ? `آخرین بازدید: ${formatLastSeen(lastSeen)}` : ''}
            </Text>
          </View>
        </Pressable>

        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setSearchOpen(s => !s)}>
            <Search size={18} color={searchOpen ? Colors.accent : Colors.ink} strokeWidth={2} />
          </TouchableOpacity>
          {!isGroup && (
            <TouchableOpacity style={styles.iconBtn} onPress={handleMore}>
              <MoreVertical size={20} color={Colors.ink} strokeWidth={2} />
            </TouchableOpacity>
          )}
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.accent} />
          </View>
        ) : searchOpen && searchQuery.trim().length >= 3 ? (
          /* Search results */
          searchLoading ? (
            <View style={styles.center}><ActivityIndicator color={Colors.accent} /></View>
          ) : searchResults.length === 0 ? (
            <View style={styles.searchEmpty}>
              <Text style={styles.searchEmptyTxt}>نتیجه‌ای پیدا نشد</Text>
            </View>
          ) : (
            <ScrollView style={styles.searchResults} keyboardShouldPersistTaps="handled">
              {searchResults.map(item => {
                const isMine = item.sender_user_id === myId;
                return (
                  <TouchableOpacity
                    key={item.message_id}
                    style={styles.searchResultItem}
                    onPress={async () => {
                      setSearchOpen(false);
                      setSearchQuery('');
                      await loadContext(item.message_id);
                    }}
                  >
                    <View style={styles.searchResultRow}>
                      <Text style={styles.searchResultSender}>{isMine ? 'شما' : (name ?? '')}</Text>
                      <Text style={styles.searchResultTime}>{formatTime(item.created_at)}</Text>
                    </View>
                    <Text style={styles.searchResultBody} numberOfLines={2}>{item.text_snippet}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )
        ) : (
          <>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={m => m.message_id}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            onContentSizeChange={handleContentSizeChange}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={CHAT_VIEWABILITY_CONFIG}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            style={!listIsReady && { opacity: 0 }}
            renderItem={({ item, index }) => {
              if (item.is_deleted) return null;
              const showDaySep = index === 0 || !isSameDay(item.created_at, messages[index - 1].created_at);
              const isMine = item.sender_user_id === myId;
              const isSending = item.status === 'sending';
              const isFailed = item.status === 'failed';
              const isHighlighted = item.message_id === highlightId;
              const previousMessage = messages[index - 1];
              const nextMessage = messages[index + 1];
              const showGroupSender = isGroup && !isMine && previousMessage?.sender_user_id !== item.sender_user_id;
              const showGroupAvatar = isGroup && nextMessage?.sender_user_id !== item.sender_user_id;
              const groupAvatarUri = showGroupAvatar ? senderAvatarUrl(item, messages, mySender) : null;

              // Tick icon: clock=sending, single check=sent, double grey=delivered, double accent=read
              const TickIcon = isFailed ? X : isSending ? Clock : item.read_at ? CheckCheck : item.delivered_at ? CheckCheck : item.status === 'sent' ? Check : CheckCheck;
              const tickColor = isFailed ? Colors.danger : isSending ? 'rgba(255,255,255,0.4)'
                : item.read_at ? '#fff'
                : item.delivered_at ? 'rgba(255,255,255,0.55)'
                : 'rgba(255,255,255,0.55)';

              // Reaction summary: group by emoji
              const reactionGroups: Record<string, { count: number; userIds: number[] }> = {};
              for (const r of item.reactions ?? []) {
                const group = reactionGroups[r.reaction] ?? { count: 0, userIds: [] };
                group.count += 1;
                group.userIds.push(r.user_id);
                reactionGroups[r.reaction] = group;
              }
              const reactionEntries = Object.entries(reactionGroups);

              const isGift = item.message_type === 'gift';
              const BubbleContainer = isGift || !isMine ? LinearGradient : View;
              const gradProps = isGift ? {
                colors: ['#FEF3DD', '#FCE8ED'] as [string, string],
                start: { x: 0, y: 0 },
                end: { x: 1, y: 1 },
              } : isMine ? {} : {
                colors: Colors.gradSoftColors,
                start: { x: 0, y: 0 },
                end: { x: 1, y: 1 },
              };
              const resolveMediaUrl = (url: string) =>
                url.startsWith('http') || url.startsWith('file:')
                  ? url
                  : `${process.env.EXPO_PUBLIC_API_URL}/${url.replace(/^\//, '')}`;

              const imageUri = item.message_type === 'image' && item.media_url
                ? resolveMediaUrl(item.media_url)
                : null;
              const voiceUri = item.message_type === 'voice' && item.media_url
                ? resolveMediaUrl(item.media_url)
                : null;

              const imageFailed = imageUri != null && failedImageUris.has(imageUri);
              const repliedMessage = item.reply_to_message_id
                ? messages.find(message => message.message_id === item.reply_to_message_id)
                : null;
              const replyTarget = repliedMessage ?? null;
              const messageText = imageUri ? item.caption : (item.body_text || item.caption);
              const hasVisibleContent =
                !!messageText ||
                !!imageUri ||
                !!voiceUri ||
                !!item.reply_to_message_id ||
                isGift ||
                isFailed ||
                reactionEntries.length > 0 ||
                (item.message_type !== 'text' && item.message_type !== 'template_first_message');

              if (!hasVisibleContent) return null;

              const bubbleContent = (
                <>
                  {showGroupSender ? (
                    <Text style={[styles.groupSender, { color: isMine ? '#fff' : Colors.purple }]}>{senderDisplayName(item, messages, mySender)}</Text>
                  ) : null}
                  {item.reply_to_message_id && (
                    <TouchableOpacity
                      style={[styles.replyQuote, isMine && styles.replyQuoteMine]}
                      onPress={() => loadContext(item.reply_to_message_id!).catch(() => {})}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.replyQuoteAccent, isMine && styles.replyQuoteAccentMine]} />
                      <View style={styles.replyQuoteContent}>
                        <Text style={[styles.replyQuoteTitle, isMine && styles.replyQuoteTitleMine]} numberOfLines={1}>
                          {replyTarget
                            ? (replyTarget.sender_user_id === myId ? 'شما' : senderDisplayName(replyTarget, messages, mySender))
                            : 'پیام پاسخ‌داده‌شده'}
                        </Text>
                        <Text style={[styles.replyQuoteBody, isMine && styles.replyQuoteBodyMine]} numberOfLines={2}>
                          {replyPreviewText(replyTarget)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  {imageUri && imageFailed ? (
                    <Pressable
                      style={styles.msgImageError}
                      onPress={() => setFailedImageUris(prev => {
                        const next = new Set(prev);
                        next.delete(imageUri);
                        return next;
                      })}
                    >
                      <ImageOff size={22} color={Colors.muted} strokeWidth={1.8} />
                      <View style={styles.msgImageRetryRow}>
                        <RefreshCw size={12} color={Colors.muted} strokeWidth={2} />
                        <Text style={styles.msgImageErrorTxt}>تصویر بارگذاری نشد — تلاش دوباره</Text>
                      </View>
                    </Pressable>
                  ) : imageUri ? (
                    <Pressable onPress={() => setViewerUri(imageUri)}>
                      <Image
                        source={{ uri: imageUri }}
                        style={styles.msgImage}
                        contentFit="cover"
                        transition={150}
                        onError={() => setFailedImageUris(prev => new Set(prev).add(imageUri))}
                      />
                    </Pressable>
                  ) : voiceUri ? (
                    <VoiceBubblePlayer
                      uri={voiceUri}
                      durationSeconds={item.duration_seconds || 1}
                      isMine={isMine}
                      tint={isMine ? '#fff' : Colors.purple}
                    />
                  ) : item.message_type === 'gift' ? (() => {
                    const giftMeta = gifts.find(g => g.id === item.gift_id);
                    const giftTitle = giftMeta?.title ?? 'هدیه';
                    const noteText = item.body_text || item.caption;
                    const hasCustomNote = !!noteText && noteText !== giftTitle;
                    // انیمیشن ورود فقط برای گیفت تازه‌رسیده — نه موقع اسکرول تاریخچه
                    const isFresh = Date.now() - new Date(item.created_at).getTime() < 8000;
                    return (
                      <Animated.View
                        entering={isFresh ? ZoomIn.springify().damping(14) : undefined}
                        style={styles.giftMsgCard}
                      >
                        <View style={styles.giftMsgRibbon}>
                          <GiftIcon size={12} color={Colors.goldDeep} strokeWidth={2.2} />
                          <Text style={styles.giftMsgRibbonTxt}>
                            {isMine ? 'هدیه فرستادی' : 'برات هدیه اومده'}
                          </Text>
                        </View>
                        <View style={styles.giftMsgAssetWrap}>
                          {giftMeta?.asset_url ? (
                            <Image source={{ uri: giftMeta.asset_url }} style={styles.giftMsgImage} contentFit="contain" />
                          ) : (
                            <Text style={styles.giftMsgEmoji}>{GIFT_SLUG_EMOJI[giftMeta?.slug ?? ''] ?? '🎁'}</Text>
                          )}
                        </View>
                        <Text style={styles.giftMsgTitle}>{giftTitle}</Text>
                        {hasCustomNote && (
                          <View style={styles.giftMsgNotePill}>
                            <Text style={styles.giftMsgNote}>«{noteText}»</Text>
                          </View>
                        )}
                      </Animated.View>
                    );
                  })() : item.message_type !== 'text' && item.message_type !== 'template_first_message' ? (
                    <Text style={[styles.msgTypeBadge, isMine && { color: 'rgba(255,255,255,0.7)' }]}>
                      {item.message_type === 'sticker' ? (item.sticker_id || '😊') :
                       item.message_type === 'gif' ? '🎞' : '🖼'}
                    </Text>
                  ) : null}
                  {(item.message_type !== 'gift') && !!messageText && (
                    <Text style={[styles.bubbleTxt, isMine ? styles.bubbleTxtMine : styles.bubbleTxtTheirs, imageUri != null && { marginTop: 6 }]}>
                      {messageText}
                    </Text>
                  )}
                  {isFailed && (
                    <TouchableOpacity
                      style={styles.retryMessage}
                      onPress={() => retryMessage(item.client_message_id).catch(() => {
                        toast.error('ارسال مجدد پیام ناموفق بود');
                      })}
                    >
                      <RefreshCw size={12} color={Colors.danger} strokeWidth={2} />
                      <Text style={styles.retryMessageText}>ارسال دوباره</Text>
                    </TouchableOpacity>
                  )}
                  {reactionEntries.length > 0 && (
                    <View style={styles.reactionsRow}>
                      {reactionEntries.map(([emoji, group]) => {
                        const visibleUserIds = group.userIds.slice(0, 3);
                        const extraCount = Math.max(0, group.count - visibleUserIds.length);

                        return (
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
                            <View style={styles.reactionAvatars}>
                              {visibleUserIds.map((userId, avatarIndex) => {
                                const avatarUri = reactionAvatarUrl(userId, messages, mySender);

                                return (
                                  <View
                                    key={`${userId}-${avatarIndex}`}
                                    style={[
                                      styles.reactionAvatar,
                                      avatarIndex > 0 && styles.reactionAvatarOverlap,
                                      isMine && styles.reactionAvatarMine,
                                    ]}
                                  >
                                    {avatarUri ? (
                                      <Image source={{ uri: avatarUri }} style={styles.reactionAvatarImage} contentFit="cover" />
                                    ) : (
                                      <User size={9} color={isMine ? '#fff' : Colors.purple} strokeWidth={2} />
                                    )}
                                  </View>
                                );
                              })}
                            </View>
                            {extraCount > 0 && (
                              <Text style={[styles.reactionCount, isMine && styles.reactionCountMine]}>
                                +{toFaDigits(extraCount)}
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                  <View style={styles.bubbleMeta}>
                    <Text style={[styles.bubbleTime, isMine ? styles.bubbleTimeMine : styles.bubbleTimeTheirs, isGift && styles.bubbleTimeGift]}>
                      {formatTime(item.created_at)}
                    </Text>
                    {isMine && (
                      <TickIcon
                        size={10}
                        color={isGift ? (item.read_at ? Colors.goldDeep : 'rgba(217,152,46,0.55)') : tickColor}
                        strokeWidth={2.5}
                      />
                    )}
                  </View>
                </>
              );

              return (
                <View style={[styles.msgWrap, isHighlighted && styles.msgHighlight]}>
                  {showDaySep && (
                    <View style={styles.daySepWrap}>
                      <View style={styles.daySepPill}>
                        <Text style={styles.daySepTxt}>{formatDayLabel(item.created_at)}</Text>
                      </View>
                    </View>
                  )}
                  {isGroup ? (
                    <View style={[styles.groupMessageRow, isMine && styles.groupMessageRowMine]}>
                      <Pressable
                        style={styles.groupBubblePress}
                        onLongPress={() => handleMessageLongPress(item.message_id, item.sender_user_id, item.body_text || item.caption, item.my_reaction, item.message_type)}
                        delayLongPress={400}
                      >
                        <BubbleContainer
                          {...(gradProps as any)}
                          style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs, isGift && styles.bubbleGift]}
                        >
                          {bubbleContent}
                        </BubbleContainer>
                      </Pressable>
                      <View style={styles.groupAvatarSlot}>
                        {showGroupAvatar ? (
                          groupAvatarUri ? (
                            <Image source={{ uri: groupAvatarUri }} style={styles.groupAvatarImage} contentFit="cover" />
                          ) : (
                            <View style={styles.groupAvatarFallback}>
                              <User size={14} color={Colors.purple} strokeWidth={1.8} />
                            </View>
                          )
                        ) : null}
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      style={isMine ? styles.bubblePressMine : styles.bubblePressTheirs}
                      onLongPress={() => handleMessageLongPress(item.message_id, item.sender_user_id, item.body_text || item.caption, item.my_reaction, item.message_type)}
                      delayLongPress={400}
                    >
                      <BubbleContainer
                        {...(gradProps as any)}
                        style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs, isGift && styles.bubbleGift]}
                      >
                        {bubbleContent}
                      </BubbleContainer>
                    </Pressable>
                  )}
                </View>
              );
            }}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onScrollToIndexFailed={({ index, averageItemLength }) => {
              const retry = pendingScrollRetryRef.current;
              const retryIndex = retry?.index ?? index;
              const viewPosition = retry?.viewPosition ?? 0.5;
              listRef.current?.scrollToOffset({ offset: Math.max(0, averageItemLength * retryIndex), animated: false });
              setTimeout(() => {
                listRef.current?.scrollToIndex({ index: retryIndex, animated: false, viewPosition });
                pendingScrollRetryRef.current = null;
                if (scrollRetryTimerRef.current) {
                  clearTimeout(scrollRetryTimerRef.current);
                  scrollRetryTimerRef.current = null;
                }
              }, 100);
            }}
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
          {unseenMessageCount > 0 && (
            <TouchableOpacity
              style={styles.newMessagesChip}
              onPress={() => {
                scrollToTail(true);
                setUnseenMessageCount(0);
              }}
            >
              <Text style={styles.newMessagesChipText}>{toFaDigits(unseenMessageCount)} پیام جدید</Text>
            </TouchableOpacity>
          )}
          </>
        )}

        {connectionState !== 'connected' && connectionState !== 'disabled' && (
          <View style={styles.connectionBanner}>
            <Text style={styles.connectionBannerText}>
              {connectionState === 'recovering' || connectionState === 'connecting'
                ? 'در حال اتصال و بازیابی پیام‌ها...'
                : 'اتصال زنده قطع است؛ پیام‌ها پس از اتصال ارسال می‌شوند.'}
            </Text>
          </View>
        )}

        {loadError && (
          <TouchableOpacity style={styles.loadErrorBanner} onPress={refresh} activeOpacity={0.8}>
            <RefreshCw size={13} color={Colors.danger} strokeWidth={2} />
            <Text style={styles.loadErrorBannerText}>دریافت پیام‌ها کامل نشد؛ برای تلاش دوباره بزنید.</Text>
          </TouchableOpacity>
        )}

        {isPending && (
          <View style={styles.pendingBanner}>
            <Clock size={14} color={Colors.trust} strokeWidth={2} />
            <Text style={styles.pendingTxt}>
              {canRespond
                ? `${name} می‌خواد باهات چت کنه`
                : `در انتظار تأیید ${name} — تا تأیید نشه چت باز نمیشه`}
            </Text>
          </View>
        )}

        {canRespond && (
          <View style={styles.reqActions}>
            <TouchableOpacity
              style={styles.reqRejectBtn}
              onPress={() => handleRespond('rejected')}
              disabled={responding}
              activeOpacity={0.8}
            >
              {responding ? (
                <ActivityIndicator size="small" color={Colors.danger} />
              ) : (
                <X size={16} color={Colors.danger} strokeWidth={2.5} />
              )}
              <Text style={styles.reqRejectTxt}>رد</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.reqAcceptBtn}
              onPress={() => handleRespond('accepted')}
              disabled={responding}
              activeOpacity={0.85}
            >
              {responding ? (
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
                  <Text style={styles.reqAcceptTxt}>تأیید</Text>
                </>
              )}
            </TouchableOpacity>
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

        {replyingTo && !editingId && (
          <View style={styles.editBar}>
            <Text style={styles.replyBarIcon}>↩</Text>
            <View style={styles.replyBarContent}>
              <Text style={styles.editBarTxt}>پاسخ به پیام</Text>
              <Text style={styles.replyBarPreview} numberOfLines={1}>
                {replyingTo.body_text || replyingTo.caption || 'رسانه'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={8}>
              <X size={15} color={Colors.muted} strokeWidth={2} />
            </TouchableOpacity>
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

        {pendingImage && (
          <View style={styles.pendingImageBar}>
            <Image source={{ uri: pendingImage.uri }} style={styles.pendingImageThumb} contentFit="cover" />
            <Text style={styles.pendingImageTxt} numberOfLines={1}>
              {uploadingImage ? 'در حال ارسال تصویر…' : 'تصویر آماده ارسال — می‌تونی زیرنویس بنویسی'}
            </Text>
            {!uploadingImage && (
              <TouchableOpacity onPress={() => setPendingImage(null)} hitSlop={8}>
                <X size={15} color={Colors.muted} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {voiceRecorder.isRecording && (
          <View style={styles.voiceRecordingBar}>
            <View style={styles.voiceRecDot} />
            <Text style={styles.voiceRecordingTxt}>
              در حال ضبط… {formatDuration(Math.floor(voiceRecorder.durationMillis / 1000))}
            </Text>
            <TouchableOpacity onPress={handleCancelVoice} hitSlop={8}>
              <X size={16} color={Colors.muted} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}

        {!voiceRecorder.isRecording && voiceRecorder.recordedUri && (
          <View style={styles.voicePreviewBar}>
            <VoiceBubblePlayer uri={voiceRecorder.recordedUri} durationSeconds={voiceRecorder.recordedDuration} isMine tint={Colors.ink} />
            {!sendingVoice && (
              <TouchableOpacity onPress={voiceRecorder.reset} hitSlop={8}>
                <Trash2 size={16} color={Colors.danger} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {attachmentTrayOpen && !editingId && !pendingImage && !voiceRecorder.recordedUri && (
          <View style={styles.attachmentTray}>
            {!isGroup && (
              <TouchableOpacity
                style={styles.attachmentOption}
                onPress={() => { setAttachmentTrayOpen(false); handlePickImage(); }}
                activeOpacity={0.75}
              >
                <View style={[styles.attachmentOptionIcon, { backgroundColor: Colors.trustSoft }]}>
                  <ImagePlus size={20} color={Colors.trust} strokeWidth={1.9} />
                </View>
                <Text style={styles.attachmentOptionText}>تصویر</Text>
              </TouchableOpacity>
            )}
            {!isGroup && (
              <TouchableOpacity
                style={styles.attachmentOption}
                onPress={() => { setAttachmentTrayOpen(false); handleOpenGiftPicker(); }}
                activeOpacity={0.75}
              >
                <View style={[styles.attachmentOptionIcon, { backgroundColor: Colors.goldSoft }]}>
                  <GiftIcon size={20} color={Colors.goldDeep} strokeWidth={1.9} />
                </View>
                <Text style={styles.attachmentOptionText}>هدیه</Text>
              </TouchableOpacity>
            )}
            {!isGroup && (
              <TouchableOpacity
                style={styles.attachmentOption}
                onPress={() => { setAttachmentTrayOpen(false); setStickerPickerOpen(open => !open); }}
                activeOpacity={0.75}
              >
                <View style={[styles.attachmentOptionIcon, { backgroundColor: Colors.accentSoft }]}>
                  <Text style={styles.attachmentOptionEmoji}>😊</Text>
                </View>
                <Text style={styles.attachmentOptionText}>استیکر</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {stickerPickerOpen && !isGroup && (
          <View style={styles.stickerPicker}>
            {['😊', '😍', '🥰', '😂', '🤗', '😘', '😎', '💖'].map(sticker => (
              <TouchableOpacity key={sticker} style={styles.stickerPickerItem} onPress={() => sendSticker(sticker)}>
                <Text style={styles.stickerPickerEmoji}>{sticker}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={[styles.inputBar, { paddingBottom: inputBottomPadding, marginBottom: composerLift }, (!canChat || limitReached) && styles.inputBarDisabled]}>
          {!canChat || limitReached ? (
            <View style={styles.inputLocked}>
              <Lock size={14} color={Colors.muted} strokeWidth={1.8} />
              <Text style={styles.inputLockedTxt}>
                {limitReached ? 'سقف پیام روزانه' : isPending ? 'در انتظار تأیید…' : isExpired ? 'درخواست منقضی شده' : isRejected ? 'درخواست رد شده' : 'چت قفل است'}
              </Text>
            </View>
          ) : voiceRecorder.isRecording ? (
            <TouchableOpacity style={[styles.sendBtn, styles.sendBtnActive]} onPress={handleMicPress} activeOpacity={0.8}>
              <LinearGradient colors={Colors.gradColors as [string, string]} style={StyleSheet.absoluteFill} />
              <Check size={18} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          ) : voiceRecorder.recordedUri ? (
            <TouchableOpacity
              style={[styles.sendBtn, styles.sendBtnActive]}
              onPress={handleSendVoice}
              disabled={sendingVoice}
              activeOpacity={0.8}
            >
              <LinearGradient colors={Colors.gradColors as [string, string]} style={StyleSheet.absoluteFill} />
              {sendingVoice ? <ActivityIndicator size="small" color="#fff" /> : <Send size={18} color="#fff" strokeWidth={2} />}
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.sendBtn, (!!text.trim() || !!pendingImage) && myId > 0 && styles.sendBtnActive]}
                onPressIn={event => {
                  if (text.trim() || pendingImage || editingId) preventComposerBlurOnWeb(event);
                }}
                onPress={pendingImage ? handleSendImage : text.trim() ? handleSend : handleMicPress}
                disabled={uploadingImage || myId <= 0}
                activeOpacity={0.8}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    {(!!text.trim() || !!pendingImage) && myId > 0 && (
                      <LinearGradient colors={Colors.gradColors as [string, string]} style={StyleSheet.absoluteFill} />
                    )}
                    {editingId
                      ? <Pencil size={17} color={text.trim() ? '#fff' : Colors.muted} strokeWidth={2} />
                      : (text.trim() || pendingImage) && myId > 0
                        ? <Send style={[styles.sendBtnIcon]} size={18} color="#fff" strokeWidth={2} />
                        : <Mic size={19} color={Colors.accent} strokeWidth={2} />
                    }
                  </>
                )}
              </TouchableOpacity>
              <View style={styles.composerShell}>
                <TextInput
                  ref={composerRef}
                  style={[
                    styles.input,
                    Platform.OS === 'web' && ({
                      fontSize: 16,
                      outlineColor: 'transparent',
                      outlineStyle: 'none',
                      outlineWidth: 0,
                      boxShadow: 'none',
                      WebkitAppearance: 'none',
                    } as any),
                  ]}
                  value={text}
                  onChangeText={handleTextChange}
                  onFocus={() => { setAttachmentTrayOpen(false); setStickerPickerOpen(false); }}
                  placeholder={editingId ? 'ویرایش پیام' : pendingImage ? 'افزودن توضیح…' : 'پیام بنویسید…'}
                  placeholderTextColor={Colors.muted}
                  multiline
                  maxLength={pendingImage ? 500 : isGroup ? 1000 : 2000}
                  textAlign="right"
                  textAlignVertical="center"
                  returnKeyType="default"
                  blurOnSubmit={false}
                  underlineColorAndroid="transparent"
                  selectionColor={Colors.accent}
                />
                {!editingId && !pendingImage && !isGroup && (
                  <TouchableOpacity
                    style={[styles.composerAttachBtn, attachmentTrayOpen && styles.composerAttachBtnActive]}
                    onPress={() => {
                      setStickerPickerOpen(false);
                      setAttachmentTrayOpen(open => !open);
                    }}
                    hitSlop={6}
                    activeOpacity={0.7}
                    accessibilityLabel="افزودن پیوست"
                  >
                    <Paperclip size={20} color={attachmentTrayOpen ? Colors.accent : Colors.muted} strokeWidth={1.9} />
                  </TouchableOpacity>
                )}
              </View>
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

                <TouchableOpacity style={styles.menuRow} activeOpacity={0.7}
                  onPress={() => {
                    const target = messages.find(message => message.message_id === msgMenu?.id);
                    if (target) setReplyingTo(target);
                    setMsgMenu(null);
                  }}>
                  <Text style={styles.menuRowTxt}>پاسخ</Text>
                </TouchableOpacity>

                {msgMenu?.sender === myId ? (
                  <>
                    {msgMenu?.type === 'text' && (
                      <TouchableOpacity style={styles.menuRow} activeOpacity={0.7}
                        onPress={() => { setEditingId(msgMenu!.id); setText(msgMenu!.body); setMsgMenu(null); }}>
                        <Text style={styles.menuRowTxt}>ویرایش پیام</Text>
                      </TouchableOpacity>
                    )}
                    {!!msgMenu?.body && (
                      <TouchableOpacity style={styles.menuRow} activeOpacity={0.7}
                        onPress={() => { Share.share({ message: msgMenu!.body }).catch(() => {}); setMsgMenu(null); }}>
                        <Text style={styles.menuRowTxt}>اشتراک‌گذاری</Text>
                      </TouchableOpacity>
                    )}
                    {msgMenu?.type === 'text' && (
                      <TouchableOpacity style={[styles.menuRow, styles.menuRowDanger]} activeOpacity={0.7}
                        onPress={() => setConfirmDeleteId(msgMenu!.id)}>
                        <Text style={[styles.menuRowTxt, styles.menuRowTxtDanger]}>حذف پیام</Text>
                      </TouchableOpacity>
                    )}
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
                      onPress={() => { setMsgMenu(null); setTimeout(() => router.push({ pathname: '/report-user', params: { userId: isGroup ? String(msgMenu?.sender) : (otherId ?? String(msgMenu?.sender)), userName: isGroup ? `کاربر ${toFaDigits(msgMenu?.sender ?? '')}` : (name ?? ''), conversationPublicId: publicId ?? '', messageId: msgMenu?.id, context: 'message' } } as never), 100); }}>
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
            {!isGroup && <TouchableOpacity
              style={[styles.menuRow, styles.menuRowDanger]}
              activeOpacity={0.7}
              onPress={() => { setMenuOpen(false); setTimeout(() => router.push({ pathname: '/report-user', params: { userId: otherId ?? '', userName: name ?? '' } } as never), 100); }}
            >
              <Text style={[styles.menuRowTxt, styles.menuRowTxtDanger]}>گزارش تخلف</Text>
            </TouchableOpacity>}
            <TouchableOpacity style={[styles.menuRow, styles.menuCancel]} activeOpacity={0.7} onPress={() => setMenuOpen(false)}>
              <Text style={styles.menuCancelTxt}>انصراف</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Full-screen image viewer */}
      <Modal visible={!!viewerUri} transparent animationType="fade" onRequestClose={() => setViewerUri(null)}>
        <Pressable style={styles.viewerOverlay} onPress={() => setViewerUri(null)}>
          {viewerUri && (
            <Image source={{ uri: viewerUri }} style={styles.viewerImage} contentFit="contain" />
          )}
          <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerUri(null)} hitSlop={10}>
            <X size={22} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        </Pressable>
      </Modal>

      {/* Gift picker */}
      <Modal visible={giftPickerOpen} transparent animationType="slide" onRequestClose={closeGiftPicker}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.menuOverlay} onPress={closeGiftPicker}>
            <View style={styles.giftSheet}>
            <View style={styles.menuHandle} />
            {selectedGift ? (
              <>
                <Text style={styles.giftSheetTitle}>ارسال {selectedGift.title}</Text>
                <View style={styles.giftPreviewCard}>
                  <LinearGradient
                    colors={['#FEF3DD', '#FCE8ED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  {selectedGift.asset_url ? (
                    <Image source={{ uri: selectedGift.asset_url }} style={styles.giftPreviewImage} contentFit="contain" />
                  ) : (
                    <Text style={styles.giftPreviewEmoji}>{GIFT_SLUG_EMOJI[selectedGift.slug] ?? '🎁'}</Text>
                  )}
                  <Text style={styles.giftPreviewTitle}>{selectedGift.title}</Text>
                  <View style={styles.giftRowPricePill}>
                    <Text style={styles.giftRowPriceTxt}>{toPersianNum(selectedGift.coin_price)} سکه</Text>
                  </View>
                </View>
                <Text style={styles.giftNoteQuestion}>می‌خوای یه پیام همراهش بفرستی؟</Text>
                <TextInput
                  style={styles.giftNoteInput}
                  placeholder="یه پیام کوتاه بنویس… (اختیاری)"
                  placeholderTextColor={Colors.muted}
                  value={giftNote}
                  onChangeText={setGiftNote}
                  multiline
                  maxLength={200}
                  textAlign="right"
                />
                <View style={styles.giftComposeActions}>
                  <TouchableOpacity
                    style={styles.giftCancelBtn}
                    onPress={() => setSelectedGift(null)}
                    disabled={sendingGiftId != null}
                  >
                    <Text style={styles.giftCancelTxt}>بازگشت</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.giftConfirmBtn, sendingGiftId != null && { opacity: 0.6 }]}
                    onPress={() => handleSendGift(selectedGift, giftNote)}
                    disabled={sendingGiftId != null}
                  >
                    <LinearGradient colors={Colors.gradColors as [string, string]} style={StyleSheet.absoluteFill} />
                    {sendingGiftId === selectedGift.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.giftConfirmTxt}>ارسال هدیه</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.giftSheetTitle}>ارسال هدیه در چت</Text>
                {giftsLoading ? (
                  <ActivityIndicator color={Colors.goldDeep} style={{ paddingVertical: 32 }} />
                ) : (
                  <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                    {gifts.map(g => (
                      <TouchableOpacity
                        key={g.id}
                        style={styles.giftRow}
                        activeOpacity={0.75}
                        disabled={sendingGiftId != null}
                        onPress={() => setSelectedGift(g)}
                      >
                        <Text style={styles.giftRowEmoji}>{GIFT_SLUG_EMOJI[g.slug] ?? '🎁'}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.giftRowTitle}>{g.title}</Text>
                          {g.is_limited && <Text style={styles.giftRowLimited}>نسخه محدود</Text>}
                        </View>
                        <View style={styles.giftRowPricePill}>
                          <Text style={styles.giftRowPriceTxt}>{toPersianNum(g.coin_price)} سکه</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                    {gifts.length === 0 && (
                      <Text style={styles.giftEmptyTxt}>هدیه‌ای موجود نیست</Text>
                    )}
                  </ScrollView>
                )}
              </>
            )}
            </View>
          </Pressable>
        </KeyboardAvoidingView>
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
    paddingBottom: Spacing.lg,
    flexGrow: 1,
  },
  newMessagesChip: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    backgroundColor: Colors.purple,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    elevation: 4,
  },
  newMessagesChipText: { color: '#fff', fontFamily: Fonts.bold, fontSize: 12 },
  connectionBanner: {
    backgroundColor: Colors.goldSoft,
    borderTopWidth: 1,
    borderTopColor: Colors.gold,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  connectionBannerText: {
    color: Colors.inkSoft,
    fontFamily: Fonts.regular,
    fontSize: 11,
    textAlign: 'center',
  },
  loadErrorBanner: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.dangerSoft,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.danger,
  },
  loadErrorBannerText: {
    color: Colors.danger,
    fontFamily: Fonts.semiBold,
    fontSize: 11.5,
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
  groupSender: { fontSize: 11, fontFamily: Fonts.extraBold, marginBottom: 3 },
  msgImage: {
    width: 220,
    height: 220,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  msgImageError: {
    width: 220,
    height: 120,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  msgImageRetryRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  msgImageErrorTxt: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.muted },
  retryMessage: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  retryMessageText: { color: Colors.danger, fontFamily: Fonts.bold, fontSize: 10.5 },
  bubbleGift: {
    borderWidth: 1,
    borderColor: '#F3DFB9',
    maxWidth: '78%',
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  giftMsgRibbon: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(217,152,46,0.12)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  giftMsgRibbonTxt: { fontFamily: Fonts.bold, fontSize: 10.5, color: Colors.goldDeep },
  giftMsgAssetWrap: {
    width: 92, height: 92, borderRadius: 46, marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.goldDeep, shadowOpacity: 0.25, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  giftMsgNotePill: {
    backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 7, marginTop: 2, maxWidth: 220,
  },
  bubbleTimeGift: { color: Colors.goldDeep, opacity: 0.75 },
  giftMsgCard: { alignItems: 'center', gap: 6, paddingHorizontal: 6, minWidth: 150 },
  giftMsgImage: { width: 68, height: 68 },
  giftMsgEmoji: { fontSize: 48 },
  giftMsgTitle: { fontFamily: Fonts.extraBold, fontSize: 15, color: Colors.ink, marginTop: 2 },
  giftMsgNote: {
    fontFamily: Fonts.regular, fontSize: 12.5, color: Colors.inkSoft,
    textAlign: 'center', lineHeight: 19,
  },
  attachBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  giftAttachBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.goldSoft,
  },
  stickerAttachBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.accentSoft,
  },
  stickerAttachEmoji: { fontSize: 17 },
  micAttachBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.trustSoft,
  },
  pendingImageBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: Spacing.lg, paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.hair,
  },
  pendingImageThumb: { width: 42, height: 42, borderRadius: 8 },
  pendingImageTxt: { flex: 1, fontFamily: Fonts.regular, fontSize: 12, color: Colors.inkSoft },
  voiceRecordingBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: Spacing.lg, paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.hair,
  },
  voiceRecDot: {
    width: 9, height: 9, borderRadius: 5, backgroundColor: Colors.danger,
  },
  voiceRecordingTxt: { flex: 1, fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.ink },
  voicePreviewBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.lg, paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.hair,
  },
  voicePlayerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    minWidth: 190,
    paddingVertical: 1,
  },
  voicePlayBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  voiceContent: { flex: 1, minWidth: 0 },
  voiceWave: {
    height: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    overflow: 'hidden',
  },
  voiceWaveBar: {
    width: 2,
    borderRadius: 2,
  },
  voiceDurationTxt: { fontFamily: Fonts.regular, fontSize: 13, marginTop: 1 },
  viewerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  viewerImage: { width: '100%', height: '80%' },
  viewerClose: {
    position: 'absolute', top: 56, left: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  giftSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg, paddingBottom: 28, paddingTop: 8,
  },
  giftSheetTitle: {
    fontFamily: Fonts.bold, fontSize: 15, color: Colors.ink,
    textAlign: 'center', marginVertical: 10,
  },
  giftRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.hair,
  },
  giftRowEmoji: { fontSize: 26 },
  giftRowTitle: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.ink },
  giftRowLimited: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.accent, marginTop: 2 },
  giftRowPricePill: {
    backgroundColor: Colors.goldSoft, borderRadius: Radius.pill,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  giftRowPriceTxt: { fontFamily: Fonts.bold, fontSize: 12, color: Colors.goldDeep },
  giftEmptyTxt: {
    fontFamily: Fonts.regular, fontSize: 13, color: Colors.muted,
    textAlign: 'center', paddingVertical: 24,
  },
  giftPreviewCard: {
    alignItems: 'center', gap: 8,
    borderRadius: Radius.xl, overflow: 'hidden',
    paddingVertical: 24, paddingHorizontal: 16,
    marginTop: 4,
  },
  giftPreviewImage: { width: 72, height: 72 },
  giftPreviewEmoji: { fontSize: 56 },
  giftPreviewTitle: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.ink, marginTop: 4 },
  giftNoteQuestion: {
    fontFamily: Fonts.semiBold, fontSize: 12.5, color: Colors.inkSoft,
    marginTop: 14, marginBottom: 6, textAlign: 'right',
  },
  giftNoteInput: {
    marginTop: 16, minHeight: 60, maxHeight: 100,
    borderWidth: 1.5, borderColor: Colors.hair, borderRadius: Radius.lg,
    paddingHorizontal: 14, paddingVertical: 10,
    fontFamily: Fonts.regular, fontSize: 13.5, color: Colors.ink,
    textAlignVertical: 'top',
  },
  giftComposeActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  giftCancelBtn: {
    flex: 1, height: 48, borderRadius: Radius.pill,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.ph2,
  },
  giftCancelTxt: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.inkSoft },
  giftConfirmBtn: {
    flex: 2, height: 48, borderRadius: Radius.pill, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  giftConfirmTxt: { fontFamily: Fonts.bold, fontSize: 14, color: '#fff' },
  daySepWrap: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  daySepPill: {
    backgroundColor: Colors.hair,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  daySepTxt: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: Colors.inkSoft,
  },
  bubblePressMine: Platform.select({
    web: { marginLeft: 'auto', maxWidth: '78%' },
    default: { alignSelf: 'flex-start', maxWidth: '78%' },
  }),
  bubblePressTheirs: Platform.select({
    web: { marginRight: 'auto', maxWidth: '78%' },
    default: { alignSelf: 'flex-end', maxWidth: '78%' },
  }),
  groupMessageRow: Platform.select({
    web: {
      alignSelf: 'flex-end',
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 6,
      maxWidth: '86%',
    },
    default: {
      alignSelf: 'flex-end',
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 6,
      maxWidth: '86%',
    },
  }),
  groupMessageRowMine: {
    alignSelf: 'flex-start',
    flexDirection: 'row-reverse',
  },
  groupBubblePress: { flexShrink: 1, maxWidth: '100%' },
  groupAvatarSlot: {
    width: GROUP_AVATAR_SIZE,
    height: GROUP_AVATAR_SIZE,
    marginBottom: 2,
  },
  groupAvatarImage: {
    width: GROUP_AVATAR_SIZE,
    height: GROUP_AVATAR_SIZE,
    borderRadius: GROUP_AVATAR_SIZE / 2,
  },
  groupAvatarFallback: {
    width: GROUP_AVATAR_SIZE,
    height: GROUP_AVATAR_SIZE,
    borderRadius: GROUP_AVATAR_SIZE / 2,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bubble: {
    borderRadius: 18,
    minWidth: MESSAGE_BUBBLE_MIN_WIDTH,
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
    ...Platform.select({
      web: { borderBottomRightRadius: 4 },
      default: { borderBottomLeftRadius: 4 },
    }),
  },
  bubbleTheirs: {
    ...Platform.select({
      web: { borderBottomLeftRadius: 4 },
      default: { borderBottomLeftRadius: 4 },
    }),
    shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  msgTypeBadge: {
    fontSize: 11, color: Colors.muted, marginBottom: 3,
  },
  bubbleTxt: { fontSize: 12, fontFamily: Fonts.regular, lineHeight: 19 },
  bubbleTxtMine: { color: '#fff' },
  bubbleTxtTheirs: { color: Colors.ink },
  bubbleMeta: {
    flexDirection: 'row', alignItems: 'center',
    gap: 4, marginTop: 3, justifyContent: 'flex-end',
  },
  bubbleTime: { fontSize: 10, fontFamily: Fonts.regular },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.6)' },
  bubbleTimeTheirs: { color: Colors.muted },
  replyQuote: {
    flexDirection: 'row-reverse',
    alignItems: 'stretch',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 7,
    marginBottom: 7,
    backgroundColor: '#FFF7FA',
    borderWidth: 1,
    borderColor: Colors.accent + '55',
    overflow: 'hidden',
  },
  replyQuoteMine: {
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderColor: 'rgba(255,255,255,0.5)',
  },
  replyQuoteAccent: {
    width: 3,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  replyQuoteAccentMine: { backgroundColor: 'rgba(255,255,255,0.9)' },
  replyQuoteContent: { flex: 1, minWidth: 0 },
  replyQuoteTitle: { fontSize: 10.5, fontFamily: Fonts.bold, color: Colors.accent, textAlign: 'right' },
  replyQuoteTitleMine: { color: '#fff' },
  replyQuoteBody: {
    fontSize: 11.5,
    fontFamily: Fonts.regular,
    color: Colors.inkSoft,
    lineHeight: 17,
    marginTop: 2,
    textAlign: 'right',
  },
  replyQuoteBodyMine: { color: 'rgba(255,255,255,0.9)' },

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
  replyBarIcon: { fontSize: 18, color: Colors.accent },
  replyBarContent: { flex: 1 },
  replyBarPreview: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.muted, marginTop: 2 },
  stickerPicker: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.hair,
  },
  stickerPickerItem: {
    width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.bg,
  },
  stickerPickerEmoji: { fontSize: 26 },
  attachmentTray: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.hair,
  },
  attachmentOption: {
    minWidth: 56,
    alignItems: 'center',
    gap: 6,
  },
  attachmentOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentOptionEmoji: { fontSize: 20 },
  attachmentOptionText: {
    color: Colors.inkSoft,
    fontFamily: Fonts.semiBold,
    fontSize: 11,
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
  reqActions: {
    flexDirection: 'row', gap: 8,
    marginHorizontal: 12, marginBottom: 8,
  },
  reqRejectBtn: {
    flex: 1, height: 40, borderRadius: Radius.pill,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: Colors.dangerSoft, backgroundColor: Colors.dangerSoft,
  },
  reqRejectTxt: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.danger },
  reqAcceptBtn: {
    flex: 2, height: 40, borderRadius: Radius.pill,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    overflow: 'hidden',
  },
  reqAcceptTxt: { fontSize: 13, fontFamily: Fonts.bold, color: '#fff' },
  lockedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 12, marginBottom: 8,
    backgroundColor: Colors.ph2, borderRadius: Radius.lg, padding: 10,
  },
  lockedTxt: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.muted },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 10, paddingTop: 7, paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.hair,
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 4,
  },
  inputBarDisabled: { backgroundColor: Colors.ph2, shadowOpacity: 0 },
  composerShell: {
    flex: 1,
    minHeight: 46,
    maxHeight: 132,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.surface,
    borderRadius: 23,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.lineSoft,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  input: {
    flex: 1,
    minHeight: 45,
    maxHeight: 130,
    textAlign: 'right',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14.5,
    fontFamily: Fonts.regular,
    color: Colors.ink,
  },
  composerAttachBtn: {
    width: 42,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    marginLeft: 2,
  },
  composerAttachBtnActive: { backgroundColor: Colors.accentSoft },
  sendBtn: {
    width: 46, height: 46, borderRadius: 23,
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
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: 12, borderWidth: 1,
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
  reactionAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.accentSoft,
    borderWidth: 1,
    borderColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  reactionAvatarMine: { borderColor: 'rgba(255,255,255,0.7)' },
  reactionAvatarOverlap: { marginLeft: -5 },
  reactionAvatarImage: { width: '100%', height: '100%' },
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
  searchResultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  searchResultSender: { fontSize: 11.5, fontFamily: Fonts.semiBold, color: Colors.accent },
  searchResultBody: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.ink, textAlign: 'right', writingDirection: 'rtl' },
  searchResultTime: { fontSize: 10.5, fontFamily: Fonts.regular, color: Colors.muted },
  searchEmpty: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  searchEmptyTxt: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.inkSoft },

  // Message highlight
  msgHighlight: {
    backgroundColor: Colors.goldSoft,
    borderWidth: 1,
    borderColor: Colors.goldDeep + '66',
    shadowColor: Colors.goldDeep,
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
});
