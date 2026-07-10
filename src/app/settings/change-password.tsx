import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { KeyboardAvoider } from '@/components/ui/KeyboardAvoider';
import { KeyboardStickyBar } from '@/components/ui/KeyboardStickyBar';
import { Colors, Spacing } from '@/constants/colors';
import { profileApi } from '@/lib/api/profile';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from '@/lib/toast';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const passwordError =
    password.length > 0 && password.length < 8 ? 'رمز جدید باید حداقل ۸ کاراکتر باشد' : undefined;
  const confirmError =
    confirm.length > 0 && confirm !== password ? 'تکرار رمز با رمز جدید یکسان نیست' : undefined;
  const sameError =
    password.length > 0 && password === current ? 'رمز جدید نباید با رمز فعلی یکسان باشد' : undefined;

  const canSubmit =
    current.length > 0 &&
    password.length >= 8 &&
    confirm === password &&
    password !== current &&
    !saving;

  const handleSubmit = async () => {
    if (!session || !canSubmit) return;
    setSaving(true);
    try {
      await profileApi.changePassword(session.accessToken, {
        current_password: current,
        password,
        password_confirmation: confirm,
      });
      toast.success('رمز عبور با موفقیت تغییر کرد');
      router.back();
    } catch (e) {
      const msg = e instanceof Error && e.message ? e.message : 'تغییر رمز انجام نشد';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AppBar title="تغییر رمز عبور" back />
      <KeyboardAvoider>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Field
          label="رمز عبور فعلی"
          value={current}
          onChangeText={setCurrent}
          placeholder="رمز فعلی را وارد کن"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Field
          label="رمز عبور جدید"
          value={password}
          onChangeText={setPassword}
          placeholder="حداقل ۸ کاراکتر"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          error={passwordError || sameError}
        />
        <Field
          label="تکرار رمز عبور جدید"
          value={confirm}
          onChangeText={setConfirm}
          placeholder="رمز جدید را دوباره وارد کن"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          error={confirmError}
        />
      </ScrollView>
      </KeyboardAvoider>
      <KeyboardStickyBar style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.xxl }]}>
        {saving ? (
          <ActivityIndicator color={Colors.accent} />
        ) : (
          <Button onPress={handleSubmit} disabled={!canSubmit}>
            ثبت رمز جدید
          </Button>
        )}
      </KeyboardStickyBar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: 120 },
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    backgroundColor: Colors.bg,
    borderTopWidth: 1,
    borderTopColor: Colors.hair,
  },
});
