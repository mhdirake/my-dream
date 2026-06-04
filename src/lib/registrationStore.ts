type RegistrationState = {
  phone: string;
  registration_token: string;
  username: string;
  email: string;
  password: string;
  password_confirmation: string;
};

let state: Partial<RegistrationState> = {};

export const registrationStore = {
  set: (patch: Partial<RegistrationState>) => { state = { ...state, ...patch }; },
  get: () => state,
  clear: () => { state = {}; },
};
