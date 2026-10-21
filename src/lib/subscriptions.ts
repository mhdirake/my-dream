export const subscriptionStatus = (value:string):string => ({active:'فعال',queued:'در صف فعال‌سازی',expired:'پایان‌یافته',cancelled:'لغوشده'} as Record<string,string>)[value] ?? 'نامشخص';
export const subscriptionSource = (value:string|null):string => ({payment_transaction:'خرید',subscription_gift:'هدیه',referral_reward:'جایزهٔ معرف',backoffice:'اعطای مدیریتی',admin:'اعطای مدیریتی'} as Record<string,string>)[value ?? ''] ?? 'منبع نامشخص';
export function subscriptionDate(value:string|null):string {
 if (!value || Number.isNaN(Date.parse(value))) return 'نامشخص';
 return new Intl.DateTimeFormat('fa-IR-u-ca-persian',{year:'numeric',month:'long',day:'numeric'}).format(new Date(value));
}
