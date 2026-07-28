type PasswordResetState = {
  phone: string;
  password_reset_token: string;
};

let state: Partial<PasswordResetState> = {};

export const passwordResetStore = {
  set: (patch: Partial<PasswordResetState>) => {
    state = { ...state, ...patch };
  },
  get: () => state,
  clear: () => {
    state = {};
  },
};
