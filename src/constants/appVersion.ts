import Constants from 'expo-constants';

import appConfig from '../../app.json';
import { toFaDigits } from '@/lib/localization';

export const APP_VERSION = appConfig.expo.version ?? Constants.expoConfig?.version ?? '1.0.13';
export const APP_VERSION_LABEL = `نسخه ${toFaDigits(APP_VERSION)}`;
