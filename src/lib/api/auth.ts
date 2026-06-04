import { Platform } from 'react-native';
import { api, ApiError } from './client';

export type OtpSendResponse = {
  message: string;
  expires_in: number;
  resend_after: number;
};

export type OtpVerifyResponse = {
  success: boolean;
  message: string;
  data: {
    registration_token: string;
    expires_in: number;
  };
};

export type RegisterCompleteResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
};

export type ReferrerCheckResponse = {
  exists: boolean;
  username?: string;
};

export type MeResponse = {
  id: number;
  username: string;
  email?: string | null;
  mobile?: string;
  first_name?: string | null;
  last_name?: string | null;
};

export const authApi = {
  sendOtp: (mobile: string) =>
    api.post<OtpSendResponse>('/api/auth/register/send-otp', { mobile }),

  verifyOtp: (mobile: string, code: string) =>
    api.post<OtpVerifyResponse>('/api/auth/register/verify-otp', { mobile, code }),

  register: (data: {
    registration_token: string;
    username: string;
    email?: string;
    password: string;
    password_confirmation: string;
    referrer_username?: string;
  }) => api.post<RegisterCompleteResponse>('/api/auth/register/complete', data),

  checkReferrer: (username: string) =>
    api.get<ReferrerCheckResponse>(
      `/api/auth/register/referrer/check?username=${encodeURIComponent(username)}`,
    ),

  login: async (data: { username: string; password: string }): Promise<LoginResponse> => {
    if (Platform.OS === 'web') {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new ApiError(res.status, json?.error_description ?? `HTTP ${res.status}`);
      return json as LoginResponse;
    }

    const kcUrl = process.env.KC_URL ?? process.env.EXPO_PUBLIC_KC_URL;
    const kcSecret = process.env.KC_SECRET ?? process.env.EXPO_PUBLIC_KC_SECRET;
    
    const body = [
      ['grant_type', 'password'],
      ['client_id', 'backend-client'],
      ['client_secret', kcSecret ?? ''],
      ['username', data.username],
      ['password', data.password],
    ]
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    const kcTokenUrl = `${kcUrl}/realms/My%20Dream/protocol/openid-connect/token`;

    console.log({ body, kcTokenUrl });

    const res = await fetch(kcTokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, json?.error_description ?? `HTTP ${res.status}`);
    return json as LoginResponse;
  },

  me: (token: string) =>
    api.get<MeResponse>('/api/me', token),
};
