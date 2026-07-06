import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { aiCoachApi, type CoachMessage } from '@/lib/api/ai-coach';
import { useAuth } from '@/lib/auth/AuthContext';
import { router, useLocalSearchParams } from 'expo-router';
import { Bot, ChevronLeft, Send } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

const QUICK_CHIPS = [
  { label: 'پیشنهاد برای بیو', prompt: 'برام یه بیو جذاب برای پروفایل دیتینگ پیشنهاد بده' },
  { label: 'بهبود پروفایل', prompt: 'چطور پروفایلم رو جذاب‌تر کنم؟' },
  { label: 'شروع گفتگو', prompt: 'چطور با یه نفر جدید گفتگو رو شروع کنم؟' },
  { label: 'اول قرار', prompt: 'برای اولین قرار ملاقات چه پیشنهادی داری؟' },
];

function ThinkingDots() {
  return (
    <View style={styles.thinkingBubble}>
      <View style={styles.dots}>
        <View style={[styles.dot, styles.dot1]} />
        <View style={[styles.dot, styles.dot2]} />
        <View style={[styles.dot, styles.dot3]} />
      </View>
    </View>
  );
}

export default function AiCoachChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const token = session?.accessToken ?? '';

  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);

  const fetchSession = useCallback(async () => {
    try {
      const detail = await aiCoachApi.getSession(token, Number(id));
      setMessages(detail.messages ?? []);
    } catch {
      Alert.alert('خطا', 'بارگذاری گفتگو ممکن نشد.', [
        { text: 'بازگشت', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => { fetchSession(); }, [fetchSession]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const send = async (prompt?: string) => {
    const msg = (prompt ?? text).trim();
    if (!msg || sending) return;

    const optimistic: CoachMessage = {
      id: -Date.now(),
      session_id: Number(id),
      role: 'user',
      content: msg,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setText('');
    setSending(true);

    try {
      const reply = await aiCoachApi.sendMessage(token, Number(id), msg);
      setMessages(prev => [...prev, reply]);
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      Alert.alert('خطا', 'ارسال پیام ممکن نشد.');
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: CoachMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.row, isUser ? styles.rowUser : styles.rowAi]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Bot size={14} color={Colors.purple} strokeWidth={2} />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
          <Text style={[styles.bubbleTxt, isUser ? styles.bubbleTxtUser : styles.bubbleTxtAi]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={22} color={Colors.ink} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.aiAvatarLg}>
            <Bot size={16} color={Colors.purple} strokeWidth={2} />
          </View>
          <Text style={styles.headerTxt}>مربی AI</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
            renderItem={renderMessage}
            contentContainerStyle={styles.msgList}
            ListHeaderComponent={
              messages.length === 0 ? (
                <View style={styles.welcomeWrap}>
                  <View style={styles.aiAvatarXl}>
                    <Bot size={28} color={Colors.purple} strokeWidth={1.5} />
                  </View>
                  <Text style={styles.welcomeTxt}>سلام! من مربی AI توام</Text>
                  <Text style={styles.welcomeSub}>یه سوال بپرس یا از موضوعات زیر انتخاب کن</Text>
                  <View style={styles.chips}>
                    {QUICK_CHIPS.map(c => (
                      <TouchableOpacity
                        key={c.label}
                        style={styles.chip}
                        onPress={() => send(c.prompt)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.chipTxt}>{c.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null
            }
            ListFooterComponent={
              sending ? <ThinkingDots /> : null
            }
          />
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="سوال یا پیام…"
            placeholderTextColor={Colors.muted}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
            textAlign="right"
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={() => send()}
            disabled={!text.trim() || sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Send size={16} color="#fff" strokeWidth={2.5} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

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
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  aiAvatarLg: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.purple + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTxt: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.ink },

  msgList: { padding: Spacing.md, paddingBottom: 16, gap: 8 },

  welcomeWrap: { alignItems: 'center', paddingVertical: Spacing.xl, gap: 10 },
  aiAvatarXl: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.purple + '18',
    borderWidth: 2, borderColor: Colors.purple + '44',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  welcomeTxt: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.ink },
  welcomeSub: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 4 },
  chip: {
    backgroundColor: Colors.surface, borderRadius: Radius.pill,
    borderWidth: 1.5, borderColor: Colors.hair,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  chipTxt: { fontSize: 12.5, fontFamily: Fonts.semiBold, color: Colors.inkSoft },

  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 },
  rowUser: { justifyContent: 'flex-start' },
  rowAi: { justifyContent: 'flex-end' },

  aiAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.purple + '18',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  bubble: {
    maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9,
  },
  bubbleUser: {
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.hair,
    borderBottomLeftRadius: 4,
  },
  bubbleAi: {
    backgroundColor: Colors.purple,
    borderBottomRightRadius: 4,
  },
  bubbleTxt: { fontSize: 14, lineHeight: 21 },
  bubbleTxtUser: { fontFamily: Fonts.regular, color: Colors.ink, textAlign: 'right' },
  bubbleTxtAi: { fontFamily: Fonts.regular, color: '#fff' },

  thinkingBubble: {
    flexDirection: 'row', justifyContent: 'flex-end',
    paddingHorizontal: Spacing.md, marginBottom: 8,
  },
  dots: {
    flexDirection: 'row', gap: 5, alignItems: 'center',
    backgroundColor: Colors.purple, borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#fff' },
  dot1: { opacity: 0.4 },
  dot2: { opacity: 0.7 },
  dot3: { opacity: 1 },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.hair,
    backgroundColor: Colors.surface,
  },
  input: {
    flex: 1, fontSize: 14, fontFamily: Fonts.regular, color: Colors.ink,
    backgroundColor: Colors.bg, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.hair,
    paddingHorizontal: 12, paddingVertical: 9,
    maxHeight: 110, textAlign: 'right',
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.lineSoft },
});
