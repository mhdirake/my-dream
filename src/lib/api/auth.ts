import { api } from './client';
import { registrationStore } from '../registrationStore';

export type OtpSendResponse = {
  success: boolean;
  message: string;
  data: {
    expires_in: number;
    resend_after: number;
  };
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
  success: boolean;
  data: {
    user: Record<string, unknown>;
    auth: {
      token_type: string;
      access_token: string;
      refresh_token: string;
      expires_in: number;
      refresh_expires_in: number;
    };
    next_step: string;
  };
};

export type PasswordResetVerifyResponse = {
  success: boolean;
  message: string;
  data: {
    password_reset_token: string;
    expires_in: number;
  };
};

export type PasswordResetResponse = {
  success: boolean;
  message: string;
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
  logout: (token: string, refreshToken: string) =>
    api.post('/api/auth/logout', { refresh_token: refreshToken }, token),
  sendOtp: (mobile: string) =>
    api.post<OtpSendResponse>('/api/auth/register/send-otp', { mobile, terms_version_id: registrationStore.get().terms_version_id, terms_accepted: registrationStore.get().terms_accepted ?? false }),

  verifyOtp: (mobile: string, code: string) =>
    api.post<OtpVerifyResponse>('/api/auth/register/verify-otp', { mobile, code }),

  sendPasswordResetOtp: (mobile: string) =>
    api.post<OtpSendResponse>('/api/auth/password/forgot/send-otp', { mobile }),

  verifyPasswordResetOtp: (mobile: string, code: string) =>
    api.post<PasswordResetVerifyResponse>('/api/auth/password/forgot/verify-otp', {
      mobile,
      code,
    }),

  resetPassword: (data: {
    password_reset_token: string;
    password: string;
    password_confirmation: string;
  }) => api.post<PasswordResetResponse>('/api/auth/password/forgot/reset', data),

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
    return api.post<LoginResponse>('/api/auth/login', data);
  },

  refresh: async (refreshToken: string): Promise<LoginResponse> => {
    return api.post<LoginResponse>('/api/auth/refresh', { refresh_token: refreshToken });
  },

  me: (token: string) =>
    api.get<MeResponse>('/api/me', token),
};
