# My Dream Mobile — Task List
> استخراج از wireframe رسمی (My Dream Wireframes.html)  
> آخرین بررسی کد: 2026-06-14  
> پالت: `#D94F70` Deep Rose · `#6C4AB6` Royal Purple · `#4E9AF1` Soft Blue · `#FFF7F3` Warm Ivory · `#24212A` Charcoal · `#37C6A3` Mint Green · `#F5B84B` Soft Gold

---

## 🎨 سیستم طراحی (Design System)

- [x] **DS-1** — `src/constants/colors.ts` با پالت رسمی ۷ رنگ برند (کامل)
- [x] **DS-2** — `FloatingTabBar` — island کپسولی شناور، `_layout.tsx` با `LinearGradient` Deep Rose→Royal Purple
- [x] **DS-3** — `Badge` — pill آیکون+لیبل: Basic/AI Trusted/Community/Gold/Complete/Personality/Warn
- [ ] **DS-4** — کامپوننت `BottomSheet` — rounded top، drag handle، blur overlay، sections
- [ ] **DS-5** — کامپوننت `GlassCard` — blur، semi-transparent، border نرم (الان inline style است)
- [x] **DS-6** — `CoinIcon` — از `Coins` lucide (نه `$`)
- [x] **DS-7** — Typography hierarchy — `Fonts` در `colors.ts`: Regular/SemiBold/Bold/ExtraBold

---

## 01 · Onboarding

- [x] **ONB-1** — طراحی با Warm Ivory background و input های rounded
- [x] **ONB-2** — Step indicator با progress bar رنگی
- [x] **ONB-3** — Microcopy فارسی دوستانه روی فرم‌ها
- [x] **ONB-4** — Splash — لوگو + loading

---

## 02 · Profile Setup

- [x] **PS-1** — Relationship Goal — chip های بصری (`rel-goal.tsx`)
- [x] **PS-2** — Lifestyle Tags — chip های multi-select دسته‌بندی‌شده (`lifestyle.tsx`)
- [x] **PS-3** — Profile Completion % — progress bar در stepper
- [x] **PS-4** — Account Ready — صفحه پایانی (`account-ready.tsx`)
- [ ] **PS-5** — Photo Upload — سه وضعیت AI: **Reviewing** (در حال بررسی) / **Approved** / **Rejected** — الان فقط upload هست

---

## 03 · Discover

- [x] **DIS-1** — `SwipeProfileCard` — photo-first با glass info overlay، نام/سن/شهر/goal/badge/compat%/tags
- [x] **DIS-2** — `ActionButtons` — Pass/Gift/Like (Deep Rose)/Chat با heart pulse animation
- [x] **DIS-3** — `ModeSwitch` — تب Swipe / پیشنهاد روزانه / AI Match
- [ ] **DIS-4** — `SwipeLimit` — صفحه رسیدن به سقف Swipe روزانه + پیشنهاد ارتقا (الان فقط text خالی)
- [x] **DIS-5** — `DailySuggestions` — کارت‌های روزانه با Compatibility % و دکمه‌های کلیک
- [ ] **DIS-6** — `Filters` — bottom sheet: سن، جنسیت (Silver+)، استان/شهر (Silver+)، هدف رابطه
- [x] **DIS-7** — `AIMatch` — placeholder lock screen برای کاربران Gold
- [x] **DIS-8** — `DiscoverEmpty` — وضعیت خالی بودن pool

---

## 04 · Profile View

- [x] **PV-1** — `GalleryHeader` — هدر عکس بزرگ با gradient
- [x] **PV-2** — Glass info overlay — نام، سن، شهر، badge ها
- [x] **PV-3** — سه نمای متمایز: **Basic** (محدود + upsell) / **Silver** (Lifestyle Match Ring + تگ‌های مشترک + زبان + مذهبی) / **Gold** (Compatibility Score Ring + prompt answers + personality test)
- [x] **PV-4** — `CompatCard` — صفحه مستقل `/user/compatibility.tsx`
- [x] **PV-5** — `RedFlagWarning` — AlertTriangle با هشدار Dealbreaker
- [x] **PV-6** — `ActionBar` — Pass / Gift / Chat gradient / Like — طبق دیزاین
- [ ] **PV-7** — بخش‌های تکمیلی پروفایل: Voice Intro player · Gifts روی پروفایل · Trust/Verification section
- [x] **PV-8** — `ProfileActionsSheet` — BottomSheet دکمه MoreVertical در header: اشتراک‌گذاری · هدیه · علاقه ناشناس · AI Insight · بلاک · گزارش

---

## 05 · Likes & Anonymous Interest

