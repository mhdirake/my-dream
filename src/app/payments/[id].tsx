import { AppBar } from '@/components/ui/AppBar';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { paymentsApi, type PaymentStatusDetail } from '@/lib/api/payments';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from '@/lib/toast';
import { useLocalSearchParams } from 'expo-router';
import { CheckCircle2, CircleAlert, Clock, Coins, ReceiptText } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const toPersian = (value: number | string) =>
  String(value).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

const TYPE_LABEL: Record<PaymentStatusDetail['purchase_type'], string> = {
  subscription: 'اشتراک',
  gold_badge: 'نشان طلایی',
  gold_badge_gift: 'هدیه نشان طلایی',
  coin_bundle: 'بسته سکه',
  subscription_gift: 'هدیه اشتراک',
};

const STATUS_LABEL: Record<PaymentStatusDetail['status'], string> = {
  pending: 'در انتظار',
  requested: 'در انتظار پرداخت',
  verified: 'تایید شده',
  completed: 'تکمیل شده',
  failed: 'ناموفق',
};

function formatAmount(amount: number, currency: string) {
  return `${toPersian(amount.toLocaleString('fa-IR'))} ${currency}`;
}

export default function PaymentDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session } = useAuth();
  const [detail, setDetail] = useState<PaymentStatusDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const paymentId = useMemo(() => Number(id), [id]);

  useEffect(() => {
    const token = session?.accessToken;
    if (!token || !Number.isFinite(paymentId) || paymentId <= 0) return;

    let active = true;
    // A new payment identifier starts a new status request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    paymentsApi.getStatus(token, paymentId)
      .then(data => {
        if (active) setDetail(data);
      })
      .catch(e => {
        if (active) toast.error(e.message ?? 'خطا در دریافت پرداخت');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [paymentId, session?.accessToken]);

  const isFailed = detail?.status === 'failed';
  const isCompleted = detail?.status === 'completed' || detail?.status === 'verified';
  const StatusIcon = isFailed ? CircleAlert : isCompleted ? CheckCircle2 : Clock;
  const statusColor = isFailed ? Colors.danger : isCompleted ? Colors.ok : Colors.goldDeep;

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="جزئیات پرداخت" back />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : !detail ? (
        <View style={styles.center}>
          <ReceiptText size={42} color={Colors.ph} strokeWidth={1.5} />
          <Text style={styles.emptyTxt}>پرداخت پیدا نشد</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.summary}>
            <View style={[styles.statusIcon, { backgroundColor: statusColor + '18' }]}>
              <StatusIcon size={24} color={statusColor} strokeWidth={2.1} />
            </View>
            <Text style={styles.statusTxt}>{STATUS_LABEL[detail.status] ?? detail.status}</Text>
            <Text style={styles.amountTxt}>{formatAmount(detail.amount, detail.currency)}</Text>
          </View>

          <View style={styles.infoBox}>
            <InfoRow label="نوع پرداخت" value={TYPE_LABEL[detail.purchase_type] ?? detail.purchase_type} />
            <InfoRow label="شناسه پرداخت" value={toPersian(detail.id)} />
            {detail.reference_id ? <InfoRow label="کد پیگیری" value={toPersian(detail.reference_id)} /> : null}
            {detail.gateway_transaction_id ? <InfoRow label="تراکنش درگاه" value={toPersian(detail.gateway_transaction_id)} /> : null}
            {detail.feature_access_until ? <InfoRow label="دسترسی تا" value={toPersian(new Date(detail.feature_access_until).toLocaleDateString('fa-IR'))} /> : null}
            {detail.gold_badge_until ? <InfoRow label="نشان طلایی تا" value={toPersian(new Date(detail.gold_badge_until).toLocaleDateString('fa-IR'))} /> : null}
          </View>

          <View style={styles.walletBox}>
            <Coins size={18} color={Colors.goldDeep} strokeWidth={2} />
            <Text style={styles.walletTxt}>موجودی فعلی: {toPersian(detail.coin_balance)} سکه</Text>
          </View>

          {detail.failure_message ? (
            <Text style={styles.failureTxt}>{detail.failure_message}</Text>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoValue}>{value}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTxt: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.inkSoft },
  content: { padding: Spacing.lg, paddingBottom: 40, gap: 14 },
  summary: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.hair,
  },
  statusIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statusTxt: { fontSize: 15, fontFamily: Fonts.extraBold, color: Colors.ink },
  amountTxt: { fontSize: 18, fontFamily: Fonts.extraBold, color: Colors.goldDeep, marginTop: 6 },
  infoBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.hair,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: Platform.select({ web: 'row-reverse', default: 'row' }),
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.hair,
  },
  infoLabel: { flexShrink: 0, fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.muted, textAlign: 'right' },
  infoValue: { flex: 1, minWidth: 0, fontSize: 12.5, fontFamily: Fonts.bold, color: Colors.ink, textAlign: 'left' },
  walletBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.goldSoft,
    borderRadius: Radius.lg,
    padding: 14,
  },
  walletTxt: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.goldDeep },
  failureTxt: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.danger,
    lineHeight: 18,
    textAlign: 'right',
  },
});
