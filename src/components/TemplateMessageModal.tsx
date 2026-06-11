import { Colors, Fonts, Radius } from '@/constants/colors';
import { TEMPLATE_MESSAGES, chatApi } from '@/lib/api/chat';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageCircle, Send, Shield, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
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
  const [selected, setSelected] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!selected || sending) return;
    setSending(true);
    try {
      await chatApi.sendConversationRequest(token, userId, selected);
      setSelected(null);
      onSent();
    } catch {
      // silently ignore — server may return error if already requested
      setSelected(null);
      onSent();
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
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={styles.sheet}>
        {/* Handle */}
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
        <View style={styles.templates}>
          {TEMPLATE_MESSAGES.map((t) => {
            const isActive = selected === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.templateItem, isActive && styles.templateItemActive]}
                onPress={() => setSelected(t.key)}
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
                <Text style={[styles.templateTxt, isActive && styles.templateTxtActive]}>
                  {t.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Send button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.sendBtn, !selected && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!selected || sending}
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(36,33,42,0.45)',
    zIndex: 1,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 36,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.lineSoft,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.trustSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 15, fontFamily: Fonts.extraBold, color: Colors.ink },
  headerSub: { fontSize: 11.5, fontFamily: Fonts.regular, color: Colors.muted, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.ph2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  trustNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: Colors.trustSoft,
    borderRadius: Radius.md,
    padding: 12,
  },
  trustTxt: { fontSize: 12, fontFamily: Fonts.regular, color: '#2C5C8F', lineHeight: 18, flex: 1 },

  templates: { paddingHorizontal: 20, gap: 10 },
  templateItem: {
    borderRadius: Radius.lg,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.lineSoft,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  templateItemActive: {
    borderColor: 'transparent',
  },
  templateTxt: {
    fontSize: 13.5,
    fontFamily: Fonts.regular,
    color: Colors.ink,
    lineHeight: 22,
  },
  templateTxtActive: {
    color: '#fff',
    fontFamily: Fonts.semiBold,
  },

  footer: { paddingHorizontal: 20, paddingTop: 20 },
  sendBtn: {
    height: 52,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
    backgroundColor: Colors.lineSoft,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendTxt: { fontSize: 15, fontFamily: Fonts.bold, color: '#fff' },
});
