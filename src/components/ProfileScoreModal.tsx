import { Colors, Fonts, Radius } from '@/constants/colors';
import { Sheet } from '@/components/ui/Sheet';
import type { QualityBreakdownItem } from '@/lib/api/profile';
import {
  ArrowUpRight,
  BadgeCheck,
  Brain,
  Camera,
  CircleCheckBig,
  ClipboardList,
  MessageSquareText,
  PenLine,
  ShieldCheck,
  Tags,
  Target,
  type LucideIcon,
} from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type Props = {
  visible: boolean;
  score: number;
  breakdown: QualityBreakdownItem[] | undefined;
  onClose: () => void;
  onCompleteProfile?: () => void;
};

const toPersian = (n: number | string) =>
  String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

const META: Record<string, { label: string; icon: LucideIcon; hint: string }> = {
  completion: { label: 'تکمیل پروفایل', icon: ClipboardList, hint: 'فیلدهای خالی پروفایلت رو پر کن' },
  photo: { label: 'عکس پروفایل', icon: Camera, hint: 'یک عکس واضح آپلود کن تا تأیید بشه' },
  bio: { label: 'بیوگرافی', icon: PenLine, hint: 'حداقل ۴۰ کاراکتر درباره‌ی خودت بنویس' },
  relationship_goal: { label: 'هدف رابطه', icon: Target, hint: 'هدفت از رابطه رو مشخص کن' },
  lifestyle_tags: { label: 'سبک زندگی', icon: Tags, hint: 'حداقل ۳ تگ سبک زندگی انتخاب کن' },
  personality_test: { label: 'تست شخصیت', icon: Brain, hint: 'تست شخصیت رو کامل کن' },
  prompt_answers: { label: 'پاسخ به سؤال‌ها', icon: MessageSquareText, hint: 'به سؤال‌های پروفایل جواب بده (تا ۵ مورد)' },
  low_reports: { label: 'نبود گزارش تخلف', icon: ShieldCheck, hint: 'با رفتار سالم گزارش‌های تخلف رو صفر نگه دار' },
  clean_account: { label: 'حساب بدون محدودیت', icon: BadgeCheck, hint: 'محدودیت فعالی روی حسابت نباشه' },
};

function metaFor(key: string) {
  return META[key] ?? { label: key, icon: ClipboardList, hint: '' };
}

function Ring({ value }: { value: number }) {
  const size = 104;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const offset = circ * (1 - v / 100);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={Colors.lineSoft} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={v >= 100 ? Colors.ok : Colors.accent}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
      <Text style={styles.ringNum}>{toPersian(Math.round(v))}</Text>
      <Text style={styles.ringMax}>از ۱۰۰</Text>
    </View>
  );
}

