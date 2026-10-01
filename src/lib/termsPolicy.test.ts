import { describe, expect, it } from 'vitest';
import { hasOfflineAcceptance, inlineTerms, isTermsError, reachedTermsEnd } from './termsPolicy';
const accepted = { terms_accepted: true, current_version_id: 2, accepted_version_id: 2, accepted_at: '2026-10-01T00:00:00Z' };
describe('terms acceptance policy', () => {
 it('enables short text immediately after layout and long text only at its end', () => {
  expect(reachedTermsEnd(600, 400)).toBe(true);
  expect(reachedTermsEnd(600, 1200, 100)).toBe(false);
  expect(reachedTermsEnd(600, 1200, 600)).toBe(true);
  expect(reachedTermsEnd(0, 400)).toBe(false);
  expect(reachedTermsEnd(600, 0)).toBe(false);
 });
 it('permits offline use only with a recorded acceptance of the last known current version', () => {
  expect(hasOfflineAcceptance(accepted)).toBe(true);
  expect(hasOfflineAcceptance(null)).toBe(false);
  expect(hasOfflineAcceptance({ ...accepted, terms_accepted: false })).toBe(false);
  expect(hasOfflineAcceptance({ ...accepted, current_version_id: 3 })).toBe(false);
  expect(hasOfflineAcceptance({ ...accepted, accepted_at: null })).toBe(false);
  expect(hasOfflineAcceptance({ ...accepted, current_version_id: null })).toBe(false);
 });
 it('distinguishes acceptance requirements from authentication failures', () => {
  expect(isTermsError({ status: 409, data: { code: 'TERMS_ACCEPTANCE_REQUIRED' } })).toBe(true);
  expect(isTermsError({ status: 401 })).toBe(false);
  expect(isTermsError(null)).toBe(false);
 });
 it('renders supported formatting and never turns unsafe URL schemes into links', () => {
  expect(inlineTerms('متن **پررنگ** و *تأکید* [لینک](https://example.com)')).toContainEqual({ text: 'پررنگ', bold: true });
  expect(inlineTerms('[خطر](javascript:alert(1))').some(p => p.href)).toBe(false);
  expect(inlineTerms('<script>alert(1)</script>')).toEqual([{ text: '<script>alert(1)</script>' }]);
 });
});
