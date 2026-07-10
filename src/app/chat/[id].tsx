import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { ApiError } from '@/lib/api/client';
import { chatApi } from '@/lib/api/chat';
import { BackendGift } from '@/lib/api/discover';
import { giftsApi } from '@/lib/api/gifts';
import { profileApi } from '@/lib/api/profile';
import { useChatMessages } from '@/lib/chat/useChatMessages';
import { useVoiceRecorder } from '@/lib/chat/useVoiceRecorder';
import { useKeyboardHeight } from '@/lib/useKeyboardHeight';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from '@/lib/toast';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft, Check, CheckCheck, Clock, Gift as GiftIcon,
  ImageOff, ImagePlus, Lock, Mic, MoreVertical, Pause, Pencil, Play,
  RefreshCw, Search, Send, Trash2, User, X,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
}

function toPersianNum(n: number) {
  return String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);
}

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

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
      <TouchableOpacity style={[styles.voicePlayBtn, { backgroundColor: isMine ? 'rgba(255,255,255,0.25)' : Colors.purpleSoft }]} onPress={toggle} activeOpacity={0.8}>
        {status.playing
          ? <Pause size={14} color={tint} fill={tint} strokeWidth={0} />
          : <Play size={14} color={tint} fill={tint} strokeWidth={0} />
        }
      </TouchableOpacity>
      <View style={[styles.voiceWave, { backgroundColor: isMine ? 'rgba(255,255,255,0.3)' : Colors.lineSoft }]} />
      <Text style={[styles.voiceDurationTxt, { color: tint }]}>{formatDuration(remaining)}</Text>
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
  const opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };
  if (d.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString('fa-IR', opts);
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
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { id, publicId, name, avatar, status, otherId, isSender } = useLocalSearchParams<{
    id: string;
    publicId: string;
    name: string;
    avatar?: string;
    status?: string;
    otherId?: string;
    isSender?: string;
  }>();

  const { session, user } = useAuth();
  const conversationId = Number(id);
  const myId = user?.id ?? -1;
  const token = session?.accessToken ?? '';

  const {
    messages, loading, sending, send, sendTyped, pushMessage, typingUserId,
    loadMore, hasMore, deleteMsg, editMsg,
    setReaction, removeReaction,
    loadContext, highlightId, clearHighlight,
  } = useChatMessages(conversationId, publicId ?? '', token);

  const otherTyping = typingUserId != null && String(typingUserId) === otherId;

  const [text, setText] = useState('');
  const [pendingImage, setPendingImage] = useState<{ uri: string; mimeType: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [myPlan, setMyPlan] = useState<string>('basic');
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [msgMenu, setMsgMenu] = useState<{ id: string; sender: number; body: string; type?: string; myReaction?: string | null } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // پیش‌بارگذاری کاتالوگ هدیه‌ها تا پیام‌های نوع gift (حتی قبل از باز کردن picker) بتونن به عکس/عنوان واقعی وصل بشن
  useEffect(() => {
    if (!token || gifts.length > 0) return;
    giftsApi.list(token).then(setGifts).catch(() => {});
  }, [token]);

  // Presence
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Message search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<import('@/lib/api/chat').MessageSearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<TextInput>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<FlatList>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMarkedReadIdRef = useRef<string | null>(null);

  const [reqStatus, setReqStatus] = useState(status);
  useEffect(() => { setReqStatus(status); }, [status]);
  const [responding, setResponding] = useState(false);

  const isPending = reqStatus === 'pending';
  const isLocked = reqStatus === 'locked';
  const isExpired = reqStatus === 'expired';
  const isRejected = reqStatus === 'rejected';
  const canChat = reqStatus === 'accepted';
  const canRespond = isPending && isSender !== '1';

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
  useEffect(() => {
    if (!token || !conversationId) return;
    const others = messages.filter(m => m.sender_user_id !== myId && !m.is_deleted);
    const latest = others[others.length - 1];
    if (
      latest?.message_id &&
      !latest.message_id.startsWith('optimistic') &&
      lastMarkedReadIdRef.current !== latest.message_id
    ) {
      lastMarkedReadIdRef.current = latest.message_id;
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
    if (messages.length === 0) {
      // چت خالی: empty state باید دیده بشه — بدون این، لیست برای همیشه opacity:0 می‌مونه
      setListReady(true);
      return;
    }
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
    if (searchQuery.trim().length < 3) { setSearchResults([]); return; }
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

  useFocusEffect(useCallback(() => {
    if (!token) return;
    profileApi.getProfile(token)
      .then(p => setMyPlan(p.active_subscription?.plan?.slug ?? 'basic'))
      .catch(() => {});
  }, [token]));

  const handlePickImage = async () => {
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
          media_url: media.media_url,
          media_size: media.media_size,
          mime_type: media.mime_type,
          width: media.width,
          height: media.height,
          ...(caption ? { caption } : {}),
        },
        myId,
        pendingImage.uri,
      );
      setPendingImage(null);
      setText('');
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
    }
  };

  const handleMicPress = async () => {
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
          media_url: media.media_url,
          media_size: media.media_size,
          mime_type: media.mime_type,
          duration_seconds: media.duration_seconds ?? duration,
        },
        myId,
        uri,
      );
      voiceRecorder.reset();
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

  const handleMessageLongPress = useCallback((messageId: string, senderId: number, bodyText: string, myReaction?: string | null, messageType?: string) => {
    setMsgMenu({ id: messageId, sender: senderId, body: bodyText, type: messageType, myReaction });
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
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

      <View style={[styles.flex, { paddingBottom: keyboardHeight }]}>
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
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={m => m.message_id}
            onScroll={handleScroll}
            scrollEventThrottle={200}
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            onContentSizeChange={handleContentSizeChange}
            style={!listReady && { opacity: 0 }}
            renderItem={({ item, index }) => {
              if (item.is_deleted) return null;
              const showDaySep = index === 0 || !isSameDay(item.created_at, messages[index - 1].created_at);
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

              const bubbleContent = (
                <>
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
                      {item.message_type === 'sticker' ? '😊' :
                       item.message_type === 'gif' ? '🎞' : '🖼'}
                    </Text>
                  ) : null}
                  {(item.message_type !== 'gift') && !!(imageUri ? item.caption : (item.body_text || item.caption)) && (
                    <Text style={[styles.bubbleTxt, isMine ? styles.bubbleTxtMine : styles.bubbleTxtTheirs, imageUri != null && { marginTop: 6 }]}>
                      {imageUri ? item.caption : (item.body_text || item.caption)}
                    </Text>
                  )}
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

        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 10 }, (!canChat || limitReached) && styles.inputBarDisabled]}>
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
                style={[styles.sendBtn, (!!text.trim() || !!pendingImage) && styles.sendBtnActive]}
                onPress={pendingImage ? handleSendImage : handleSend}
                disabled={pendingImage ? uploadingImage : (!text.trim() || sending)}
                activeOpacity={0.8}
              >
                {(sending || uploadingImage) ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    {(!!text.trim() || !!pendingImage) && (
                      <LinearGradient colors={Colors.gradColors as [string, string]} style={StyleSheet.absoluteFill} />
                    )}
                    {editingId
                      ? <Pencil size={17} color={text.trim() ? '#fff' : Colors.muted} strokeWidth={2} />
                      : <Send style={[styles.sendBtnIcon]} size={18} color={(text.trim() || pendingImage) ? '#fff' : Colors.muted} strokeWidth={2} />
                    }
                  </>
                )}
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={handleTextChange}
                placeholder={editingId ? 'ویرایش' : pendingImage ? 'زیرنویس (اختیاری)' : 'پیام'}
                placeholderTextColor={Colors.muted}
                multiline
                maxLength={pendingImage ? 500 : 2000}
                textAlign="right"
                textAlignVertical="top"
              />
              {!editingId && !pendingImage && (
                <>
                  <TouchableOpacity style={styles.attachBtn} onPress={handlePickImage} hitSlop={6} activeOpacity={0.7}>
                    <ImagePlus size={20} color={Colors.muted} strokeWidth={1.8} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.giftAttachBtn} onPress={handleOpenGiftPicker} hitSlop={6} activeOpacity={0.7}>
                    <GiftIcon size={18} color={Colors.goldDeep} strokeWidth={1.8} />
                  </TouchableOpacity>
                  {!text.trim() && (
                    <TouchableOpacity style={styles.micAttachBtn} onPress={handleMicPress} hitSlop={6} activeOpacity={0.7}>
                      <Mic size={18} color={Colors.trust} strokeWidth={1.8} />
                    </TouchableOpacity>
                  )}
                </>
              )}
            </>
          )}
        </View>
      </View>

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
                    {msgMenu?.type !== 'gift' && (
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
  voicePlayerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 130 },
  voicePlayBtn: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  voiceWave: { flex: 1, height: 3, borderRadius: 2 },
  voiceDurationTxt: { fontFamily: Fonts.semiBold, fontSize: 11.5 },
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
  searchResultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  searchResultSender: { fontSize: 11.5, fontFamily: Fonts.semiBold, color: Colors.accent },
  searchResultBody: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.ink, textAlign: 'right', writingDirection: 'rtl' },
  searchResultTime: { fontSize: 10.5, fontFamily: Fonts.regular, color: Colors.muted },
  searchEmpty: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  searchEmptyTxt: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.inkSoft },

  // Message highlight
  msgHighlight: { backgroundColor: Colors.accentSoft + '55' },
});
