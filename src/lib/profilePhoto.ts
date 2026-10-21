export function photoStatusLabel(status: string | null | undefined): string {
  return ({ pending: 'در انتظار بررسی', needs_review: 'نیازمند بررسی دستی', approved: 'تأییدشده', rejected: 'ردشده' } as Record<string, string>)[status ?? ''] ?? 'عکسی ثبت نشده';
}