function ImproveRow({ item }: { item: QualityBreakdownItem }) {
  const { label, icon: Icon, hint } = metaFor(item.key);
  const pct = item.max > 0 ? Math.max(0.04, Math.min(1, item.earned / item.max)) : 0;
  const gain = item.max - item.earned;

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.iconWrap}>
          <Icon size={16} color={Colors.accent} strokeWidth={2} />
        </View>
        <Text style={styles.cardLabel} numberOfLines={1}>{label}</Text>
        <View style={styles.gainPill}>
          <Text style={styles.gainTxt}>+{toPersian(gain)}</Text>
        </View>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` as `${number}%` }]} />
      </View>

      {hint ? (
        <View style={styles.hintRow}>
          <ArrowUpRight size={12} color={Colors.muted} strokeWidth={2} />
          <Text style={styles.hintTxt}>{hint}</Text>
        </View>
      ) : null}
    </View>
  );
}

function DoneRow({ item, last }: { item: QualityBreakdownItem; last: boolean }) {
  const { label, icon: Icon } = metaFor(item.key);
  return (
    <View style={[styles.doneRow, last && styles.doneRowLast]}>
      <Icon size={15} color={Colors.muted} strokeWidth={2} />
      <Text style={styles.doneLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.donePts}>{toPersian(item.max)}</Text>
      <CircleCheckBig size={15} color={Colors.ok} strokeWidth={2.4} />
    </View>
  );
}

export function ProfileScoreModal({ visible, score, breakdown, onClose, onCompleteProfile }: Props) {
  const items = breakdown ?? [];
  const earnedTotal = items.reduce((s, i) => s + i.earned, 0);
  const displayScore = items.length ? earnedTotal : score;
  const headroom = Math.max(0, 100 - displayScore);

  const improve = items
    .filter(i => i.earned < i.max)
    .sort((a, b) => (b.max - b.earned) - (a.max - a.earned));
  const done = items.filter(i => i.earned >= i.max);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="امتیاز پروفایل چطور حساب می‌شه؟"
      footer={
        onCompleteProfile && headroom > 0 ? (
          <TouchableOpacity style={styles.cta} onPress={onCompleteProfile} activeOpacity={0.85}>
            <Text style={styles.ctaTxt}>تکمیل پروفایل</Text>
            <Text style={styles.ctaGain}>+{toPersian(headroom)} امتیاز</Text>
          </TouchableOpacity>
        ) : undefined
      }
    >
      <View style={styles.hero}>
        <Ring value={displayScore} />
        <View style={[styles.statusChip, headroom === 0 && styles.statusChipDone]}>
          <Text style={[styles.statusChipTxt, headroom === 0 && styles.statusChipTxtDone]}>
            {headroom > 0 ? `↑ ${toPersian(headroom)} امتیاز قابل‌کسب` : '✓ امتیازت کامله'}
          </Text>
        </View>
        <Text style={styles.explainer}>
          هر چه پروفایلت کامل‌تر و رفتارت سالم‌تر باشه، امتیازت بالاتر می‌ره و بیشتر در نتایج و پیشنهادها دیده می‌شی.
        </Text>
      </View>

      {items.length === 0 ? (
        <Text style={styles.emptyTxt}>جزئیات امتیاز در دسترس نیست.</Text>
      ) : (
        <>
          {improve.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>می‌تونی بهترش کنی</Text>
              <View style={styles.cardList}>
                {improve.map(item => (
                  <ImproveRow key={item.key} item={item} />
                ))}
              </View>
            </View>
          ) : null}

          {done.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>کامل شده · {toPersian(done.length)} مورد</Text>
              <View style={styles.doneList}>
                {done.map((item, i) => (
                  <DoneRow key={item.key} item={item} last={i === done.length - 1} />
                ))}
              </View>
            </View>
          ) : null}
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 12, paddingTop: 4, paddingBottom: 4 },
  ringNum: { fontSize: 30, fontFamily: Fonts.extraBold, color: Colors.ink, marginTop: 6 },
  ringMax: { fontSize: 10, fontFamily: Fonts.regular, color: Colors.muted, marginTop: -2 },

  statusChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill,
    backgroundColor: Colors.accentSoft,
  },
  statusChipDone: { backgroundColor: Colors.okSoft },
  statusChipTxt: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.accent },
  statusChipTxtDone: { color: Colors.ok },

  explainer: {
    fontSize: 12, fontFamily: Fonts.regular, color: Colors.muted,
    textAlign: 'center', lineHeight: 20,
  },

  section: { gap: 10 },
  sectionTitle: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.inkSoft, textAlign: 'right' },

  cardList: { gap: 10 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.hair,
    padding: 12, gap: 9,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  iconWrap: {
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  cardLabel: { flex: 1, fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.ink, textAlign: 'right' },
  gainPill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill,
    backgroundColor: Colors.accentSoft,
  },
  gainTxt: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.accent },

  track: {
    height: 6, borderRadius: 3, backgroundColor: Colors.hair,
    overflow: 'hidden', flexDirection: 'row',
  },
  fill: { height: '100%', borderRadius: 3, minWidth: 6, backgroundColor: Colors.accent },

  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  hintTxt: { flex: 1, fontSize: 11, fontFamily: Fonts.regular, color: Colors.muted, textAlign: 'right', lineHeight: 16 },

  doneList: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.hair,
    paddingHorizontal: 12,
  },
  doneRow: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.hair,
  },
  doneRowLast: { borderBottomWidth: 0 },
  doneLabel: { flex: 1, fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.inkSoft, textAlign: 'right' },
  donePts: { fontSize: 11.5, fontFamily: Fonts.bold, color: Colors.muted },

  emptyTxt: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.muted, textAlign: 'center', paddingVertical: 24 },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.accent, borderRadius: Radius.pill, paddingVertical: 13,
  },
  ctaTxt: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.onAccent },
  ctaGain: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.onAccent, opacity: 0.7 },
});
