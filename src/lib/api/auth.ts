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
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  id_token?: string;
};

export type ReferrerCheckResponse = {
  exists: boolean;
  username?: string;
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
};
