import { api } from './client';
import type { TermsDocument, TermsStatus } from '../termsPolicy';
export const termsApi = {
  current: () => api.get<{ data: TermsDocument | null }>('/api/terms').then(r => r.data),
  status: (token: string) => api.get<{ data: TermsStatus }>('/api/terms/status', token).then(r => r.data),
  accept: (token: string, version: number) => api.post<{ data: TermsStatus }>('/api/terms/accept', { terms_version_id: version, accepted: true }, token).then(r => r.data),
  registrationAccept: (registrationToken: string, version: number) => api.post('/api/terms/registration-accept', { registration_token: registrationToken, terms_version_id: version, accepted: true }),
};
