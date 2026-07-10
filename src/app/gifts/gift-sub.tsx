import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { KeyboardAvoider } from '@/components/ui/KeyboardAvoider';
import { KeyboardStickyBar } from '@/components/ui/KeyboardStickyBar';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { api } from '@/lib/api/client';
import { giftsApi, type CoinGiftRecord, type SubscriptionGiftRecord } from '@/lib/api/gifts';
import { paymentsApi } from '@/lib/api/payments';
import { searchApi } from '@/lib/api/search';
import { toast } from '@/lib/toast';
import { router, useLocalSearchParams } from 'expo-router';
import { Coins, Gift, Star } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

type Plan = { id: number; name: string; slug: string; price_amount: number };

const COIN_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

const TABS = [
  { key: 'sub',  label: 'هدیه اشتراک' },
  { key: 'coin', label: 'هدیه سکه' },
] as const;

export default function GiftSubScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ tab?: string; userId?: string; userName?: string }>();

  const [tab, setTab] = useState<'sub' | 'coin'>((params.tab as any) ?? 'sub');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [coins, setCoins] = useState<number | null>(null);
  const [coinAmount, setCoinAmount] = useState(100);
  const [username, setUsername] = useState(params.userName ?? '');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [historyDir, setHistoryDir] = useState<'sent' | 'received'>('sent');
  const [subHistory, setSubHistory] = useState<{ sent: SubscriptionGiftRecord[]; received: SubscriptionGiftRecord[] } | null>(null);
  const [coinHistory, setCoinHistory] = useState<{ sent: CoinGiftRecord[]; received: CoinGiftRecord[] } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!session?.accessToken) return;
    setHistoryLoading(true);
    if (tab === 'sub' && !subHistory) {
      Promise.all([
        giftsApi.subscriptionGiftsSent(session.accessToken).catch(() => []),
        giftsApi.subscriptionGiftsReceived(session.accessToken).catch(() => []),
      ])
        .then(([sent, received]) => setSubHistory({ sent, received }))
        .finally(() => setHistoryLoading(false));
    } else if (tab === 'coin' && !coinHistory) {
      Promise.all([
        giftsApi.coinGiftsSent(session.accessToken).catch(() => []),
        giftsApi.coinGiftsReceived(session.accessToken).catch(() => []),
      ])
        .then(([sent, received]) => setCoinHistory({ sent, received }))
        .finally(() => setHistoryLoading(false));
    } else {
      setHistoryLoading(false);
    }
  }, [session?.accessToken, tab, subHistory, coinHistory]);

  useEffect(() => {
    if (!session?.accessToken) return;
    Promise.all([
      api.get<{ data: Plan[] }>('/api/lookups/subscription-plans', session.accessToken).catch(() => null),
      paymentsApi.getWallet(session.accessToken).catch(() => null),
    ])
      .then(([res, wallet]) => {
        if (res) {
          const paid = res.data.filter((p: Plan) => p.price_amount > 0);
          setPlans(paid);
          if (paid.length > 0) setSelectedPlanId(paid[0].id);
        } else {
          toast.error('خطا در بارگذاری پلن‌های اشتراک');
        }
        if (wallet) {
          setCoins(wallet.coin_balance);
        } else {
          toast.error('خطا در بارگذاری موجودی سکه');
        }
      })
      .finally(() => setLoading(false));
  }, [session?.accessToken]);

  const handleSend = async () => {
    if (!session?.accessToken) {
      toast.error('جلسه ورودت منقضی شده — دوباره وارد شو');
      return;
    }
    if (!hasUserId && !username.trim()) {
      toast.error('نام کاربری گیرنده رو وارد کن');
      return;
    }

    Alert.alert(
      'تأیید ارسال هدیه',
      tab === 'sub'
        ? `اشتراک انتخابی به @${username} هدیه داده می‌شود.`
        : `${toPersian(coinAmount)} سکه به @${username} هدیه داده می‌شود.`,
      [
        { text: 'لغو', style: 'cancel' },
        { text: 'تأیید', onPress: doSend },
      ],
    );
  };

  const resolveReceiverId = async (): Promise<number | null> => {
    if (hasUserId) return Number(params.userId);
    const cleaned = username.trim().replace(/^@/, '');
    const result = await searchApi.search(session!.accessToken, cleaned, 1);
    const match = result.data.find(u => u.username.toLowerCase() === cleaned.toLowerCase());
    return match?.id ?? null;
  };

  const doSend = async () => {
    if (!session?.accessToken) return;
    setSending(true);
    try {
      const receiverId = await resolveReceiverId();
      if (!receiverId) {
        toast.error('کاربری با این نام کاربری پیدا نشد');
        return;
      }
      if (tab === 'sub') {
        if (!selectedPlanId) return;
        await giftsApi.sendSubscriptionGift(
          session.accessToken,
          receiverId,
          selectedPlanId,
          note.trim() || undefined,
        );
        toast.success('هدیه اشتراک ارسال شد!');
      } else {
        await giftsApi.sendCoinGift(
          session.accessToken,
          receiverId,
          coinAmount,
          note.trim() || undefined,
        );
        toast.success('هدیه سکه ارسال شد!');
      }
      router.back();
    } catch (e: any) {
      toast.error(e.message ?? 'خطا در ارسال');
    } finally {
      setSending(false);
    }
  };

  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  const hasUserId = !!params.userId;

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="هدیه به دوست" back />

      <KeyboardAvoider>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.accent} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Tabs */}
          <View style={styles.tabRow}>
            {TABS.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
                onPress={() => setTab(t.key)}
              >
                <Text style={[styles.tabTxt, tab === t.key && styles.tabTxtActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recipient */}
          {!hasUserId ? (
            <Card soft>
              <Text style={styles.fieldLabel}>نام کاربری گیرنده</Text>
              <TextInput
                style={styles.input}
                placeholder="@username"
                placeholderTextColor={Colors.muted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Card>
          ) : (
            <Card soft>
              <Text style={styles.fieldLabel}>گیرنده</Text>
              <Text style={styles.recipientName}>{params.userName ?? `کاربر #${params.userId}`}</Text>
            </Card>
          )}

          {tab === 'sub' ? (
            <>
              {/* Plan selector */}
              <Text style={styles.sectionTitle}>پلن اشتراک</Text>
              {plans.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.planRow, selectedPlanId === p.id && styles.planRowActive]}
                  onPress={() => setSelectedPlanId(p.id)}
                >
                  {p.slug === 'gold' && <Star size={14} color={Colors.gold} strokeWidth={2} fill={Colors.gold} />}
                  {p.slug === 'silver' && <Gift size={14} color={Colors.trust} strokeWidth={2} />}
                  <Text style={[styles.planName, selectedPlanId === p.id && styles.planNameActive]}>
                    {p.slug === 'silver' ? 'نقره‌ای (۱ ماه)' : p.slug === 'gold' ? 'طلایی (۱ ماه)' : p.name}
                  </Text>
                  <View style={[styles.radioOuter, selectedPlanId === p.id && styles.radioOuterActive]}>
                    {selectedPlanId === p.id && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              ))}

              <Card tint="trust" style={styles.noteCard}>
                <Text style={styles.noteCardTxt}>
                  اگر گیرنده اشتراک فعال دارد، این هدیه بعد از اتمام اشتراکش اعمال می‌شود.
                </Text>
              </Card>
            </>
          ) : (
            <>
              {/* Coin amount */}
              <Text style={styles.sectionTitle}>مقدار سکه</Text>
              <View style={styles.amountGrid}>
                {COIN_AMOUNTS.map(a => (
                  <TouchableOpacity
                    key={a}
                    style={[styles.amountChip, coinAmount === a && styles.amountChipActive]}
                    onPress={() => setCoinAmount(a)}
                  >
                    <Coins size={11} color={coinAmount === a ? Colors.accent : Colors.muted} strokeWidth={2} />
                    <Text style={[styles.amountTxt, coinAmount === a && styles.amountTxtActive]}>
                      {toPersian(a)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Balance check */}
              <Card soft>
                <View style={styles.balRow}>
                  <Text style={styles.balLabel}>موجودی کیف پول</Text>
                  <Text style={styles.balAmt}>{toPersian(coins ?? 0)} سکه</Text>
                </View>
                {(coins ?? 0) < coinAmount && (
                  <Text style={styles.insuffTxt}>سکه کافی نداری</Text>
                )}
              </Card>
            </>
          )}

          {/* Note */}
          <Card soft>
            <Text style={styles.fieldLabel}>پیام همراه هدیه (اختیاری)</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="یه پیام مهربان بنویس..."
              placeholderTextColor={Colors.muted}
              multiline
              numberOfLines={2}
              maxLength={255}
              value={note}
              onChangeText={setNote}
              textAlignVertical="top"
            />
          </Card>

          {/* History */}
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>
              {tab === 'sub' ? 'تاریخچه هدایای اشتراک' : 'تاریخچه هدایای سکه'}
            </Text>
            <View style={styles.historySeg}>
              {(['sent', 'received'] as const).map(dir => (
                <TouchableOpacity
                  key={dir}
                  style={[styles.historySegBtn, historyDir === dir && styles.historySegBtnActive]}
                  onPress={() => setHistoryDir(dir)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.historySegTxt, historyDir === dir && styles.historySegTxtActive]}>
                    {dir === 'sent' ? 'ارسال‌شده' : 'دریافت‌شده'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {historyLoading ? (
              <ActivityIndicator color={Colors.accent} style={{ paddingVertical: 16 }} />
            ) : tab === 'sub' ? (
              (subHistory?.[historyDir] ?? []).length === 0 ? (
                <Text style={styles.historyEmpty}>موردی ثبت نشده</Text>
              ) : (
                (subHistory?.[historyDir] ?? []).slice(0, 10).map(r => (
                  <View key={r.id} style={styles.historyRow}>
                    <Gift size={15} color={Colors.purple} strokeWidth={1.8} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyRowTitle}>
                        {r.subscription_plan?.name ?? r.plan_slug} — {toPersian(r.duration_days)} روز
                      </Text>
                      <Text style={styles.historyRowSub}>
                        {historyDir === 'sent'
                          ? `به ${r.receiver?.first_name ?? `@${r.receiver?.username ?? ''}`}`
                          : `از ${r.sender?.first_name ?? `@${r.sender?.username ?? ''}`}`}
                      </Text>
                    </View>
                    <Text style={[styles.historyStatus, r.status === 'granted' && styles.historyStatusOk]}>
                      {r.status === 'granted' ? 'فعال شد' : r.status === 'pending_payment' ? 'در انتظار پرداخت' : r.status === 'cancelled' ? 'لغو شده' : r.status === 'failed' ? 'ناموفق' : r.status}
                    </Text>
                  </View>
                ))
              )
            ) : (
              (coinHistory?.[historyDir] ?? []).length === 0 ? (
                <Text style={styles.historyEmpty}>موردی ثبت نشده</Text>
              ) : (
                (coinHistory?.[historyDir] ?? []).slice(0, 10).map(r => (
                  <View key={r.id} style={styles.historyRow}>
                    <Coins size={15} color={Colors.goldDeep} strokeWidth={1.8} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyRowTitle}>{toPersian(r.amount)} سکه</Text>
                      <Text style={styles.historyRowSub}>
                        {historyDir === 'sent'
                          ? `به ${r.receiver?.first_name ?? ''}`
                          : `از ${r.sender?.first_name ?? ''}`}
                      </Text>
                    </View>
                  </View>
                ))
              )
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
      </KeyboardAvoider>

      {!loading && (
        <KeyboardStickyBar style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <Button
            variant="accent"
            disabled={
              sending ||
              (tab === 'coin' && (coins ?? 0) < coinAmount) ||
              (tab === 'sub' && !selectedPlanId)
            }
            onPress={handleSend}
          >
            {sending ? 'در حال ارسال…' : 'ارسال هدیه'}
          </Button>
        </KeyboardStickyBar>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  historySection: { marginTop: 8, gap: 10 },
  historyTitle: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.ink },
  historySeg: {
    flexDirection: 'row', backgroundColor: Colors.ph2,
    borderRadius: Radius.pill, padding: 3, gap: 4,
  },
  historySegBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 7,
    borderRadius: Radius.pill,
  },
  historySegBtnActive: { backgroundColor: Colors.surface },
  historySegTxt: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.muted },
  historySegTxtActive: { color: Colors.ink },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.hair,
  },
  historyRowTitle: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.ink },
  historyRowSub: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.muted, marginTop: 2 },
  historyStatus: { fontSize: 11, fontFamily: Fonts.semiBold, color: Colors.muted },
  historyStatusOk: { color: Colors.ok },
  historyEmpty: {
    fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.muted,
    textAlign: 'center', paddingVertical: 14,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.lg, gap: 14 },

  tabRow: {
    flexDirection: 'row', backgroundColor: Colors.ph2,
    borderRadius: Radius.md, padding: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: Radius.sm - 2, alignItems: 'center' },
  tabBtnActive: { backgroundColor: Colors.surface },
  tabTxt: { fontSize: 12.5, fontFamily: Fonts.semiBold, color: Colors.muted },
  tabTxtActive: { color: Colors.ink },

  fieldLabel: { fontSize: 10.5, color: Colors.muted, fontFamily: Fonts.regular, marginBottom: 6 },
  input: {
    fontSize: 14, fontFamily: Fonts.regular, color: Colors.ink,
    borderBottomWidth: 1, borderBottomColor: Colors.hair, paddingBottom: 6,
  },
  recipientName: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.ink },

  sectionTitle: { fontSize: 12, fontFamily: Fonts.extraBold, color: Colors.ink },

  planRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.hair, padding: Spacing.md,
  },
  planRowActive: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft },
  planName: { flex: 1, fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.inkSoft },
  planNameActive: { color: Colors.ink },
  radioOuter: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: Colors.muted,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterActive: { borderColor: Colors.accent },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent },

  noteCard: {},
  noteCardTxt: { fontSize: 12, color: '#2C5C8F', fontFamily: Fonts.regular, lineHeight: 19 },

  amountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  amountChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 9,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.hair,
  },
  amountChipActive: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft },
  amountTxt: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.muted },
  amountTxtActive: { color: Colors.accent },

  balRow: { flexDirection: 'row', justifyContent: 'space-between' },
  balLabel: { fontSize: 12, color: Colors.inkSoft, fontFamily: Fonts.regular },
  balAmt: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.goldDeep },
  insuffTxt: { fontSize: 11, color: Colors.danger, fontFamily: Fonts.regular, marginTop: 6 },

  noteInput: {
    fontSize: 13, fontFamily: Fonts.regular, color: Colors.ink,
    minHeight: 54, paddingTop: 0,
  },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.lineSoft,
    backgroundColor: Colors.surface,
  },
});
