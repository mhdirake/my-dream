import { Colors, Fonts, Radius } from '@/constants/colors';
import { chatApi, type ConversationTemplate } from '@/lib/api/chat';
import { toast } from '@/lib/toast';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageCircle, Send, Shield, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Props = {
  visible: boolean;
  userId: number;
  firstName: string;
  token: string;
  onClose: () => void;
  onSent: () => void;
};

export function TemplateMessageModal({ visible, userId, firstName, token, onClose, onSent }: Props) {
  const [templates, setTemplates] = useState<ConversationTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible || !token) return;
    setLoadingTemplates(true);
    chatApi.listConversationTemplates(token)
      .then(setTemplates)
      .catch(() => toast.error('خطا در دریافت پیام‌های آماده'))
      .finally(() => setLoadingTemplates(false));
  }, [visible, token]);

  const handleSend = async () => {
    if (selected === null || sending) return;
    setSending(true);
    try {
      await chatApi.sendConversationRequest(token, userId, selected);
      toast.success('درخواست گفتگو ارسال شد!');
      setSelected(null);
      onSent();
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message;
      if (msg?.includes('already exists') || msg?.includes('already pending')) {
        toast.success('درخواست قبلاً ارسال شده');
        setSelected(null);
        onSent();
      } else {
        toast.error(msg ?? 'خطا در ارسال درخواست');
        setSending(false);
      }
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (sending) return;
    setSelected(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <MessageCircle size={20} color={Colors.trust} strokeWidth={2} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>پیام به {firstName}</Text>
            <Text style={styles.headerSub}>یکی از پیام‌های آماده رو انتخاب کن</Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
            <X size={18} color={Colors.muted} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Trust note */}
        <View style={styles.trustNote}>
          <Shield size={14} color={Colors.trust} strokeWidth={2} />
          <Text style={styles.trustTxt}>
            بعد از تأیید {firstName}، گفت‌وگو آزاد می‌شه
          </Text>
        </View>

        {/* Templates */}
        {loadingTemplates ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.accent} />
          </View>
        ) : (
          <ScrollView
            style={styles.templateScroll}
            contentContainerStyle={styles.templates}
            showsVerticalScrollIndicator={false}
          >
            {templates.map((t) => {
              const isActive = selected === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.templateItem, isActive && styles.templateItemActive]}
                  onPress={() => setSelected(t.id)}
                  activeOpacity={0.75}
                >
                  {isActive && (
                    <LinearGradient
                      colors={Colors.gradColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  {/* {t.title && (
                    <Text style={[styles.templateTitle, isActive && styles.templateTitleActive]}>
                      {t.title}
                    </Text>
                  )} */}
                  <Text style={[styles.templateTxt, isActive && styles.templateTxtActive]}>
                    {t.body}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Send button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.sendBtn, (selected === null || loadingTemplates) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={selected === null || sending || loadingTemplates}
            activeOpacity={0.85}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <LinearGradient
                  colors={Colors.gradColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <Send size={18} color="#fff" strokeWidth={2} />
                <Text style={styles.sendTxt}>ارسال درخواست</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(36,33,42,0.45)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: 36, maxHeight: '85%',
  },
  handle: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: Colors.lineSoft,
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16,
  },
  headerIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.trustSoft, alignItems: 'center', justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 15, fontFamily: Fonts.extraBold, color: Colors.ink },
  headerSub: { fontSize: 11.5, fontFamily: Fonts.regular, color: Colors.muted, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.ph2, alignItems: 'center', justifyContent: 'center',
  },

  trustNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: Colors.trustSoft, borderRadius: Radius.md, padding: 12,
  },
  trustTxt: { fontSize: 12, fontFamily: Fonts.regular, color: '#2C5C8F', lineHeight: 18, flex: 1 },

  loadingBox: { height: 100, alignItems: 'center', justifyContent: 'center' },

  templateScroll: { flexShrink: 1 },
  templates: { paddingHorizontal: 20, gap: 10, paddingBottom: 4 },
  templateItem: {
    borderRadius: Radius.lg, padding: 14,
    borderWidth: 1.5, borderColor: Colors.lineSoft,
    backgroundColor: Colors.surface, overflow: 'hidden',
  },
  templateItemActive: { borderColor: 'transparent' },
  templateTitle: {
    fontSize: 11, fontFamily: Fonts.bold, color: Colors.muted, marginBottom: 5,
  },
  templateTitleActive: { color: 'rgba(255,255,255,0.75)' },
  templateTxt: { fontSize: 13.5, fontFamily: Fonts.regular, color: Colors.ink, lineHeight: 22 },
  templateTxtActive: { color: '#fff', fontFamily: Fonts.semiBold },

  footer: { paddingHorizontal: 20, paddingTop: 16 },
  sendBtn: {
    height: 52, borderRadius: Radius.pill,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, overflow: 'hidden', backgroundColor: Colors.lineSoft,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendTxt: { fontSize: 15, fontFamily: Fonts.bold, color: '#fff' },
});
