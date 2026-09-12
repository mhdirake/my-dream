import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { Sheet } from '@/components/ui/Sheet';
import { profileApi, type BioTone } from '@/lib/api/profile';
import { useAuth } from '@/lib/auth/AuthContext';
import { RefreshCw } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Props = {
  visible: boolean;
  currentBio?: string;
  onSelect: (bio: string) => void;
  onClose: () => void;
};

const TONES: { value: BioTone; label: string }[] = [
  { value: 'friendly', label: 'صمیمی' },
  { value: 'serious', label: 'جدی' },
  { value: 'playful', label: 'شوخ‌طبع' },
  { value: 'calm', label: 'آرام' },
];

export function BioHelperModal({ visible, currentBio, onSelect, onClose }: Props) {
  const { session } = useAuth();
  const token = session?.accessToken ?? '';

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [tone, setTone] = useState<BioTone>('friendly');

  const fetch = async (t: BioTone = tone) => {
    setLoading(true);
    setSelected(null);
    try {
      const data = await profileApi.getBioSuggestions(token, t, currentBio);
      setSuggestions(data.slice(0, 3));
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTone = (t: BioTone) => {
    if (loading || t === tone) return;
    setTone(t);
    fetch(t);
  };

  useEffect(() => {
    if (visible) fetch();
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUse = () => {
    if (selected) {
      onSelect(selected);
      onClose();
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="پیشنهاد بیو با هوش مصنوعی"
      contentStyle={styles.content}
      footer={
        <View style={styles.footerRow}>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => fetch()} disabled={loading} activeOpacity={0.8}>
            <RefreshCw size={14} color={loading ? Colors.muted : Colors.inkSoft} strokeWidth={2} />
            <Text style={[styles.refreshTxt, loading && { color: Colors.muted }]}>رفرش</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.useBtn, !selected && styles.useBtnDisabled]}
            onPress={handleUse}
            disabled={!selected}
            activeOpacity={0.85}
          >
            <Text style={styles.useTxt}>استفاده از این بیو</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <Text style={styles.sub}>یکی از پیشنهادها رو انتخاب کن یا رفرش کن</Text>

      <View style={styles.toneRow}>
        {TONES.map(t => (
          <TouchableOpacity
            key={t.value}
            style={[styles.toneChip, tone === t.value && styles.toneChipActive]}
            onPress={() => handleTone(t.value)}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={[styles.toneTxt, tone === t.value && styles.toneTxtActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.purple} />
          <Text style={styles.loadingTxt}>در حال ساخت پیشنهادها…</Text>
        </View>
      ) : suggestions.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.errorTxt}>پیشنهادی دریافت نشد. دوباره امتحان کن.</Text>
        </View>
      ) : (
        suggestions.map((s, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.card, selected === s && styles.cardSelected]}
            onPress={() => setSelected(s)}
            activeOpacity={0.8}
          >
            <View style={styles.cardCheck}>
              {selected === s && <View style={styles.checkDot} />}
            </View>
            <Text style={[styles.cardTxt, selected === s && styles.cardTxtSelected]}>{s}</Text>
          </TouchableOpacity>
        ))
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },

  sub: {
    fontSize: 12, fontFamily: Fonts.regular, color: Colors.muted,
    paddingBottom: 4, textAlign: 'right',
  },

  content: { gap: 10 },

  toneRow: {
    flexDirection: 'row', gap: 8, paddingTop: 4,
  },
  toneChip: {
    borderWidth: 1.5, borderColor: Colors.hair,
    borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: Colors.surface,
  },
  toneChipActive: { borderColor: Colors.purple, backgroundColor: Colors.purple + '10' },
  toneTxt: { fontSize: 12.5, fontFamily: Fonts.semiBold, color: Colors.inkSoft },
  toneTxtActive: { color: Colors.purple },

  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.hair,
    padding: Spacing.md,
  },
  cardSelected: { borderColor: Colors.purple, backgroundColor: Colors.purple + '08' },
  cardCheck: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1.5, borderColor: Colors.lineSoft,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 2,
  },
  checkDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.purple,
  },
  cardTxt: {
    flex: 1, fontSize: 13.5, fontFamily: Fonts.regular,
    color: Colors.ink, lineHeight: 21, textAlign: 'right',
  },
  cardTxtSelected: { color: Colors.ink },

  loadingTxt: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.muted },
  errorTxt: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.inkSoft, textAlign: 'center' },

  footerRow: {
    flexDirection: 'row', gap: 10,
  },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1.5, borderColor: Colors.hair,
    borderRadius: Radius.pill, paddingHorizontal: 16, paddingVertical: 12,
  },
  refreshTxt: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.inkSoft },
  useBtn: {
    flex: 1, backgroundColor: Colors.purple,
    borderRadius: Radius.pill, paddingVertical: 13,
    alignItems: 'center',
  },
  useBtnDisabled: { backgroundColor: Colors.lineSoft },
  useTxt: { fontSize: 14, fontFamily: Fonts.bold, color: '#fff' },
});
