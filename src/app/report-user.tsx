import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from '@/lib/toast';
import { router, useLocalSearchParams } from 'expo-router';
import { Flag } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type ReportCategory = { id: number; name: string; slug: string; description: string | null };

export default function ReportUserScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const params = useLocalSearchParams<{
    userId: string;
    userName?: string;
    conversationPublicId?: string;
    messageId?: string;
    context?: string;
  }>();

  const isMessageReport =
    params.context === 'message' &&
    !!params.conversationPublicId &&
    !!params.messageId;

  const [categories, setCategories] = useState<ReportCategory[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!session?.accessToken) return;
    api.get<{ data: ReportCategory[] }>('/api/client/report-categories', session.accessToken)
      .then(res => setCategories(res.data))
      .catch(() => toast.error('خطا در بارگذاری دسته‌بندی‌ها'))
      .finally(() => setLoading(false));
  }, [session?.accessToken]);

  const handleSubmit = () => {
    if (!selectedId) {
      toast.error('یک دلیل انتخاب کن');
      return;
    }
    doSubmit();
  };

  const doSubmit = async () => {
    if (!session?.accessToken || !selectedId) return;
    setSending(true);
    try {
      if (isMessageReport) {
        await api.post(
          '/api/client/reports',
          {
            reported_user_id: Number(params.userId),
            report_category_id: selectedId,
            context: 'message',
            conversation_public_id: params.conversationPublicId,
            message_id: params.messageId,
            description: description.trim() || undefined,
          },
          session.accessToken,
        );
      } else {
        await api.post(
          `/api/client/users/${params.userId}/reports`,
          {
            report_category_id: selectedId,
            context: 'profile',
            description: description.trim() || undefined,
          },
          session.accessToken,
        );
      }
      toast.success('گزارش با موفقیت ثبت شد');
      router.back();
    } catch (e: any) {
      if (e.status === 422) {
        toast.error('این گزارش قبلاً ثبت شده است');
      } else {
        toast.error(e.message ?? 'خطا در ارسال گزارش');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title={isMessageReport ? 'گزارش پیام' : 'گزارش تخلف'} back />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Who */}
          <Card soft>
            <View style={styles.userRow}>
              <Flag size={16} color={Colors.danger} strokeWidth={2} />
              <Text style={styles.userTxt}>
                {isMessageReport ? 'گزارش پیام از ' : 'گزارش تخلف برای '}
                <Text style={styles.userName}>
                  {params.userName ?? `کاربر #${params.userId}`}
                </Text>
              </Text>
            </View>
          </Card>

          {/* Category */}
          <Text style={styles.sectionTitle}>دلیل گزارش</Text>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catRow, selectedId === cat.id && styles.catRowActive]}
              onPress={() => setSelectedId(cat.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.radio, selectedId === cat.id && styles.radioActive]}>
                {selectedId === cat.id && <View style={styles.radioDot} />}
              </View>
              <View style={styles.catInfo}>
                <Text style={[styles.catName, selectedId === cat.id && styles.catNameActive]}>
                  {cat.name}
                </Text>
                {cat.description && (
                  <Text style={styles.catDesc}>{cat.description}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}

          {/* Description */}
          <Text style={styles.sectionTitle}>توضیحات (اختیاری)</Text>
          <Card soft>
            <TextInput
              style={styles.descInput}
              placeholder="جزئیات بیشتر بنویس..."
              placeholderTextColor={Colors.muted}
              multiline
              numberOfLines={3}
              maxLength={2000}
              value={description}
              onChangeText={setDescription}
              textAlignVertical="top"
            />
          </Card>

          {/* Note */}
          <Card tint="trust">
            <Text style={styles.noteTxt}>
              گزارش‌های واهی یا غیرمعتبر ممکن است به حساب شما آسیب برساند. لطفاً فقط در صورت وجود تخلف واقعی گزارش بده.
            </Text>
          </Card>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {!loading && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <Button
            variant="accent"
            onPress={handleSubmit}
            disabled={sending || !selectedId}
          >
            {sending ? 'در حال ارسال…' : 'ارسال گزارش'}
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.lg, gap: 10 },

  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userTxt: { fontSize: 13, color: Colors.inkSoft, fontFamily: Fonts.regular, flex: 1 },
  userName: { fontFamily: Fonts.bold, color: Colors.ink },

  sectionTitle: {
    fontSize: 11, fontFamily: Fonts.extraBold, color: Colors.muted,
    marginTop: Spacing.sm, marginBottom: 2,
  },

  catRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.hair, padding: Spacing.lg,
  },
  catRowActive: { borderColor: Colors.danger + 'AA', backgroundColor: '#FFF1F0' },

  radio: {
    width: 20, height: 20, borderRadius: 10, marginTop: 1,
    borderWidth: 2, borderColor: Colors.muted,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  radioActive: { borderColor: Colors.danger },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: Colors.danger },

  catInfo: { flex: 1, gap: 2 },
  catName: { fontSize: 13.5, fontFamily: Fonts.semiBold, color: Colors.inkSoft },
  catNameActive: { color: Colors.ink },
  catDesc: { fontSize: 11.5, color: Colors.muted, fontFamily: Fonts.regular, lineHeight: 17 },

  descInput: {
    fontSize: 13, fontFamily: Fonts.regular, color: Colors.ink, minHeight: 70,
  },

  noteTxt: { fontSize: 12, color: '#2C5C8F', fontFamily: Fonts.regular, lineHeight: 19 },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.lineSoft,
    backgroundColor: Colors.surface,
  },
});
