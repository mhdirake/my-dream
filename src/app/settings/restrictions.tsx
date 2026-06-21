import { AppBar } from '@/components/ui/AppBar';
import { Card } from '@/components/ui/Card';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { profileApi } from '@/lib/api/profile';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from '@/lib/toast';
import { AlertTriangle, CheckCircle, Clock, Flag, ShieldOff, XCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

const LEVELS = [
  { level: 1, days: 1 },
  { level: 2, days: 2 },
  { level: 3, days: 3 },
  { level: 4, days: 7 },
  { level: 5, days: 10 },
  { level: 6, days: 15 },
  { level: 7, days: 20 },
  { level: 8, days: 30 },
  { level: 9, days: null },
];

function daysRemaining(until: string): number {
  const ms = new Date(until).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${toPersian(d.getFullYear())}/${toPersian(d.getMonth() + 1).padStart(2, '۰')}/${toPersian(d.getDate()).padStart(2, '۰')}`;
}

type Status = 'clean' | 'restricted' | 'banned';

export default function RestrictionsScreen() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status>('clean');
  const [restrictedUntil, setRestrictedUntil] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) return;
    profileApi.getProfile(session.accessToken)
      .then(profile => {
        if (profile.is_banned) {
          setStatus('banned');
        } else if (profile.is_restricted && profile.restricted_until) {
          setStatus('restricted');
          setRestrictedUntil(profile.restricted_until);
        } else {
          setStatus('clean');
        }
      })
      .catch(e => toast.error(e.message ?? 'خطا در بارگذاری'))
      .finally(() => setLoading(false));
  }, [session?.accessToken]);

  const remaining = restrictedUntil ? daysRemaining(restrictedUntil) : 0;

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="محدودیت‌ها" back />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Status card */}
          {status === 'clean' && (
            <View style={[styles.statusCard, styles.statusClean]}>
              <CheckCircle size={28} color={Colors.ok} strokeWidth={2} />
              <View style={styles.statusText}>
                <Text style={styles.statusTitle}>حساب شما سالم است</Text>
                <Text style={styles.statusSub}>هیچ محدودیت فعالی ندارید</Text>
              </View>
            </View>
          )}

          {status === 'restricted' && (
            <View style={[styles.statusCard, styles.statusWarn]}>
              <Clock size={28} color={Colors.gold} strokeWidth={2} />
              <View style={styles.statusText}>
                <Text style={[styles.statusTitle, { color: Colors.goldDeep }]}>حساب محدود شده</Text>
                <Text style={styles.statusSub}>
                  {toPersian(remaining)} روز تا پایان محدودیت
                </Text>
              </View>
            </View>
          )}

          {status === 'banned' && (
            <View style={[styles.statusCard, styles.statusBan]}>
              <XCircle size={28} color={Colors.danger} strokeWidth={2} />
              <View style={styles.statusText}>
                <Text style={[styles.statusTitle, { color: Colors.danger }]}>بن دائمی</Text>
                <Text style={styles.statusSub}>حساب شما به صورت دائمی مسدود شده است</Text>
              </View>
            </View>
          )}

          {/* Restriction detail */}
          {status === 'restricted' && restrictedUntil && (
            <Card soft>
              <Text style={styles.detailLabel}>تاریخ رفع محدودیت</Text>
              <Text style={styles.detailVal}>{formatDate(restrictedUntil)}</Text>
              <View style={styles.divider} />
              <Text style={styles.detailNote}>
                در طول محدودیت، امکان شروع مکالمه جدید و ارسال پیام به افراد جدید وجود ندارد.
              </Text>
            </Card>
          )}

          {status === 'banned' && (
            <Card soft>
              <Text style={styles.detailNote}>
                حساب شما به دلیل تخلفات مکرر و دریافت گزارش‌های معتبر متعدد به صورت دائمی مسدود شده است.
                برای اعتراض با پشتیبانی تماس بگیرید.
              </Text>
            </Card>
          )}

          {/* How it works */}
          <Text style={styles.sectionTitle}>سیستم محدودیت چطور کار می‌کنه؟</Text>

          <Card soft>
            <View style={styles.ruleRow}>
              <Flag size={14} color={Colors.danger} strokeWidth={2} />
              <Text style={styles.ruleTxt}>
                دریافت <Text style={styles.ruleBold}>۳ گزارش معتبر</Text> در یک روز → محدودیت فعال می‌شه
              </Text>
            </View>
            <View style={styles.ruleRow}>
              <AlertTriangle size={14} color={Colors.gold} strokeWidth={2} />
              <Text style={styles.ruleTxt}>
                هر بار که محدودیت تکرار بشه، مدت آن طولانی‌تر می‌شه
              </Text>
            </View>
            <View style={styles.ruleRow}>
              <ShieldOff size={14} color={Colors.danger} strokeWidth={2} />
              <Text style={styles.ruleTxt}>
                در نهایت محدودیت دائمی (بن) اعمال می‌شه
              </Text>
            </View>
          </Card>

          {/* Escalation scale */}
          <Text style={styles.sectionTitle}>مراحل پلکانی</Text>

          <View style={styles.scaleWrap}>
            {LEVELS.map((l, i) => {
              const isPermanent = l.days === null;
              const isLast = i === LEVELS.length - 1;
              const fillColor = isPermanent ? Colors.danger
                : i < 3 ? Colors.ok
                : i < 6 ? Colors.gold
                : Colors.danger + 'CC';

              return (
                <View key={l.level} style={styles.scaleRow}>
                  <View style={styles.scaleLeft}>
                    <View style={[styles.scaleDot, { backgroundColor: fillColor }]} />
                    {!isLast && <View style={[styles.scaleLine, { backgroundColor: fillColor + '55' }]} />}
                  </View>
                  <View style={styles.scaleInfo}>
                    <Text style={styles.scaleLevel}>سطح {toPersian(l.level)}</Text>
                    <Text style={[styles.scaleDays, { color: fillColor }]}>
                      {isPermanent ? 'بن دائمی' : `${toPersian(l.days!)} روز`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Tips */}
          <Text style={styles.sectionTitle}>چطور از محدودیت جلوگیری کنیم؟</Text>
          <Card soft style={styles.tipsCard}>
            {[
              'با احترام با دیگران صحبت کن',
              'محتوای نامناسب ارسال نکن',
              'از ارسال پیام‌های تکراری و مزاحم خودداری کن',
              'پروفایل واقعی و صادقانه داشته باش',
            ].map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <View style={styles.tipDot} />
                <Text style={styles.tipTxt}>{tip}</Text>
              </View>
            ))}
          </Card>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.xl, gap: 12 },

  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: Radius.xl, padding: Spacing.xl,
    borderWidth: 1.5,
  },
  statusClean: { backgroundColor: Colors.okSoft + '80', borderColor: Colors.ok + '60' },
  statusWarn:  { backgroundColor: Colors.goldSoft,      borderColor: Colors.gold + '80' },
  statusBan:   { backgroundColor: '#FFF1F0',             borderColor: Colors.danger + '60' },

  statusText: { flex: 1 },
  statusTitle: { fontSize: 15, fontFamily: Fonts.extraBold, color: Colors.ink },
  statusSub:   { fontSize: 12, fontFamily: Fonts.regular, color: Colors.inkSoft, marginTop: 3 },

  detailLabel: { fontSize: 10.5, color: Colors.muted, fontFamily: Fonts.regular, marginBottom: 4 },
  detailVal:   { fontSize: 16, fontFamily: Fonts.extraBold, color: Colors.ink },
  divider:     { height: 1, backgroundColor: Colors.hair, marginVertical: 10 },
  detailNote:  { fontSize: 12, color: Colors.inkSoft, fontFamily: Fonts.regular, lineHeight: 19 },

  sectionTitle: {
    fontSize: 11, fontFamily: Fonts.extraBold, color: Colors.muted,
    marginTop: Spacing.md, marginBottom: 2,
  },

  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  ruleTxt: { flex: 1, fontSize: 12.5, color: Colors.inkSoft, fontFamily: Fonts.regular, lineHeight: 19 },
  ruleBold: { fontFamily: Fonts.bold, color: Colors.ink },

  scaleWrap: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.hair, padding: Spacing.lg,
  },
  scaleRow: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 36 },
  scaleLeft: { width: 24, alignItems: 'center' },
  scaleDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  scaleLine: { width: 2, flex: 1, marginTop: 2 },
  scaleInfo: { flex: 1, paddingHorizontal: 12, paddingBottom: 4 },
  scaleLevel: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.inkSoft },
  scaleDays: { fontSize: 11, fontFamily: Fonts.bold, marginTop: 1 },

  tipsCard: { gap: 0 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.ok, marginTop: 5 },
  tipTxt: { flex: 1, fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.inkSoft, lineHeight: 20 },
});
