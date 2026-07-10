import { Avatar } from '@/components/ui/Avatar';
import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { KeyboardAvoider } from '@/components/ui/KeyboardAvoider';
import { KeyboardStickyBar } from '@/components/ui/KeyboardStickyBar';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { giftsApi } from '@/lib/api/gifts';
import { paymentsApi } from '@/lib/api/payments';
import { searchApi, type SearchUser } from '@/lib/api/search';
import { toast } from '@/lib/toast';
import { router, useLocalSearchParams } from 'expo-router';
import { Coins, MessageSquare, Search, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

export default function SendGiftScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const params = useLocalSearchParams<{
    giftId: string;
    giftTitle: string;
    giftEmoji: string;
    coinPrice: string;
    userId: string;
    userName: string;
  }>();

  const [coins, setCoins] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingCoins, setLoadingCoins] = useState(true);

  const hasParamUser = !!params.userId;
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const coinPrice = Number(params.coinPrice ?? 0);
  const recipientId = hasParamUser ? Number(params.userId) : selectedUser?.id ?? null;
  const recipientName = hasParamUser
    ? (params.userName ?? `کاربر #${params.userId}`)
    : selectedUser
      ? `${selectedUser.first_name}${selectedUser.last_name ? ` ${selectedUser.last_name}` : ''}`
      : null;

  useEffect(() => {
    if (!session?.accessToken) return;
    paymentsApi.getWallet(session.accessToken)
      .then(w => setCoins(w.coin_balance))
      .catch(() => {})
      .finally(() => setLoadingCoins(false));
  }, [session?.accessToken]);

  useEffect(() => {
    if (hasParamUser) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      if (!session?.accessToken) return;
      setSearching(true);
      try {
        const res = await searchApi.search(session.accessToken, query.trim());
        setResults(res.data);
      } catch {
        // silent
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, session?.accessToken, hasParamUser]);

  const afterBalance = coins !== null ? coins - coinPrice : null;
  const canSend = recipientId !== null && (coins ?? 0) >= coinPrice && !sending;

  const handleSend = async () => {
    if (!session?.accessToken || !params.giftId || recipientId === null) return;
    setSending(true);
    try {
      await giftsApi.send(
        session.accessToken,
        Number(params.giftId),
        recipientId,
        note.trim() || undefined,
      );
      toast.success('هدیه با موفقیت ارسال شد!');
      router.back();
    } catch (e: any) {
      toast.error(e.message ?? 'خطا در ارسال هدیه');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="ارسال هدیه" back />

      <KeyboardAvoider>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Gift preview */}
        <Card soft style={styles.giftCard}>
          <Text style={styles.giftEmoji}>{params.giftEmoji ?? '🎁'}</Text>
          <View style={styles.giftInfo}>
            <Text style={styles.giftTitle}>{params.giftTitle ?? 'هدیه'}</Text>
            <View style={styles.priceRow}>
              <Coins size={13} color={Colors.goldDeep} strokeWidth={2} />
              <Text style={styles.priceTxt}>{toPersian(coinPrice)} سکه</Text>
            </View>
          </View>
        </Card>

        {/* Recipient */}
        {hasParamUser ? (
          <Card soft style={styles.recipientCard}>
            <Text style={styles.recipientLabel}>گیرنده</Text>
            <Text style={styles.recipientName}>{recipientName}</Text>
          </Card>
        ) : selectedUser ? (
          <Card soft style={styles.recipientCard}>
            <View style={styles.recipientRow}>
              <Avatar
                size={44}
                name={selectedUser.first_name}
                photoUrl={selectedUser.profile_photo?.urls?.thumbnail ?? null}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.recipientLabel}>گیرنده</Text>
                <Text style={styles.recipientName}>{recipientName}</Text>
                <Text style={styles.recipientUsername}>@{selectedUser.username}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedUser(null)} hitSlop={8}>
                <X size={16} color={Colors.muted} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </Card>
        ) : (
          <View>
            <Text style={styles.blockTitle}>گیرنده هدیه</Text>
            <View style={styles.searchInputWrap}>
              <Search size={15} color={Colors.muted} strokeWidth={2} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="جستجو با نام یا نام کاربری…"
                placeholderTextColor={Colors.muted}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searching && <ActivityIndicator size="small" color={Colors.accent} />}
            </View>
            {results.length > 0 && (
              <View style={styles.resultsList}>
                {results.map(u => (
                  <TouchableOpacity
                    key={u.id}
                    style={styles.resultRow}
                    onPress={() => { setSelectedUser(u); setQuery(''); setResults([]); }}
                    activeOpacity={0.7}
                  >
                    <Avatar
                      size={38}
                      name={u.first_name}
                      photoUrl={u.profile_photo?.urls?.thumbnail ?? null}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultName}>
                        {u.first_name}{u.last_name ? ` ${u.last_name}` : ''}
                      </Text>
                      <Text style={styles.resultUsername}>@{u.username}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {query.trim().length >= 2 && !searching && results.length === 0 && (
              <Text style={styles.searchEmpty}>کاربری پیدا نشد</Text>
            )}
          </View>
        )}

        {/* Note */}
        <View style={styles.noteWrap}>
          <View style={styles.noteHeader}>
            <MessageSquare size={14} color={Colors.muted} strokeWidth={2} />
            <Text style={styles.noteLabel}>پیام همراه هدیه (اختیاری)</Text>
          </View>
          <TextInput
            style={styles.noteInput}
            placeholder="یه پیام کوتاه بنویس..."
            placeholderTextColor={Colors.muted}
            multiline
            numberOfLines={3}
            maxLength={255}
            value={note}
            onChangeText={setNote}
            textAlignVertical="top"
          />
          <Text style={styles.noteCount}>{toPersian(note.length)}/۲۵۵</Text>
        </View>

        {/* Balance */}
        <Card soft style={styles.balanceCard}>
          {loadingCoins ? (
            <ActivityIndicator color={Colors.gold} size="small" />
          ) : (
            <>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>موجودی فعلی</Text>
                <View style={styles.balanceAmt}>
                  <Coins size={13} color={Colors.goldDeep} strokeWidth={2} />
                  <Text style={styles.balanceAmtTxt}>{toPersian(coins ?? 0)} سکه</Text>
                </View>
              </View>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>هزینه هدیه</Text>
                <Text style={styles.balanceCost}>- {toPersian(coinPrice)} سکه</Text>
              </View>
              <View style={[styles.balanceRow, styles.balanceFinal]}>
                <Text style={styles.balanceFinalLabel}>موجودی بعد از ارسال</Text>
                <Text style={[styles.balanceFinalAmt, (afterBalance ?? 0) < 0 && styles.balanceInsuff]}>
                  {afterBalance !== null ? `${toPersian(afterBalance)} سکه` : '—'}
                </Text>
              </View>
              {(afterBalance ?? 0) < 0 && (
                <Text style={styles.insuffNote}>سکه کافی نداری — لطفاً اول سکه بخر.</Text>
              )}
            </>
          )}
        </Card>

        <View style={{ height: 100 }} />
      </ScrollView>
      </KeyboardAvoider>

      <KeyboardStickyBar style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Button
          variant="accent"
          disabled={!canSend}
          onPress={handleSend}
        >
          {sending ? 'در حال ارسال…' : 'تأیید و ارسال'}
        </Button>
        {recipientId === null && (
          <Text style={styles.bottomNote}>گیرنده مشخص نشده</Text>
        )}
      </KeyboardStickyBar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, gap: 14 },

  giftCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  giftEmoji: { fontSize: 40 },
  giftInfo: { flex: 1, gap: 4 },
  giftTitle: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.ink },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  priceTxt: { fontSize: 12.5, fontFamily: Fonts.bold, color: Colors.goldDeep },

  recipientCard: {},
  recipientLabel: { fontSize: 10.5, color: Colors.muted, fontFamily: Fonts.regular, marginBottom: 4 },
  recipientName: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.ink },
  recipientUsername: { fontSize: 11.5, fontFamily: Fonts.regular, color: Colors.muted, marginTop: 2 },
  recipientRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  blockTitle: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.ink, marginBottom: 10 },
  searchInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.hair,
    paddingHorizontal: Spacing.md, height: 46,
  },
  searchIcon: { flexShrink: 0 },
  searchInput: {
    flex: 1, fontSize: 13.5, fontFamily: Fonts.regular,
    color: Colors.ink, height: 46, paddingVertical: 0,
  },
  resultsList: {
    marginTop: 8, backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.hair, overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.hair,
  },
  resultName: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.ink },
  resultUsername: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.muted, marginTop: 2 },
  searchEmpty: {
    fontSize: 12, fontFamily: Fonts.regular, color: Colors.muted,
    textAlign: 'center', marginTop: 10,
  },

  noteWrap: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.hair, padding: Spacing.md,
  },
  noteHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  noteLabel: { fontSize: 11.5, fontFamily: Fonts.semiBold, color: Colors.muted },
  noteInput: {
    fontSize: 13, fontFamily: Fonts.regular, color: Colors.ink,
    minHeight: 72, paddingTop: 0,
  },
  noteCount: { fontSize: 10, color: Colors.muted, fontFamily: Fonts.regular, textAlign: 'left', marginTop: 4 },

  balanceCard: { gap: 2 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  balanceLabel: { fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.inkSoft },
  balanceAmt: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  balanceAmtTxt: { fontSize: 12.5, fontFamily: Fonts.bold, color: Colors.goldDeep },
  balanceCost: { fontSize: 12.5, fontFamily: Fonts.bold, color: Colors.danger },
  balanceFinal: { borderTopWidth: 1, borderTopColor: Colors.hair, marginTop: 4, paddingTop: 10 },
  balanceFinalLabel: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.ink },
  balanceFinalAmt: { fontSize: 13, fontFamily: Fonts.extraBold, color: Colors.ok },
  balanceInsuff: { color: Colors.danger },
  insuffNote: { fontSize: 11, color: Colors.danger, fontFamily: Fonts.regular, marginTop: 4 },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.lineSoft,
    backgroundColor: Colors.surface, gap: 6,
  },
  bottomNote: { fontSize: 11, color: Colors.muted, textAlign: 'center', fontFamily: Fonts.regular },
});
