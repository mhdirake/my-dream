// Canonical palette shared with my-dream-landing.
export const BrandPalette = {
  bg: '#080A0E',
  bgSoft: '#0C0F14',
  surface: '#10131A',
  surface2: '#171B23',
  surface3: '#1D222B',
  text: '#F4F1EC',
  muted: '#A5A9B2',
  mutedStrong: '#C3C6CC',
  rose: '#D18498',
  roseSoft: '#E5ADBB',
  roseHot: '#FF6F9F',
  violet: '#9F82FF',
  aqua: '#7CE2D1',
  champagne: '#D6BE91',
  trust: '#769D96',
} as const;

export const Colors = {
  // ── Brand palette ──────────────────────────────────────────────
  accent: BrandPalette.roseHot,
  accentMuted: BrandPalette.rose,
  accentSoft: 'rgba(255,111,159,0.14)',
  purple: BrandPalette.violet,
  purpleSoft: 'rgba(159,130,255,0.14)',
  trust: BrandPalette.aqua,
  trustSoft: 'rgba(124,226,209,0.14)',
  ok: BrandPalette.trust,
  okSoft: 'rgba(118,157,150,0.16)',
  gold: BrandPalette.champagne,
  goldDeep: '#B89A66',
  goldSoft: 'rgba(214,190,145,0.15)',
  danger: '#F07A8C',
  dangerSoft: 'rgba(240,122,140,0.14)',
  warn: BrandPalette.champagne,
  warnSoft: 'rgba(214,190,145,0.15)',

  // ── Surfaces ────────────────────────────────────────────────────
  bg: BrandPalette.bg,
  bgSoft: BrandPalette.bgSoft,
  surface: BrandPalette.surface,
  surface2: BrandPalette.surface2,
  surface3: BrandPalette.surface3,
  ph: BrandPalette.surface2,
  ph2: BrandPalette.bgSoft,

  // ── Text ────────────────────────────────────────────────────────
  ink: BrandPalette.text,
  inkSoft: BrandPalette.mutedStrong,
  muted: BrandPalette.muted,
  onAccent: '#180F13',
  onAqua: '#0A1714',
  onChampagne: '#17120C',

  // ── Lines ────────────────────────────────────────────────────────
  line: 'rgba(255,255,255,0.14)',
  lineSoft: 'rgba(255,255,255,0.08)',
  hair: 'rgba(255,255,255,0.08)',

  // ── Dark surfaces ────────────────────────────────────────────────
  dark: BrandPalette.bg,
  dark2: BrandPalette.surface,
  darkCard: 'rgba(255,255,255,0.06)',

  // ── Gradients (as arrays for LinearGradient) ────────────────────
  gradColors: [BrandPalette.roseHot, BrandPalette.violet] as [string, string],
  gradSoftColors: ['rgba(255,111,159,0.14)', 'rgba(159,130,255,0.14)'] as [string, string],
} as const;

export const Fonts = {
  regular: 'Vazirmatn-Regular',
  semiBold: 'Vazirmatn-SemiBold',
  bold: 'Vazirmatn-Bold',
  extraBold: 'Vazirmatn-ExtraBold',
} as const;

export const Radius = {
  sm: 8,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;
