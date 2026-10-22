export type DiscoveryGender = 'male' | 'female';
export type FilterLocation = { id: number; name: string };
export type DiscoveryFilterSelection = Readonly<{
  minAge: string;
  maxAge: string;
  genders: readonly DiscoveryGender[];
  province: FilterLocation | null;
  city: FilterLocation | null;
  verifiedOnly: boolean;
  personalityMatch: boolean;
}>;
export type DiscoveryFilters = {
  min_age?: number;
  max_age?: number;
  genders?: DiscoveryGender[];
  province_id?: number;
  city_id?: number;
  verified_only?: 1;
  personality_match?: 1;
};

export const EMPTY_DISCOVERY_FILTERS: DiscoveryFilterSelection = Object.freeze({
  minAge: '', maxAge: '', genders: Object.freeze([]), province: null, city: null, verifiedOnly: false, personalityMatch: false,
});

export function ageDigits(value: string): string {
  return value.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).trim();
}

export function filterErrors(selection: DiscoveryFilterSelection): Partial<Record<'minAge' | 'maxAge' | 'city', string>> {
  const errors: Partial<Record<'minAge' | 'maxAge' | 'city', string>> = {};
  for (const field of ['minAge', 'maxAge'] as const) {
    const value = ageDigits(selection[field]);
    if (value && (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 18)) {
      errors[field] = 'سن باید یک عدد صحیح و حداقل ۱۸ سال باشد.';
    }
  }
  if (!errors.minAge && !errors.maxAge && selection.minAge.trim() && selection.maxAge.trim()
    && Number(ageDigits(selection.minAge)) > Number(ageDigits(selection.maxAge))) {
    errors.maxAge = 'حداکثر سن نباید کمتر از حداقل سن باشد.';
  }
  if (selection.city && !selection.province) errors.city = 'ابتدا استان را انتخاب کن.';
  return errors;
}

export function toDiscoveryFilters(selection: DiscoveryFilterSelection, tier: string = 'gold'): DiscoveryFilters {
  if (Object.keys(filterErrors(selection)).length) throw new Error('فیلترها معتبر نیستند.');
  const result: DiscoveryFilters = {};
  if (selection.minAge.trim()) result.min_age = Number(ageDigits(selection.minAge));
  if (selection.maxAge.trim()) result.max_age = Number(ageDigits(selection.maxAge));
  if (selection.genders.length === 1) result.genders = [...selection.genders];
  if (selection.province) result.province_id = selection.province.id;
  if (selection.city) result.city_id = selection.city.id;
  if (tier === 'gold' && selection.verifiedOnly) result.verified_only = 1;
  if (tier === 'gold' && selection.personalityMatch) result.personality_match = 1;
  return result;
}

export function appendDiscoveryFilters(params: URLSearchParams, filters?: DiscoveryFilters): void {
  if (!filters) return;
  for (const field of ['min_age', 'max_age', 'province_id', 'city_id'] as const) {
    if (filters[field] != null) params.set(field, String(filters[field]));
  }
  if (filters.genders?.length === 1) params.append('genders[]', filters.genders[0]);
  if (filters.verified_only === 1) params.set('verified_only', '1');
  if (filters.personality_match === 1) params.set('personality_match', '1');
}

export function filtersAvailable(tier?: string): boolean {
  return tier === 'silver' || tier === 'gold';
}

export function filterCount(selection: DiscoveryFilterSelection, tier: string = 'gold'): number {
  return Number(!!(selection.minAge.trim() || selection.maxAge.trim()))
    + Number(selection.genders.length === 1) + Number(!!selection.province) + Number(!!selection.city)
    + Number(tier === 'gold' && selection.verifiedOnly) + Number(tier === 'gold' && selection.personalityMatch);
}

export function selectFilterProvince(selection: DiscoveryFilterSelection, province: FilterLocation | null): DiscoveryFilterSelection {
  return { ...selection, province, city: province?.id === selection.province?.id ? selection.city : null };
}

/** RAM only: never use account settings, local/session storage, or device backups. */
export class DiscoveryFilterSession {
  private owner: number | null = null;
  private selection = EMPTY_DISCOVERY_FILTERS;
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  setOwner(owner: number | null): void {
    if (owner === this.owner) return;
    this.owner = owner;
    this.selection = EMPTY_DISCOVERY_FILTERS;
    this.listeners.forEach(listener => listener());
  }

  get(owner?: number): DiscoveryFilterSelection {
    return owner != null && owner === this.owner ? this.selection : EMPTY_DISCOVERY_FILTERS;
  }

  apply(owner: number, selection: DiscoveryFilterSelection): void {
    toDiscoveryFilters(selection);
    this.setOwner(owner);
    this.selection = Object.freeze({ ...selection, genders: Object.freeze([...selection.genders]),
      province: selection.province && Object.freeze({ ...selection.province }), city: selection.city && Object.freeze({ ...selection.city }) });
    this.listeners.forEach(listener => listener());
  }

  reset(owner: number): void { this.apply(owner, EMPTY_DISCOVERY_FILTERS); }
}

export const discoveryFilterSession = new DiscoveryFilterSession();
