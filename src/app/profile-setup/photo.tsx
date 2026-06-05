import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { onboardingApi } from '@/lib/api/onboarding';
import { router } from 'expo-router';
import { Camera, CheckCircle, Image as ImageIcon, Upload } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const GUIDELINES = [
  'چهره شما به‌وضوح دیده شود',
  'بدون فیلتر سنگین یا ماسک',
  'بدون عکس افراد مشهور یا کارتونی',
  'بدون محتوای نامناسب',
];

export default function PhotoScreen() {
  const { session } = useAuth();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const pickImage = () => {
    Alert.alert(
      'انتخاب عکس',
      'برای انتخاب عکس از کتابخانه یا دوربین استفاده کن',
      [
        { text: 'لغو', style: 'cancel' },
        {
          text: 'ادامه',
          onPress: () => {
            setPhotoUri('placeholder');
          },
        },
      ],
    );
  };

  const handleNext = async () => {
    if (!session?.accessToken) return;
    if (!photoUri) {
      router.push('/profile-setup/account-ready' as any);
      return;
    }
    setError('');
    setUploading(true);
    try {
      if (photoUri !== 'placeholder') {
        await onboardingApi.uploadPhoto(session.accessToken, photoUri);
      }
      router.push('/profile-setup/account-ready' as any);
    } catch (e: any) {
      setError(e.message ?? 'خطا در آپلود عکس');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <Stepper step={3} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>عکس پروفایل</Text>
        <Text style={styles.sub}>آخرین مورد ضروری. باید چهره واضح داشته باشد.</Text>

        <View style={styles.photoArea}>
          <Pressable onPress={pickImage} style={styles.photoCircle}>
            {photoUri && photoUri !== 'placeholder' ? (
              <Image source={{ uri: photoUri }} style={styles.photoImage} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <ImageIcon size={36} color={Colors.muted} strokeWidth={1.5} />
                <Text style={styles.photoPlaceholderText}>اضافه کردن عکس</Text>
              </View>
            )}
          </Pressable>
          {photoUri && (
            <View style={styles.cameraBtn}>
              <Camera size={16} color="#fff" strokeWidth={2} />
            </View>
          )}
        </View>

        <View style={styles.actionRow}>
          <Button variant="outline" onPress={pickImage} full={false} style={styles.actionBtn}>
            <Upload size={15} color={Colors.ink} strokeWidth={2} />
            انتخاب از گالری
          </Button>
          <Button variant="ghost" onPress={pickImage} full={false} style={styles.actionBtn}>
            <Camera size={15} color={Colors.ink} strokeWidth={2} />
            گرفتن عکس
          </Button>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Card soft style={styles.guidelinesCard}>
          <Text style={styles.guidelinesTitle}>چه چیزی قابل قبول است؟</Text>
          {GUIDELINES.map((g, i) => (
            <View key={i} style={styles.guidelineRow}>
              <CheckCircle size={13} color={Colors.ok} strokeWidth={2.5} />
              <Text style={styles.guidelineText}>{g}</Text>
            </View>
          ))}
        </Card>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.btnRow}>
          <Button
            variant="ghost"
            onPress={() => router.back()}
            full={false}
            style={styles.btnBack}
          >
            قبلی
          </Button>
          <Button
            variant="accent"
            onPress={handleNext}
            disabled={uploading}
            full={false}
            style={styles.btnNext}
          >
            {uploading ? 'در حال آپلود…' : photoUri ? 'آپلود و ادامه' : 'رد کردن'}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Stepper({ step }: { step: number }) {
  const total = 3;
  const toPersian = (n: number) =>
    String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);
  return (
    <View style={styles.stepper}>
      <View style={styles.stepperTop}>
        <View style={styles.badge}>
          <CheckCircle size={11} color={Colors.accent} strokeWidth={2.5} />
          <Text style={styles.badgeText}>اطلاعات ضروری</Text>
        </View>
        <Text style={styles.stepCounter}>
          مرحله {toPersian(step)} از {toPersian(total)}
        </Text>
      </View>
      <View style={styles.bars}>
        {Array.from({ length: total }).map((_, i) => (
          <View key={i} style={[styles.stepBar, i < step ? styles.barFilled : styles.barEmpty]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  stepper: {
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
    backgroundColor: Colors.surface,
  },
  stepperTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 9,
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.accentSoft, paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: Radius.pill,
  },
  badgeText: { fontSize: 10.5, fontFamily: Fonts.extraBold, color: Colors.accent },
  stepCounter: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular },
  bars: { flexDirection: 'row', gap: 6 },
  stepBar: { flex: 1, height: 6, borderRadius: Radius.pill },
  barFilled: { backgroundColor: Colors.accent },
  barEmpty: { backgroundColor: 'rgba(36,33,42,0.08)' },
  content: { padding: Spacing.xl, paddingBottom: 30, alignItems: 'center' },
  title: {
    fontSize: 19, fontFamily: Fonts.extraBold, color: Colors.ink,
    letterSpacing: -0.3, marginBottom: 4, alignSelf: 'flex-start',
  },
  sub: {
    fontSize: 12, color: Colors.muted, fontFamily: Fonts.regular,
    marginBottom: 24, alignSelf: 'flex-start',
  },
  photoArea: { position: 'relative', marginBottom: 20 },
  photoCircle: {
    width: 160, height: 160, borderRadius: 80,
    overflow: 'hidden', borderWidth: 2, borderColor: Colors.lineSoft,
    borderStyle: 'dashed',
  },
  photoImage: { width: '100%', height: '100%' },
  photoPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.ph2, gap: 8,
  },
  photoPlaceholderText: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.regular },
  cameraBtn: {
    position: 'absolute', bottom: 8, right: 8,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.surface,
  },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 16, width: '100%' },
  actionBtn: { flex: 1 },
  error: {
    fontSize: 12, color: Colors.danger, fontFamily: Fonts.regular,
    marginBottom: 8, alignSelf: 'flex-start',
  },
  guidelinesCard: { width: '100%', padding: 14 },
  guidelinesTitle: {
    fontSize: 12, fontFamily: Fonts.bold, color: Colors.ink, marginBottom: 10,
  },
  guidelineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  guidelineText: { fontSize: 12, color: Colors.inkSoft, fontFamily: Fonts.regular, flex: 1 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.lineSoft,
    backgroundColor: Colors.surface,
  },
  btnRow: { flexDirection: 'row', gap: 8 },
  btnBack: { flex: 1 },
  btnNext: { flex: 2 },
});
