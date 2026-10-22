import { beforeEach, describe, expect, it, vi } from 'vitest';
import { compatibilityConsents, patchCompatibilityConsent } from './privacy';

const mocks = vi.hoisted(() => ({ patch: vi.fn() }));
vi.mock('./client', () => ({ api: mocks }));
beforeEach(() => { vi.clearAllMocks(); });

describe('explicit optional compatibility consent', () => {
  it('defaults both switches off without deriving consent from public visibility', () => {
    expect(compatibilityConsents(null)).toEqual({ compatibility_religion_consent: false, compatibility_personality_consent: false });
    expect(compatibilityConsents({ personality_test_visibility: 'visible' } as never))
      .toEqual({ compatibility_religion_consent: false, compatibility_personality_consent: false });
  });
  it('accepts only explicit boolean true', () => {
    expect(compatibilityConsents({ compatibility_religion_consent: true, compatibility_personality_consent: 'true' as never }))
      .toEqual({ compatibility_religion_consent: true, compatibility_personality_consent: false });
  });
  it.each(['compatibility_religion_consent', 'compatibility_personality_consent'] as const)('updates/revokes only %s without changing visibility', async key => {
    mocks.patch.mockResolvedValue({ data: { [key]: false, compatibility_consent_version: 'md049-v2' } });
    await expect(patchCompatibilityConsent('session', key, false)).resolves.toEqual({ [key]: false, compatibility_consent_version: 'md049-v2' });
    expect(mocks.patch).toHaveBeenCalledWith('/api/client/privacy-settings', { [key]: false }, 'session');
  });
  it('does not falsely report a grant when saving fails', async () => {
    mocks.patch.mockRejectedValue(new Error('save failed'));
    await expect(patchCompatibilityConsent('session', 'compatibility_religion_consent', true)).rejects.toThrow('save failed');
  });
});
