import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { profileSetupStore } from '@/lib/profileSetupStore';
import { router } from 'expo-router';
import { CheckCircle } from 'lucide-react-native';
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

type Gender = 'female' | 'male' | 'prefer_not_to_say';
const GENDERS: { key: Gender; label: string }[] = [
  { key: 'female', label: 'زن' },
  { key: 'male', label: 'مرد' },
  { key: 'prefer_not_to_say', label: 'ترجیح می‌دم نگم' },
];

const toPersian = (n: number | string) =>
  String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

export default function BasicInfoScreen() {
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);

  const birthDate =
    year.length === 4 && month.length >= 1 && day.length >= 1
      ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      : null;

  const canContinue = name.trim().length >= 2 && !!birthDate && !!gender;

  const handleNext = () => {
    profileSetupStore.set({
      first_name: name.trim(),
      birth_date: birthDate!,
      gender: gender!,
    });
    router.push('/profile-setup/location' as any);
  };

  return (
    <SafeAreaView style={styles.root}>
      <Stepper step={1} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>اطلاعات پایه</Text>
        <Text style={styles.sub}>فقط چند مورد ضروری — بقیه بعداً</Text>

        <Field
          label="نام"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <Text style={styles.fieldLabel}>تاریخ تولد (میلادی)</Text>
        <View style={styles.dateRow}>
          <TextInput
            style={[styles.dateInput, styles.dateField]}
            value={year}
            onChangeText={v => setYear(v.replace(/\D/g, '').slice(0, 4))}
            placeholder="سال"
            placeholderTextColor={Colors.muted}
            keyboardType="numeric"
            maxLength={4}
            textAlign="center"
          />
          <TextInput
            style={[styles.dateInput, styles.dateField]}
            value={month}
            onChangeText={v => setMonth(v.replace(/\D/g, '').slice(0, 2))}
            placeholder="ماه"
            placeholderTextColor={Colors.muted}
            keyboardType="numeric"
            maxLength={2}
            textAlign="center"
          />
          <TextInput
            style={[styles.dateInput, styles.dateField]}
            value={day}
            onChangeText={v => setDay(v.replace(/\D/g, '').slice(0, 2))}
            placeholder="روز"
            placeholderTextColor={Colors.muted}
            keyboardType="numeric"
            maxLength={2}
            textAlign="center"
          />
        </View>
        <Text style={styles.hint}>مثلاً ۱۹۹۸ / ۰۶ / ۱۵</Text>

        <Text style={styles.fieldLabel}>جنسیت</Text>
        <View style={styles.genderRow}>
          {GENDERS.map(g => (
            <Pressable
              key={g.key}
              onPress={() => setGender(g.key)}
              style={[styles.genderChip, gender === g.key && styles.genderChipActive]}
            >
              {gender === g.key && (
                <CheckCircle size={13} color={Colors.accent} strokeWidth={2.5} />
              )}
              <Text style={[styles.genderLabel, gender === g.key && styles.genderLabelActive]}>
                {g.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button variant="accent" onPress={handleNext} disabled={!canContinue}>
          ادامه
        </Button>
      </View>
    </SafeAreaView>
  );
}

function Stepper({ step }: { step: number }) {
  const total = 3;
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
          <View
            key={i}
            style={[styles.stepBar, i < step ? styles.stepBarFilled : styles.stepBarEmpty]}
          />
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
  stepBarFilled: { backgroundColor: Colors.accent },
  stepBarEmpty: { backgroundColor: 'rgba(36,33,42,0.08)' },
  content: { padding: Spacing.xl, paddingBottom: 30 },
  title: {
    fontSize: 19, fontFamily: Fonts.extraBold, color: Colors.ink,
    letterSpacing: -0.3, marginBottom: 4,
  },
  sub: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.regular, marginBottom: 20 },
  fieldLabel: { fontSize: 12, color: Colors.inkSoft, marginBottom: 7, fontFamily: Fonts.semiBold },
  dateRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  dateField: { flex: 1 },
  dateInput: {
    flex: 1,
    writingDirection: "rtl",
    width: "33%",
    borderWidth: 1.5, borderColor: Colors.lineSoft, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 12, fontSize: 14,
    fontFamily: Fonts.regular, color: Colors.ink, backgroundColor: Colors.surface,
  },
  hint: { fontSize: 10.5, color: Colors.muted, fontFamily: Fonts.regular, marginBottom: 20 },
  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  genderChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1.5, borderColor: Colors.lineSoft, borderRadius: Radius.pill,
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: Colors.surface,
  },
  genderChipActive: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft },
  genderLabel: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.inkSoft },
  genderLabelActive: { color: Colors.accent, fontFamily: Fonts.semiBold },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.lineSoft,
    backgroundColor: Colors.surface,
  },
});