- [x] **LK-1** — `LikesInbox` — grid دریافتی + blur ناشناس + compat %
- [x] **LK-2** — کارت reveal/upgrade به Gold
- [x] **LK-3** — `AnonSent` — لیست علاقه ناشناس فرستاده‌شده (ساده)
- [x] **LK-4** — `AnonReceived` — ترکیب‌شده در همان grid
- [ ] **LK-5** — `AnonReveal` — flow خرید با سکه + انیمیشن reveal هویت
- [ ] **LK-6** — `MatchCreated` — صفحه Match! با انیمیشن دو قلب

---

## 06 · Chat

- [x] **CH-1** — `ChatList` — تب‌های همه / درخواست‌ها (تب Groups نشده)
- [x] **CH-2** — `TemplateMessageModal` — انتخاب پیام اول از template
- [x] **CH-3** — `AwaitingAccept` — pending banner بعد از ارسال درخواست
- [x] **CH-4** — `IncomingRequest` — Accept/Reject در ChatList
- [x] **CH-5** — `ChatHeader` — نام + avatar
- [x] **CH-6** — `Bubble` RTL — حباب پیام با زمان
- [x] **CH-7** — `ChatInput` — composer floating + locked state برای pending
- [ ] **CH-8** — `ConvMenu` — منوی پیوست (voice/sticker/gift/image) به‌صورت bottom sheet
- [ ] **CH-9** — `MsgLimit` — هشدار رسیدن به سقف پیام روزانه (Basic: ۱۰)
- [ ] **CH-10** — `ModWarning` — هشدار نرم AI Moderation
- [ ] **CH-11** — `ChatLocked` — نمای کامل چت قفل‌شده (بعد از ban/report)
- [ ] **CH-12** — `ReportSheet` — bottom sheet گزارش با دسته‌بندی‌ها
- [ ] **CH-13** — `GroupList` — تب Groups در ChatList
- [ ] **CH-14** — `GroupChat` — صفحه Group Chat

---

## 07 · Gifts & Coin Wallet

- [x] **GF-1** — `GiftStore` — grid هدایا با emoji و نوع (ساده/خفن/ویژه/افسانه‌ای)
- [ ] **GF-2** — Legendary/Limited gift — glow premium + تمایز بصری
- [ ] **GF-3** — `GiftDetail` — صفحه جزئیات gift مثل product detail
- [x] **GF-4** — `GiftModal` (SendGift) — modal ارسال gift
- [ ] **GF-5** — `GiftReceived` — نمایش gift دریافتی در چت (bubble نوع gift)
- [ ] **GF-6** — `GiftsOnProfile` — نمایش gift ها روی پروفایل + Pin/Hide
- [x] **GF-7** — `Wallet` — نمایش موجودی سکه در gifts tab (با Coins icon)
- [ ] **GF-8** — `BuyCoins` — صفحه/modal خرید بسته‌های سکه
- [ ] **GF-9** — `GiftSub` — هدیه دادن اشتراک به دوست

---

## 08 · Viewed Me (کی منو دیده)

- [x] **VM-1** — `LockedView` — blur rows + تعداد بازدیدکنندگان
- [x] **VM-2** — Upsell/upgrade button در locked view
- [x] **VM-3** — Timeline — نام + زمان + avatar کلیک‌پذیر
- [ ] **VM-4** — `ViewedDeleted` — نمایش "کاربر حذف شده" برای deleted profiles

---

## 09 · Verification & Badges

- [ ] **VR-1** — `VerifOverview` — نمای کلی سه سطح: Basic / AI Trusted / Community Verified
- [ ] **VR-2** — `AITrusted` — progress: چت با X از ۳۰ نفر
- [ ] **VR-3** — `CommunityProgress` — progress: ۲ ماه + ۵۰ گفتگوی +۱۰۰ پیامی
- [ ] **VR-4** — `BadgeEarned` — صفحه badge دریافتی با sparkle animation
- [ ] **VR-5** — `AllBadges` — نمایش همه badge های کاربر

---

## 10 · Subscription

- [ ] **SUB-1** — `PlansCompare` — مقایسه سه پلن: Basic (ساده) / Silver (آبی/نقره‌ای) / Gold (navy/purple تیره + اکسنت طلایی)
- [ ] **SUB-2** — `SilverDetail` — صفحه Silver با feature list و CTA
- [ ] **SUB-3** — `GoldDetail` — Gold با surface تیره، طلایی فقط در border/badge/glow (نه کل‌زرد)
- [ ] **SUB-4** — `Checkout` — پرداخت با خلاصه پلن
- [ ] **SUB-5** — `GoldBadgeBuy` — تمایز Gold Badge (نشان نمایشی) از Gold Subscription

---

