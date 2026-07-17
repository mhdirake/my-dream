<img src="assets/images/icon.png" alt="My Dream" width="160">

# My Dream Native

کلاینت Android/iOS/Web پروژه My Dream با Expo Router و TypeScript. Laravel
تنها API عمومی برنامه است؛ Native مستقیماً به MySQL، ScyllaDB، Centrifugo API
یا Keycloak Admin API متصل نمی‌شود.

## قابلیت‌های اصلی

- ثبت‌نام، ورود و onboarding پروفایل
- Swipe، پیشنهاد روزانه، Anonymous Interest و AI Match برای Gold
- چت مستقیم realtime و Group Chat اشتراکی
- کیف پول، خرید، هدیه و callback idempotent
- اعلان درون‌اپی و Expo Push با deep-link و mark-read
- حفاظت سراسری screenshot/capture در build دستگاه
- تجربه‌ی RTL، فونت و اعداد فارسی

## راه‌اندازی توسعه

نیازمندی‌ها: Node.js 20، npm و یک Backend توسعه.

```bash
cp .env.example .env.local
npm ci
npx expo start
```

Push و screenshot protection باید روی development/release build و دستگاه
واقعی بررسی شوند؛ Expo Go معیار پذیرش این قابلیت‌ها نیست.

## متغیرهای عمومی

```env
EXPO_PUBLIC_API_URL=https://api.example.com
EXPO_PUBLIC_MEDIA_URL=https://media.example.com
```

هر متغیر `EXPO_PUBLIC_*` داخل bundle قابل مشاهده است؛ بنابراین secret، password،
Keycloak client secret، کلید Centrifugo یا credential registry هرگز با این prefix
تعریف نمی‌شود. login/refresh فقط از endpointهای Laravel انجام می‌شود.

## Route و callback

- scheme برنامه `mobile://` و شناسه Android/iOS برابر `mydream.app` است.
- payment callback پس از بازگشت وضعیت تراکنش را poll و wallet را refetch می‌کند.
- tap اعلان سیستم‌عامل از route resolver مشترک اعلان داخلی استفاده می‌کند.
- Group Chat فقط برای Silver/Gold و AI Match فقط برای Gold قابل دسترسی است.

## کنترل کیفیت و CI

Pipeline شاخه `main` این مراحل را اجرا می‌کند:

1. typecheck و lint تعیین‌شده در target تست Docker؛
2. build وب و استقرار روی runner01 (`127.0.0.1:8081`)؛
3. build APK روی runner Android؛
4. انتشار artifact و کپی اتمی APK روی runner01.

هیچ registry credential در build argument ذخیره نمی‌شود؛ build وب آن‌ها را فقط
به‌صورت BuildKit secret دریافت می‌کند.

قرارداد ownership، endpointها، realtime JWT، ترتیب startup و متغیرهای چهار
محصول در `docs/INTEGRATION.md` مخزن Backend مرجع است. تغییر payload مشترک باید
هم‌زمان در typeهای `src/lib/api` و تست Backend ثبت شود.
