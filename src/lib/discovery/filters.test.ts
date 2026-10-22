import { describe, expect, it, vi } from 'vitest';
import { ageDigits, appendDiscoveryFilters, DiscoveryFilterSession, EMPTY_DISCOVERY_FILTERS,
  filterCount, filterErrors, filtersAvailable, selectFilterProvince, toDiscoveryFilters } from './filters';

const selection = { ...EMPTY_DISCOVERY_FILTERS, minAge: '۲۵', maxAge: '٣٢', genders: ['female'] as const,
  province: { id: 1, name: 'تهران' }, city: { id: 2, name: 'تهران' } };

describe('MD-050 session filters', () => {
  it('normalizes Persian/Arabic age digits and combines all four filters', () => {
    expect(ageDigits(' ۱۲٣ ')).toBe('123');
    expect(filterErrors(selection)).toEqual({});
    expect(toDiscoveryFilters(selection)).toEqual({ min_age: 25, max_age: 32, genders: ['female'], province_id: 1, city_id: 2 });
    expect(filterCount(selection)).toBe(4);
  });

  it.each(['17', '0', '-5', '18.5', 'NaN', 'Infinity', '۲۵a'])('rejects invalid min age %s', minAge => {
    expect(filterErrors({ ...selection, minAge }).minAge).toBeTruthy();
  });
  it('rejects reversed ranges, but accepts inclusive equal bounds and an open upper bound', () => {
    expect(filterErrors({ ...selection, minAge: '33' }).maxAge).toBeTruthy();
    expect(filterErrors({ ...selection, minAge: '32' })).toEqual({});
    expect(toDiscoveryFilters({ ...selection, maxAge: '' }).max_age).toBeUndefined();
    expect(() => toDiscoveryFilters({ ...selection, minAge: '16' })).toThrow();
  });
  it('treats zero or both gender choices as no additional restriction, not a base preference update', () => {
    expect(toDiscoveryFilters({ ...selection, genders: [] }).genders).toBeUndefined();
    expect(toDiscoveryFilters({ ...selection, genders: ['male', 'female'] }).genders).toBeUndefined();
    expect(toDiscoveryFilters({ ...selection, genders: ['male'] }).genders).toEqual(['male']);
  });
  it('keeps Gold verification and personality in RAM on downgrade while sending only public filters for Silver', () => {
    const gold = { ...selection, verifiedOnly: true, personalityMatch: true };
    expect(filterCount(gold, 'gold')).toBe(6);
    expect(filterCount(gold, 'silver')).toBe(4);
    expect(toDiscoveryFilters(gold, 'gold').verified_only).toBe(1);
    expect(toDiscoveryFilters(gold, 'gold').personality_match).toBe(1);
    expect(toDiscoveryFilters(gold, 'silver').verified_only).toBeUndefined();
    expect(toDiscoveryFilters(gold, 'silver').personality_match).toBeUndefined();
    const params = new URLSearchParams();
    appendDiscoveryFilters(params, toDiscoveryFilters(gold, 'gold'));
    expect(params.get('verified_only')).toBe('1');
    expect(params.get('personality_match')).toBe('1');
  });
  it('clears an incompatible city when changing or removing province, preserving other fields', () => {
    expect(selectFilterProvince(selection, { id: 3, name: 'فارس' })).toEqual({ ...selection, province: { id: 3, name: 'فارس' }, city: null });
    expect(selectFilterProvince(selection, { id: 1, name: 'تهران' }).city).toEqual(selection.city);
    expect(selectFilterProvince(selection, null).city).toBeNull();
    expect(filterErrors({ ...selection, province: null }).city).toBeTruthy();
  });
  it('whitelists only MD-050 query values, never including local labels or arbitrary parameters', () => {
    const params = new URLSearchParams({ limit: '15' });
    appendDiscoveryFilters(params, { ...toDiscoveryFilters(selection), tier: 'gold', viewer_id: 9 } as never);
    expect(params.get('min_age')).toBe('25');
    expect(params.getAll('genders[]')).toEqual(['female']);
    expect(params.get('city_id')).toBe('2');
    expect(params.has('tier')).toBe(false);
    expect(params.has('viewer_id')).toBe(false);
  });
  it('only applies explicit Apply; draft edits and cancellation do not touch the current selection', () => {
    const session = new DiscoveryFilterSession();
    session.setOwner(10);
    const draft = { ...session.get(10), minAge: '25' };
    expect(session.get(10)).toBe(EMPTY_DISCOVERY_FILTERS);
    session.apply(10, draft);
    const cancelled = { ...session.get(10), maxAge: '40' };
    expect(cancelled.maxAge).toBe('40');
    expect(session.get(10).maxAge).toBe('');
    expect(session.get(10).minAge).toBe('25');
  });
  it('preserves selection across navigation/plan changes without granting Basic access', () => {
    const session = new DiscoveryFilterSession();
    session.apply(10, selection);
    for (const tier of ['silver', 'gold', 'basic', 'silver']) {
      expect(session.get(10)).toEqual(selection);
      expect(filtersAvailable(tier)).toBe(tier !== 'basic');
    }
    expect(filtersAvailable('unknown')).toBe(false);
  });
  it('resets drafts/applied selection without changing an account preference or another device', () => {
    const firstDevice = new DiscoveryFilterSession();
    const secondDevice = new DiscoveryFilterSession();
    const notify = vi.fn();
    const unsubscribe = firstDevice.subscribe(notify);
    firstDevice.apply(10, selection);
    secondDevice.setOwner(10);
    expect(secondDevice.get(10)).toBe(EMPTY_DISCOVERY_FILTERS);
    firstDevice.reset(10);
    expect(firstDevice.get(10)).toEqual(EMPTY_DISCOVERY_FILTERS);
    expect(notify).toHaveBeenCalled();
    unsubscribe();
  });
  it('never transfers one account selections through logout, a different account, or cold restart', () => {
    const session = new DiscoveryFilterSession();
    session.apply(10, selection);
    expect(session.get(11)).toBe(EMPTY_DISCOVERY_FILTERS);
    session.setOwner(null);
    session.setOwner(10);
    expect(session.get(10)).toBe(EMPTY_DISCOVERY_FILTERS);
    session.apply(10, selection);
    session.setOwner(11);
    session.setOwner(10);
    expect(session.get(10)).toBe(EMPTY_DISCOVERY_FILTERS);
    session.apply(10, selection);
    const restarted = new DiscoveryFilterSession();
    restarted.setOwner(10);
    expect(restarted.get(10)).toBe(EMPTY_DISCOVERY_FILTERS);
  });
});
