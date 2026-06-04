const FA = '۰۱۲۳۴۵۶۷۸۹';
const AR = '٠١٢٣٤٥٦٧٨٩';

export function toEnDigits(str: string): string {
  return str
    .split('')
    .map(ch => {
      const fi = FA.indexOf(ch);
      if (fi !== -1) return String(fi);
      const ai = AR.indexOf(ch);
      if (ai !== -1) return String(ai);
      return ch;
    })
    .join('');
}
