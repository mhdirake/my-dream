import { toJalaali } from 'jalaali-js';

const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

const PERSIAN_SHORT_MONTHS = [
  'فرو',
  'ارد',
  'خرد',
  'تیر',
  'مرد',
  'شهر',
  'مهر',
  'آبا',
  'آذر',
  'دی',
  'بهم',
  'اسف',
];

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, digit => '۰۱۲۳۴۵۶۷۸۹'[+digit]);
}

export function formatPersianTime(iso: string): string {
  const d = new Date(iso);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return toPersianDigits(`${hours}:${minutes}`);
}

export function formatPersianDate(
  iso: string,
  options: { year?: boolean; month?: 'long' | 'short'; time?: boolean } = {},
): string {
  const d = new Date(iso);
  const j = toJalaali(d);
  const months = options.month === 'short' ? PERSIAN_SHORT_MONTHS : PERSIAN_MONTHS;
  const parts = [
    toPersianDigits(j.jd),
    months[j.jm - 1],
  ];

  if (options.year) {
    parts.push(toPersianDigits(j.jy));
  }

  const date = parts.join(' ');
  return options.time ? `${date}، ${formatPersianTime(iso)}` : date;
}
