import { isValidJalaaliDate, toGregorian } from 'jalaali-js';

// Token rotation is not a new editing session: never hydrate over an open draft.
export class IdentityHydration {
  private scope: string | null = null;
  private loaded = false;

  needsLoad(scope: string): boolean {
    if (scope !== this.scope) {
      this.scope = scope;
      this.loaded = false;
    }
    return !this.loaded;
  }

  complete(scope: string): void {
    if (scope === this.scope) this.loaded = true;
  }
}

export function normalizeDateDigits(value: string): string {
  return value.replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/\D/g, '');
}

export function identityBirthDate(year: string, month: string, day: string, today = new Date()): string | null {
  if (year.length !== 4 || !month || !day) return null;
  const jy = Number(year), jm = Number(month), jd = Number(day);
  if (jy < 1000 || jy > 3177) return null;
  if (!isValidJalaaliDate(jy, jm, jd)) return null;
  const { gy, gm, gd } = toGregorian(jy, jm, jd);
  const age = today.getFullYear() - gy - (
    today.getMonth() + 1 < gm || (today.getMonth() + 1 === gm && today.getDate() < gd) ? 1 : 0
  );
  if (age < 18) return null;
  return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
}

export function identityDisplayName(firstName: string | null | undefined, lastName: string | null | undefined): string {
  return [firstName?.trim(), lastName?.trim()].filter(Boolean).join(' ');
}