## 12 · AI Features

- [ ] **AI-1** — `InsightLocked` — نمای قفل AI Insight با توضیح + خرید با سکه
- [ ] **AI-2** — `InsightSelf` — AI Insight خودم: سبک ارتباطی، نرخ پاسخ، نقاط قوت (progress ring)
- [ ] **AI-3** — `InsightOther` — AI Insight کاربر دیگر (با سکه): ۳–۵ بولت + ring سازگاری
- [ ] **AI-4** — `CoachChat` — AI Coach: کمک به Bio، پیشنهاد جواب سوالات، feedback پروفایل
- [ ] **AI-5** — `BioHelper` — ابزار کمک به نوشتن Bio (داخل Coach)

---

## 13 · Privacy & Settings

- [ ] **PRV-1** — `SettingsMain` — صفحه تنظیمات: حساب / حریم خصوصی / ایمنی / اشتراک / کیف پول
- [ ] **PRV-2** — `PrivacySettings` — نمایش لوکیشن، مخفی کردن Gift/تست شخصیت
- [ ] **PRV-3** — `SafeMode` — toggle با shield animation + توضیح
- [ ] **PRV-4** — `TrustGate` — Trust-Based Messaging Control (Silver+)
- [ ] **PRV-5** — `ScreenshotBlocked` — overlay "Screenshot مسدود شد"
- [ ] **PRV-6** — `BlockList` — لیست مسدودشده‌ها + unblock

---

## 14 · Moderation

- [ ] **MOD-1** — `Restrict1` — هشدار اول محدودیت
- [ ] **MOD-2** — `RestrictedState` — نمای محدودیت فعال: سقف + مدت باقی‌مانده
- [ ] **MOD-3** — `BannedState` — صفحه بن دائمی
- [ ] **MOD-4** — `AdminReview` — اطلاعیه "حساب در دست بررسی ادمین"

---

## 15 · Referral

- [ ] **REF-1** — `ReferralScreen` — dashboard: لینک/کد، progress پلکانی (۳→۵→۱۰ نفر)، پاداش‌ها، تاریخچه

---

## 16 · Notifications & Search

- [ ] **NOT-1** — `Notifications` — اعلان‌ها با دسته‌بندی: Match / Like / Gift / Chat / System
- [ ] **NOT-2** — `SearchScreen` — جستجوی کاربر با username

---

## 🌙 Dark Mode

- [ ] **DRK-1** — dark theme: Discover، Profile، Chat، Subscription، Gift، Wallet، Safe Mode، AI
- [ ] **DRK-2** — floating tab bar در dark mode با premium glow

---

## ✨ Micro-interactions

- [x] **MX-1** — Like: heart pulse (`Animated.spring` در ActionButtons)
- [ ] **MX-2** — Match: دو قلب/کارت با glow ملایم
- [ ] **MX-3** — Gift reveal: glow animation
- [ ] **MX-4** — Badge earned: sparkle animation
- [ ] **MX-5** — Profile Completion: progress ring انیمیت‌شده
- [ ] **MX-6** — Safe Mode: shield activation animation
- [ ] **MX-7** — Chat accepted: lock opens
- [ ] **MX-8** — AI Match: shimmer ظریف
- [ ] **MX-9** — Swipe card: smooth movement با رنگ feedback

---

## خلاصه پیشرفت

| بخش | کل | انجام‌شده | باقی‌مانده |
|-----|----|-----------|------------|
| Design System | 7 | 5 | 2 |
| Onboarding | 4 | 4 | 0 ✅ |
| Profile Setup | 5 | 4 | 1 |
| Discover | 8 | 6 | 2 |
| Profile View | 8 | 7 | 1 |
| Likes & Anon | 6 | 4 | 2 |
| Chat | 14 | 7 | 7 |
| Gifts & Coin | 9 | 3 | 6 |
| Viewed Me | 4 | 3 | 1 |
| Verification | 5 | 0 | 5 |
| Subscription | 5 | 0 | 5 |
| AI Features | 5 | 0 | 5 |
| Privacy | 6 | 0 | 6 |
| Moderation | 4 | 0 | 4 |
| Referral | 1 | 0 | 1 |
| Notifications | 2 | 0 | 2 |
| Dark Mode | 2 | 0 | 2 |
| Micro-interactions | 9 | 1 | 8 |
| **جمع** | **114** | **44 (39%)** | **70 (61%)** |

---

> **اولویت پیشنهادی:**  
> DS-4,5 (BottomSheet/GlassCard) → CH-8,12 (ConvMenu/Report) → GF-2,3,5,6 → PV-3,7,8 → SUB → VR → AI → PRV → MOD → REF → NOT → Dark → MX
