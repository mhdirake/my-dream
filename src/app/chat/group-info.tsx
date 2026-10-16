import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors, Fonts, Spacing } from '@/constants/colors';
import { chatApi, type GroupInfo } from '@/lib/api/chat';
import { useAuth } from '@/lib/auth/AuthContext';
import { toFaDigits } from '@/lib/localization';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GroupInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [info, setInfo] = useState<GroupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const conversationId = Number(id);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (!session?.accessToken) return;
    if (!Number.isSafeInteger(conversationId) || conversationId <= 0) {
      setError('شناسه گروه معتبر نیست'); setLoading(false); return;
    }
    setLoading(true); setError(''); setInfo(null);
    chatApi.getGroupInfo(session.accessToken, conversationId)
      .then(data => { if (active) setInfo(data); })
      .catch((failure: unknown) => { if (active) setError(failure instanceof Error ? failure.message : 'دریافت اطلاعات گروه ممکن نشد'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session, conversationId, reload]));

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="اطلاعات و قوانین گروه" back backFallback="/chat" />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator color={Colors.accent} /> : error ? <Text style={styles.error}>{error}</Text> : info && <>
          <Text style={styles.title}>{info.title || (info.group_key === 'gold' ? 'گروه طلایی' : 'گروه نقره‌ای')}</Text>
          <Card tint="trust">
            <Text style={styles.heading}>چرا به این گروه دسترسی دارم؟</Text>
            <Text style={styles.body}>{info.access_reason}</Text>
          </Card>
          <Card>
            <Text style={styles.heading}>اعضای گروه</Text>
            <Text style={styles.body}>{toFaDigits(info.participant_count)} عضو با دسترسی فعال</Text>
            <Text style={styles.body}>{info.online_count === null ? 'تعداد آنلاین‌ها فعلاً در دسترس نیست' : `${toFaDigits(info.online_count)} نفر آنلاین`}</Text>
            <Text style={styles.note}>برآورد آنلاین‌ها بر اساس فعالیت یک دقیقه اخیر است؛ برای دریافت آخرین وضعیت، به‌روزرسانی را بزن.</Text>
          </Card>
          <Card>
            <Text style={styles.heading}>قوانین و امکانات گروه</Text>
            {info.rules.map(rule => <Text key={rule} style={styles.body}>• {rule}</Text>)}
          </Card>
        </>}
        <Button variant="ghost" disabled={loading} onPress={() => setReload(value => value + 1)}>{error ? 'تلاش دوباره' : 'به‌روزرسانی اطلاعات'}</Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, gap: Spacing.md },
  title: { fontFamily: Fonts.bold, fontSize: 20, color: Colors.ink, textAlign: 'right' },
  heading: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.ink, textAlign: 'right', marginBottom: 8 },
  body: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.ink, textAlign: 'right', lineHeight: 24 },
  note: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.muted, textAlign: 'right', lineHeight: 20, marginTop: 8 },
  error: { fontFamily: Fonts.regular, color: Colors.danger, textAlign: 'right' },
});
