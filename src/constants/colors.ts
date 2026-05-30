export const Colors = {
  // ── Brand palette ──────────────────────────────────────────────
  accent: '#D94F70',       // Deep Rose — primary CTA, likes
  accentSoft: '#FCE8ED',
  purple: '#6C4AB6',       // Royal Purple — AI features
  purpleSoft: '#EDE7F8',
  trust: '#4E9AF1',        // Soft Blue — verification
  trustSoft: '#E6F0FD',
  ok: '#37C6A3',           // Mint Green — online, success
  okSoft: '#E2F7F1',
  gold: '#F5B84B',         // Soft Gold — coin, premium
  goldDeep: '#D9982E',
  goldSoft: '#FEF3DD',
  danger: '#E0556B',
  dangerSoft: '#FBE7EA',
  warn: '#F5B84B',
  warnSoft: '#FEF3DD',

  // ── Surfaces ────────────────────────────────────────────────────
  bg: '#FFF7F3',           // Warm Ivory — app background
  surface: '#FFFFFF',
  ph: '#F0E6E1',           // placeholder
  ph2: '#FBF3EF',

  // ── Text ────────────────────────────────────────────────────────
  ink: '#24212A',          // Charcoal
  inkSoft: '#56525E',
  muted: '#9A95A2',

  // ── Lines ───────────────────────────────────────────────────────
  line: '#24212A',
  lineSoft: '#ECE2DC',
  hair: 'rgba(36,33,42,0.08)',

  // ── Dark mode ───────────────────────────────────────────────────
  dark: '#181522',
  dark2: '#221E30',
  darkCard: 'rgba(255,255,255,0.06)',

  // ── Gradients (as arrays for LinearGradient) ────────────────────
  gradColors: ['#D94F70', '#6C4AB6'] as [string, string],
  gradSoftColors: ['#FCE8ED', '#EDE7F8'] as [string, string],
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
