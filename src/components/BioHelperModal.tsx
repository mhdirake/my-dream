import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { profileApi } from '@/lib/api/profile';
import { useAuth } from '@/lib/auth/AuthContext';
import { RefreshCw, Sparkles, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  currentBio?: string;
  onSelect: (bio: string) => void;
  onClose: () => void;
};

export function BioHelperModal({ visible, currentBio, onSelect, onClose }: Props) {
  const { session } = useAuth();
  const token = session?.accessToken ?? '';

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const fetch = async () => {
    setLoading(true);
    setSelected(null);
    try {
      const data = await profileApi.getBioSuggestions(token, currentBio);
      setSuggestions(data.slice(0, 3));
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Sparkles size={16} color={Colors.purple} strokeWidth={2} />
            <Text style={styles.headerTxt}>پیشنهاد Bio از AI</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <X size={18} color={Colors.muted} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sub}>یکی از پیشنهادها رو انتخاب کن یا رفرش کن</Text>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.refreshBtn} onPress={fetch} disabled={loading} activeOpacity={0.8}>
            <RefreshCw size={14} color={loading ? Colors.muted : Colors.inkSoft} strokeWidth={2} />
            <Text style={[styles.refreshTxt, loading && { color: Colors.muted }]}>رفرش</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.useBtn, !selected && styles.useBtnDisabled]}
            onPress={handleUse}
            disabled={!selected}
            activeOpacity={0.85}
          >
            <Text style={styles.useTxt}>استفاده از این Bio</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.hair,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTxt: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.ink },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.hair,
    alignItems: 'center', justifyContent: 'center',
  },

  sub: {
    fontSize: 12, fontFamily: Fonts.regular, color: Colors.muted,
    paddingHorizontal: Spacing.lg, paddingTop: 12, paddingBottom: 4,
    textAlign: 'right',
  },

  content: { padding: Spacing.lg, gap: 10 },

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

  footer: {
    flexDirection: 'row', gap: 10,
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.hair,
    backgroundColor: Colors.surface,
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
