const BASE = 'https://auth.mikdev.ir/realms/My%20Dream';

export const KC = {
  issuer: BASE,
  clientId: 'frontend',
  clientSecret: process.env.EXPO_PUBLIC_KC_SECRET ?? '',
  scopes: ['openid', 'profile', 'email'] as string[],
  scheme: 'mobile',
} as const;

// Hardcoded endpoints — avoids runtime CORS issues with discovery fetch
export const KC_DISCOVERY = {
  authorizationEndpoint: `${BASE}/protocol/openid-connect/auth`,
  tokenEndpoint:         `${BASE}/protocol/openid-connect/token`,
  revocationEndpoint:    `${BASE}/protocol/openid-connect/revoke`,
  endSessionEndpoint:    `${BASE}/protocol/openid-connect/logout`,
  userInfoEndpoint:      `${BASE}/protocol/openid-connect/userinfo`,
} as const;
