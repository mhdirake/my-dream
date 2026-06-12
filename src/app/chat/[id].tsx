import { Colors, Fonts } from '@/constants/colors';
import { useChatMessages } from '@/lib/chat/useChatMessages';
import { useAuth } from '@/lib/auth/AuthContext';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Clock, Lock, Send, User } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BASE = process.env.EXPO_PUBLIC_API_URL ?? '';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
}

function absoluteUrl(path: string | null | undefined) {
  if (!path) return null;
  return path.startsWith('http') ? path : `${BASE}${path}`;
}

export default function ConversationScreen() {
  const { id, name, avatar, status } = useLocalSearchParams<{
    id: string;
    name: string;
    avatar?: string;
    status?: string;
  }>();
  const { session, user } = useAuth();
  const conversationId = Number(id);
  const myId = user?.id ?? -1;

  const { messages, loading, sending, send } = useChatMessages(
    conversationId,
    session?.accessToken ?? '',
  );

  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);
  const prevLengthRef = useRef(0);

  // Scroll to end whenever new messages arrive
  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      prevLengthRef.current = messages.length;
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setText('');
    try {
      await send(body, myId);
    } catch {
      setText(body);
    }
  };

  const avatarUrl = absoluteUrl(avatar);
  const isPending = status === 'pending';
  const isLocked = status === 'locked';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/chat' as never))}
        >
          <ArrowLeft size={20} color={Colors.ink} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={styles.headerUser}>
          <View style={styles.headerAvatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <View style={styles.headerAvatarFallback}>
                <User size={18} color={Colors.muted} strokeWidth={1.5} />
              </View>
            )}
          </View>
          <Text style={styles.headerName}>{name ?? '...'}</Text>
        </View>
        <View style={{ width: 40 }} />
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
            data={messages}
            keyExtractor={m => String(m.id)}
            renderItem={({ item }) => {
              const isMine = item.sender_id === myId;
              return (
                <View style={[styles.msgWrap, isMine ? styles.msgWrapMine : styles.msgWrapTheirs]}>
                  <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.bubbleTxt, isMine ? styles.bubbleTxtMine : styles.bubbleTxtTheirs]}>
                      {item.body}
                    </Text>
                    <Text style={[styles.bubbleTime, isMine ? styles.bubbleTimeMine : styles.bubbleTimeTheirs]}>
                      {formatTime(item.created_at)}
                    </Text>
                  </View>
                </View>
              );
            }}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              isPending ? null : (
                <View style={styles.center}>
                  <Text style={styles.emptyEmoji}>💬</Text>
                  <Text style={styles.emptyTxt}>هنوز پیامی نیست</Text>
                  <Text style={styles.emptySub}>اولین پیام رو بفرست!</Text>
                </View>
              )
            }
          />
        )}

        {isPending && (
          <View style={styles.pendingBanner}>
            <Clock size={15} color={Colors.trust} strokeWidth={2} />
            <Text style={styles.pendingTxt}>
              در انتظار تأیید {name} — تا تأیید نکنه چت باز نمیشه
            </Text>
          </View>
        )}

        {isLocked && (
          <View style={styles.lockedBanner}>
            <Lock size={15} color={Colors.muted} strokeWidth={2} />
            <Text style={styles.lockedTxt}>این گفت‌وگو قفل شده</Text>
          </View>
        )}

        <View style={[styles.inputBar, (isPending || isLocked) && styles.inputBarDisabled]}>
          {isPending || isLocked ? (
            <View style={styles.inputLocked}>
              <Lock size={15} color={Colors.muted} strokeWidth={2} />
              <Text style={styles.inputLockedTxt}>
                {isPending ? 'در انتظار تأیید…' : 'چت قفل است'}
              </Text>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder="پیام بنویس…"
                placeholderTextColor={Colors.muted}
                multiline
                maxLength={1000}
                textAlign="right"
                returnKeyType="send"
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!text.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <LinearGradient colors={Colors.gradColors} style={StyleSheet.absoluteFill} />
                    <Send size={18} color="#fff" strokeWidth={2} />
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
    height: 56, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: Colors.hair,
    backgroundColor: Colors.surface,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerUser: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', backgroundColor: Colors.ph2 },
  headerAvatarFallback: {
    width: '100%', height: '100%',
    backgroundColor: Colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  headerName: { fontSize: 15, fontFamily: Fonts.extraBold, color: Colors.ink },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyTxt: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.ink },
  emptySub: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.muted },

  listContent: { padding: 16, gap: 4, paddingBottom: 8, flexGrow: 1 },

  msgWrap: { flexDirection: 'row', marginVertical: 2 },
  msgWrapMine: { justifyContent: 'flex-end' },
  msgWrapTheirs: { justifyContent: 'flex-start' },

  bubble: {
    maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  bubbleMine: { backgroundColor: Colors.accent, borderBottomRightRadius: 5 },
  bubbleTheirs: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.hair, borderBottomLeftRadius: 5 },
  bubbleTxt: { fontSize: 14, fontFamily: Fonts.regular, lineHeight: 22 },
  bubbleTxtMine: { color: '#fff' },
  bubbleTxtTheirs: { color: Colors.ink },
  bubbleTime: { fontSize: 10, marginTop: 4, fontFamily: Fonts.regular },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.65)', textAlign: 'right' },
  bubbleTimeTheirs: { color: Colors.muted, textAlign: 'left' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    padding: 12, paddingBottom: 8,
    borderTopWidth: 1, borderTopColor: Colors.hair,
    backgroundColor: Colors.surface,
  },
  input: {
    flex: 1, minHeight: 44, maxHeight: 120,
    backgroundColor: Colors.bg, borderRadius: 22,
    borderWidth: 1, borderColor: Colors.lineSoft,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, fontFamily: Fonts.regular, color: Colors.ink,
    textAlignVertical: 'center',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  sendBtnDisabled: { opacity: 0.4 },

  pendingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 12, marginBottom: 8,
    backgroundColor: Colors.trustSoft, borderRadius: 12, padding: 10,
  },
  pendingTxt: { fontSize: 12, fontFamily: Fonts.regular, color: '#2C5C8F', flex: 1, lineHeight: 18 },

  lockedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 12, marginBottom: 8,
    backgroundColor: Colors.ph2, borderRadius: 12, padding: 10,
  },
  lockedTxt: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.muted },

  inputBarDisabled: { backgroundColor: Colors.ph2 },
  inputLocked: {
    flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16,
  },
  inputLockedTxt: { fontSize: 13.5, fontFamily: Fonts.regular, color: Colors.muted },
});
