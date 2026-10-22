import { Colors, Fonts, Radius } from '@/constants/colors';
import { Sheet } from '@/components/ui/Sheet';
import { chatApi, type ConversationTemplate } from '@/lib/api/chat';
import { toast } from '@/lib/toast';
import { Send, Shield } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
    // Opening the modal starts a template request for this viewer.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <Sheet
      visible={visible}
      onClose={handleClose}
      title={`پیام به ${firstName}`}
      scroll={false}
      contentStyle={styles.content}
      footer={
        <TouchableOpacity
          style={[styles.sendBtn, (selected === null || loadingTemplates) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={selected === null || sending || loadingTemplates}
          activeOpacity={0.85}
        >
          {sending ? (
            <ActivityIndicator size="small" color={Colors.accent} />
          ) : (
            <>
              <Send size={18} color={Colors.accent} strokeWidth={2} />
              <Text style={styles.sendTxt}>ارسال درخواست</Text>
            </>
          )}
        </TouchableOpacity>
      }
    >
      <View style={styles.trustNote}>
        <Shield size={14} color={Colors.trust} strokeWidth={2} />
        <Text style={styles.trustTxt}>
          بعد از تأیید {firstName}، گفت‌وگو آزاد می‌شه
        </Text>
      </View>

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
                <Text style={[styles.templateTxt, isActive && styles.templateTxtActive]}>
                  {t.body}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },

  trustNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.trustSoft, borderRadius: Radius.md, padding: 12,
  },
  trustTxt: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.trust, lineHeight: 18, flex: 1 },

  loadingBox: { height: 100, alignItems: 'center', justifyContent: 'center' },

  templateScroll: { flexShrink: 1 },
  templates: { gap: 10, paddingBottom: 4 },
  templateItem: {
    borderRadius: Radius.lg, padding: 14,
    borderWidth: 1.5, borderColor: Colors.lineSoft,
    backgroundColor: Colors.surface, overflow: 'hidden',
  },
  templateItemActive: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft },
  templateTxt: { fontSize: 13.5, fontFamily: Fonts.regular, color: Colors.ink, lineHeight: 22 },
  templateTxtActive: { color: Colors.accent, fontFamily: Fonts.semiBold },

  sendBtn: {
    height: 52, borderRadius: Radius.pill,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.accentSoft,
    borderWidth: 1.5, borderColor: Colors.accent,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendTxt: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.accent },
});
