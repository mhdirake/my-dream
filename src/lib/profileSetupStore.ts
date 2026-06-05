type ProfileSetupState = {
  first_name?: string;
  birth_date?: string;
  gender?: 'male' | 'female' | 'prefer_not_to_say';
  province_id?: number;
  province_name?: string;
  city_id?: number;
  city_name?: string;
};

let state: ProfileSetupState = {};

export const profileSetupStore = {
  set: (patch: Partial<ProfileSetupState>) => { state = { ...state, ...patch }; },
  get: () => state,
  clear: () => { state = {}; },
};
