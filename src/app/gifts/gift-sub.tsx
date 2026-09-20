import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { KeyboardAvoider } from '@/components/ui/KeyboardAvoider';
import { KeyboardStickyBar } from '@/components/ui/KeyboardStickyBar';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { api } from '@/lib/api/client';
import { giftsApi, type CoinGiftRecord, type SubscriptionGiftRecord } from '@/lib/api/gifts';
import { paymentsApi } from '@/lib/api/payments';
import { searchApi, type SearchUser } from '@/lib/api/search';
import { payAndWait } from '@/lib/payments/payAndWait';
import { toast } from '@/lib/toast';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Coins, Gift, Star } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
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
import { confirmSheet } from '@/lib/confirmSheet';

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
  const params = useLocalSearchParams<{ tab?: string; history?: string; userId?: string; userName?: string }>();
  const hasUserId = !!params.userId;

  const [tab, setTab] = useState<'sub' | 'coin'>((params.tab as any) ?? 'sub');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [coins, setCoins] = useState<number | null>(null);
  const [coinAmount, setCoinAmount] = useState(100);
  const [username, setUsername] = useState(params.userName ?? '');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [historyDir, setHistoryDir] = useState<'sent' | 'received'>(
    params.history === 'received' ? 'received' : 'sent',
  );
  const [subHistory, setSubHistory] = useState<{ sent: SubscriptionGiftRecord[]; received: SubscriptionGiftRecord[] } | null>(null);
  const [coinHistory, setCoinHistory] = useState<{ sent: CoinGiftRecord[]; received: CoinGiftRecord[] } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchUser[]>([]);
  const [selectedReceiverId, setSelectedReceiverId] = useState<number | null>(
    params.userId ? Number(params.userId) : null,
  );
  const [searching, setSearching] = useState(false);

  const openHistoryUser = (userId?: number) => {
    if (!userId) return;
    router.push({ pathname: '/user/[id]', params: { id: String(userId) } } as never);
  };

  useEffect(() => {
    if (params.tab === 'sub' || params.tab === 'coin') setTab(params.tab);
    if (params.history === 'sent' || params.history === 'received') setHistoryDir(params.history);
  }, [params.history, params.tab]);

  useFocusEffect(useCallback(() => {
    const token = session?.accessToken;
    if (!token) return undefined;

    let active = true;
    paymentsApi.getWallet(token)
      .then(wallet => {
        if (active) setCoins(wallet.coin_balance);
      })
      .catch(() => undefined);

    return () => { active = false; };
  }, [session?.accessToken]));

  useEffect(() => {
    const token = session?.accessToken;
    const cleaned = username.trim().replace(/^@/, '');

    if (!token || hasUserId || selectedReceiverId || cleaned.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    let active = true;
    const timeout = setTimeout(() => {
      setSearching(true);
      searchApi.search(token, cleaned, 8, 1, 'gift')
        .then(result => {
          if (active) setSuggestions(result.data);
        })
        .catch(() => {
          if (active) setSuggestions([]);
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [hasUserId, selectedReceiverId, session?.accessToken, username]);

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
    if (tab === 'coin' && (coins ?? 0) < coinAmount) {
      router.push('/gifts/buy-coins' as any);
      return;
    }

    confirmSheet.show(
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
    if (selectedReceiverId) return selectedReceiverId;
    const result = await searchApi.search(session!.accessToken, cleaned, 20, 1, 'gift');
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
        const response = await giftsApi.sendSubscriptionGift(
          session.accessToken,
          receiverId,
          selectedPlanId,
          note.trim() || undefined,
        );
        const paymentResult = await payAndWait(
          session.accessToken,
          response.payment.id,
          response.payment_url,
        );
        if (paymentResult.status === 'failed') {
          toast.error(paymentResult.detail?.failure_message ?? 'پرداخت هدیه ناموفق بود');
          return;
        }
        if (paymentResult.status === 'cancelled') {
          toast.info('پرداخت هدیه تکمیل نشد');
          return;
        }
        toast.success('هدیه اشتراک ارسال شد!');
      } else {
        const response = await giftsApi.sendCoinGift(
          session.accessToken,
          receiverId,
          coinAmount,
          note.trim() || undefined,
        );
        setCoins(response.sender_coin_balance);
        toast.success('هدیه سکه ارسال شد!');
      }
      router.back();
    } catch (e: any) {
      toast.error(e.message ?? 'خطا در ارسال');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="هدیه به دوست" back />

      <KeyboardAvoider>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.accent} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Tabs */}
          <SegmentedTabs
            value={tab}
            onChange={setTab}
            items={TABS}
            style={styles.tabRow}
          />

          {/* Recipient */}
          {!hasUserId ? (
            <Card soft>
              <Text style={styles.fieldLabel}>نام کاربری گیرنده</Text>
              <TextInput
                style={styles.input}
                placeholder="@username"
                placeholderTextColor={Colors.muted}
                value={username}
                onChangeText={value => {
                  setUsername(value);
                  setSelectedReceiverId(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searching && <ActivityIndicator size="small" color={Colors.accent} style={styles.searchLoader} />}
              {suggestions.length > 0 && (
                <View style={styles.suggestionList}>
                  {suggestions.map(user => (
                    <TouchableOpacity
                      key={user.id}
                      style={styles.suggestionRow}
                      onPress={() => {
                        setUsername(user.username);
                        setSelectedReceiverId(user.id);
                        setSuggestions([]);
                      }}
                    >
                      <View style={styles.suggestionText}>
                        <Text style={styles.suggestionName}>
                          {[user.first_name, user.last_name].filter(Boolean).join(' ')}
                        </Text>
                        <Text style={styles.suggestionUsername}>@{user.username}</Text>
                      </View>
                      {user.city && <Text style={styles.suggestionCity}>{user.city}</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
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
                  <Text style={styles.insuffTxt}>لطفاً اول سکه بخر</Text>
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
            <SegmentedTabs
              value={historyDir}
              onChange={setHistoryDir}
              items={[
                { key: 'sent', label: 'ارسال‌شده' },
                { key: 'received', label: 'دریافت‌شده' },
              ]}
              style={styles.historySeg}
            />
            {historyLoading ? (
              <ActivityIndicator color={Colors.accent} style={{ paddingVertical: 16 }} />
            ) : tab === 'sub' ? (
              (subHistory?.[historyDir] ?? []).length === 0 ? (
                <Text style={styles.historyEmpty}>موردی ثبت نشده</Text>
              ) : (
                (subHistory?.[historyDir] ?? []).slice(0, 10).map(r => (
                  <TouchableOpacity
                    key={r.id}
                    style={styles.historyRow}
                    onPress={() => openHistoryUser((historyDir === 'sent' ? r.receiver : r.sender)?.id)}
                    disabled={!(historyDir === 'sent' ? r.receiver : r.sender)}
                    activeOpacity={0.75}
                  >
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
                    {(historyDir === 'sent' ? r.receiver : r.sender) && (
                      <ChevronLeft size={16} color={Colors.muted} strokeWidth={2} />
                    )}
                  </TouchableOpacity>
                ))
              )
            ) : (
              (coinHistory?.[historyDir] ?? []).length === 0 ? (
                <Text style={styles.historyEmpty}>موردی ثبت نشده</Text>
              ) : (
                (coinHistory?.[historyDir] ?? []).slice(0, 10).map(r => (
                  <TouchableOpacity
                    key={r.id}
                    style={styles.historyRow}
                    onPress={() => openHistoryUser((historyDir === 'sent' ? r.receiver : r.sender)?.id)}
                    disabled={!(historyDir === 'sent' ? r.receiver : r.sender)}
                    activeOpacity={0.75}
                  >
                    <Coins size={15} color={Colors.goldDeep} strokeWidth={1.8} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyRowTitle}>{toPersian(r.amount)} سکه</Text>
                      <Text style={styles.historyRowSub}>
                        {historyDir === 'sent'
                          ? `به ${r.receiver?.first_name ?? ''}`
                          : `از ${r.sender?.first_name ?? ''}`}
                      </Text>
                    </View>
                    {(historyDir === 'sent' ? r.receiver : r.sender) && (
                      <ChevronLeft size={16} color={Colors.muted} strokeWidth={2} />
                    )}
                  </TouchableOpacity>
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
              (tab === 'sub' && !selectedPlanId)
            }
            onPress={handleSend}
          >
            {sending
              ? 'در حال ارسال…'
              : tab === 'coin' && (coins ?? 0) < coinAmount
                ? 'خرید سکه'
                : 'ارسال هدیه'}
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
  historySeg: { marginBottom: 0 },
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

  tabRow: { marginBottom: 0 },

  fieldLabel: { fontSize: 10.5, color: Colors.muted, fontFamily: Fonts.regular, marginBottom: 6 },
  input: {
    fontSize: 14, fontFamily: Fonts.regular, color: Colors.ink,
    borderBottomWidth: 1, borderBottomColor: Colors.hair, paddingBottom: 6,
  },
  searchLoader: { marginTop: 10 },
  suggestionList: {
    marginTop: 8, borderTopWidth: 1, borderTopColor: Colors.hair,
  },
  suggestionRow: {
    minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: Colors.hair, paddingVertical: 8,
  },
  suggestionText: { flex: 1 },
  suggestionName: { fontSize: 12.5, fontFamily: Fonts.semiBold, color: Colors.ink },
  suggestionUsername: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.accent, marginTop: 2 },
  suggestionCity: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.muted },
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
  noteCardTxt: { fontSize: 12, color: Colors.trust, fontFamily: Fonts.regular, lineHeight: 19 },

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
