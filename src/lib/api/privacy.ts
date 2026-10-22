import { api } from './client';

export type CompatibilityConsentKey = 'compatibility_religion_consent' | 'compatibility_personality_consent';
export type CompatibilityConsentSettings = {
  compatibility_religion_consent?: boolean;
  compatibility_personality_consent?: boolean;
  compatibility_consent_version?: string | null;
};

export function compatibilityConsents(settings: CompatibilityConsentSettings | null | undefined) {
  return {
    compatibility_religion_consent: settings?.compatibility_religion_consent === true,
    compatibility_personality_consent: settings?.compatibility_personality_consent === true,
  };
}

// Only an explicit matching-consent flag is submitted. Public visibility is a
// different preference and must never be inferred as permission for matching.
export function patchCompatibilityConsent<T>(token: string, key: CompatibilityConsentKey, value: boolean) {
  return api.patch<{ data: T }>('/api/client/privacy-settings', { [key]: value }, token).then(response => response.data);
}
