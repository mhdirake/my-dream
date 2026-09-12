import { Colors } from '@/constants/colors';
import type { ClientProfile } from '@/lib/api/profile';
import { Shield, Sparkles, Users } from 'lucide-react-native';

export type Tier = {
  slug: string;
  kind: 'check' | 'ai' | 'community';
  icon: React.ReactNode;
  title: string;
  sub: string;
  color: string;
  softColor: string;
  requirements: string[];
};

/** The three verification tiers shown on `/verification` and next to the username on `/me`. */
export const TIERS: Tier[] = [
  {
    slug: 'basic_verified',
    kind: 'check',
    icon: <Shield size={20} color={Colors.trust} strokeWidth={2} />,
    title: 'تأیید پایه',
    sub: 'اولین مرحله احراز هویت',
    color: Colors.trust,
    softColor: Colors.trustSoft,
    requirements: [
      'موبایل تأیید شده',
      'نام واقعی ثبت شده',
      'عکس پروفایل تأیید شده توسط AI',
    ],
  },
  {
    slug: 'ai_trusted',
    kind: 'ai',
    icon: <Sparkles size={20} color={Colors.ok} strokeWidth={2} />,
    title: 'AI Trusted',
    sub: 'اعتماد هوش مصنوعی',
    color: Colors.ok,
    softColor: Colors.okSoft,
    requirements: [
      'گفتگو با بیش از ۳۰ نفر',
      'رفتار ارتباطی سالم و احترام‌آمیز',
      'بدون گزارش تخلف معتبر',
      'تأیید توسط سیستم AI',
    ],
  },
  {
    slug: 'community_verified',
    kind: 'community',
    icon: <Users size={20} color={Colors.purple} strokeWidth={2} />,
    title: 'Community Verified',
    sub: 'تأیید جامعه کاربری',
    color: Colors.purple,
    softColor: Colors.purpleSoft,
    requirements: [
      'حداقل ۲ ماه عضویت فعال',
      'گفتگو با بیش از ۵۰ نفر',
      'هیچ گزارش تخلف معتبری نداشته باشی',
      'تأیید نهایی توسط تیم پشتیبانی',
    ],
  },
];

/** Minimal shape both `ClientProfile` (own profile) and `UserProfile` (someone else's) satisfy. */
type BadgeBearer = { badges: { slug?: string }[] };

export function hasBadge(profile: BadgeBearer | null | undefined, slug: string): boolean {
  if (!profile) return false;
  return profile.badges.some(b => (b.slug ?? '') === slug || (b.slug ?? '').includes(slug.split('_')[0]));
}

/** Per-requirement completion. Derivable only for the basic tier; others follow the tier badge. */
export function reqDone(tierSlug: string, idx: number, p: ClientProfile | null | undefined, earned: boolean): boolean {
  if (earned) return true;
  if (tierSlug === 'basic_verified' && p) {
    if (idx === 0) return !!p.mobile;
    if (idx === 1) return !!p.first_name;
    if (idx === 2) return p.profile_photo_status === 'approved';
  }
  return false;
}
