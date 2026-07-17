import { api } from './client';

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
    return api.post<LoginResponse>('/api/auth/login', data);
  },

  refresh: async (refreshToken: string): Promise<LoginResponse> => {
    return api.post<LoginResponse>('/api/auth/refresh', { refresh_token: refreshToken });
  },

  me: (token: string) =>
    api.get<MeResponse>('/api/me', token),
};
