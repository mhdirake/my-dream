import { describe, expect, it } from 'vitest';
import { registrationErrors } from './registrationValidation';

const valid = { username: 'user_1', email: '', password: '12345678', password_confirmation: '12345678' };

describe('registration field feedback', () => {
  it.each(['', ' ', 'valid@example.com'])('email is optional but validates when supplied: %s', email => {
    expect(Object.values(registrationErrors({ ...valid, email })).some(Boolean)).toBe(false);
  });
  it.each(['bad', 'bad@', 'a b@example.com'])('rejects malformed nonempty email: %s', email => {
    expect(registrationErrors({ ...valid, email }).email).toBeTruthy();
  });
  it.each(['', '1234567'])('explains the eight character minimum: %s', password => {
    expect(registrationErrors({ ...valid, password }).password).toContain('۸');
  });
  it.each(['ab', 'نام', 'user-name', 'a'.repeat(31)])('matches server username constraints: %s', username => {
    expect(registrationErrors({ ...valid, username }).username).toBeTruthy();
  });
  it('requires a matching confirmation', () => {
    expect(registrationErrors({ ...valid, password_confirmation: '' }).password_confirmation).toBeTruthy();
    expect(registrationErrors({ ...valid, password_confirmation: '87654321' }).password_confirmation).toBeTruthy();
  });
});
