import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { profileApi } from '@/lib/api/profile';
import { router } from 'expo-router';
import { Info, Plus, Sparkles, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MAX_FLAGS = 3;
const MAX_CHARS = 70;
const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

export default function RedFlagsScreen() {
  const { session } = useAuth();
  const [flags, setFlags] = useState<string[]>(['', '', '']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filled = flags.filter(f => f.trim().length > 0);

  const updateFlag = (idx: number, val: string) => {
    setFlags(prev => prev.map((f, i) => (i === idx ? val.slice(0, MAX_CHARS) : f)));
  };

  const handleSave = async () => {
    if (!session?.accessToken || filled.length === 0) return;
    setSaving(true);
    setError('');
    try {
      await profileApi.updateProfile(session.accessToken, {
        dealbreakers: filled,
      });
      router.push('/profile-setup/optional-info' as any);
    } catch (e: any) {
      setError(e.message ?? 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <OptStepper idx={6} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Red Flags</Text>
        <Text style={styles.sub}>
          حداکثر {toPersian(MAX_FLAGS)} مورد — چه چیزایی برات قابل قبول نیست؟
        </Text>

        {flags.map((f, i) => (
          <View key={i} style={[styles.flagBox, f.trim() && styles.flagBoxFilled]}>
            <TextInput
              style={styles.flagInput}
              value={f}
              onChangeText={v => updateFlag(i, v)}
              placeholder={`Red Flag ${toPersian(i + 1)}`}
              placeholderTextColor={Colors.muted}
              maxLength={MAX_CHARS}
            />
            <View style={styles.flagFooter}>
              {f.trim() ? (
                <>
                  <Pressable onPress={() => updateFlag(i, '')} hitSlop={8}>
                    <X size={14} color={Colors.muted} strokeWidth={2} />
                  </Pressable>
                  <Text style={styles.charCount}>
                    {toPersian(f.length)}/{toPersian(MAX_CHARS)}
                  </Text>
                </>
              ) : (
                <Plus size={14} color={Colors.muted} strokeWidth={2} />
              )}
            </View>
          </View>
        ))}

        <Card tint="trust" style={styles.note}>
          <View style={styles.noteRow}>
            <Info size={13} color={Colors.trust} strokeWidth={2} />
            <Text style={styles.noteText}>
              متن توسط AI بررسی می‌شود تا توهین‌آمیز نباشد. این موارد در Gold Matching باعث
              حذف کاربر متضاد می‌شوند.
            </Text>
          </View>
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.btnRow}>
          <Button variant="ghost" onPress={() => router.back()} full={false} style={styles.btnSkip}>فعلاً نه</Button>
          <Button variant="accent" onPress={handleSave} disabled={filled.length === 0 || saving} full={false} style={styles.btnSave}>
            {saving ? 'در حال ذخیره…' : 'ذخیره و ادامه'}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

function OptStepper({ idx }: { idx: number }) {
  const total = 8;
  return (
    <View style={styles.stepper}>
      <View style={styles.stepperTop}>
        <View style={styles.badge}>
          <Sparkles size={11} color={Colors.ok} strokeWidth={2} />
          <Text style={styles.badgeText}>اختیاری · هر وقت خواستی</Text>
        </View>
        <Text style={styles.stepCounter}>{toPersian(idx)} از {toPersian(total)}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((idx - 1) / total) * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  stepper: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12, backgroundColor: Colors.surface },
  stepperTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.okSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill,
  },
  badgeText: { fontSize: 10.5, fontFamily: Fonts.extraBold, color: Colors.ok },
  stepCounter: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular },
  progressTrack: { height: 5, borderRadius: Radius.pill, backgroundColor: 'rgba(36,33,42,0.08)' },
  progressFill: { height: 5, borderRadius: Radius.pill, backgroundColor: Colors.ok },
  content: { padding: Spacing.xl, paddingBottom: 30 },
  title: { fontSize: 19, fontFamily: Fonts.extraBold, color: Colors.ink, letterSpacing: -0.3, marginBottom: 4 },
  sub: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.regular, marginBottom: 16 },
  flagBox: {
    borderWidth: 1.5, borderColor: Colors.lineSoft, borderRadius: 10,
    backgroundColor: Colors.surface, marginBottom: 8, paddingHorizontal: 12, paddingTop: 10,
  },
  flagBoxFilled: { borderColor: Colors.ink },
  flagInput: {
    fontSize: 13, fontFamily: Fonts.regular, color: Colors.ink,
    minHeight: 38, paddingBottom: 6,
  },
  flagFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8 },
  charCount: { fontSize: 10, color: Colors.muted, fontFamily: Fonts.regular },
  note: { marginTop: 8 },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noteText: { fontSize: 12, color: Colors.trust, fontFamily: Fonts.regular, flex: 1, lineHeight: 18 },
  error: { fontSize: 12, color: Colors.danger, fontFamily: Fonts.regular, marginTop: 8 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.lineSoft,
    backgroundColor: Colors.surface,
  },
  btnRow: { flexDirection: 'row', gap: 8 },
  btnSkip: { flex: 1 },
  btnSave: { flex: 2 },
});
