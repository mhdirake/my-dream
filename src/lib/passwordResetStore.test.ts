import { beforeEach, describe, expect, it } from 'vitest';
import { passwordResetStore } from './passwordResetStore';

describe('password reset store', () => {
  beforeEach(() => {
    passwordResetStore.clear();
  });

  it('keeps the verified token out of route parameters and clears it after use', () => {
    passwordResetStore.set({ phone: '09101705693' });
    passwordResetStore.set({ password_reset_token: 'reset-token' });

    expect(passwordResetStore.get()).toEqual({
      phone: '09101705693',
      password_reset_token: 'reset-token',
    });

    passwordResetStore.clear();

    expect(passwordResetStore.get()).toEqual({});
  });
});
