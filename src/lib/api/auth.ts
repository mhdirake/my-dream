import { api } from './client';

// ── TODO: replace these paths with your actual backend endpoints ──

export type OtpSendResponse = {
  message: string;
  expires_in?: number; // seconds
};

export type OtpVerifyResponse = {
  verified_token: string; // short-lived token to prove OTP was verified
};

export type RegisterResponse = {
  access_token: string;
  refresh_token: string;
  expires_in?: number; // seconds — defaults to 300 if missing
  id_token?: string;
};

export const authApi = {
  // Step 1 — send OTP to phone
  sendOtp: (phone: string) =>
    api.post<OtpSendResponse>('/api/v1/auth/otp/send', { phone }),

  // Step 2 — verify OTP, receive a verified_token
  verifyOtp: (phone: string, code: string) =>
    api.post<OtpVerifyResponse>('/api/v1/auth/otp/verify', { phone, code }),

  // Step 3 — register with username + password (backend creates Keycloak user)
  register: (data: {
    phone: string;
    verified_token: string;
    username: string;
    password: string;
  }) => api.post<RegisterResponse>('/api/v1/auth/register', data),

  // Step 4 — optional referral code (call after register)
  applyReferral: (referral_code: string, access_token: string) =>
    api.post<void>('/api/v1/auth/referral', { referral_code }, access_token),
};
