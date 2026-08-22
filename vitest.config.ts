import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@/assets': fileURLToPath(new URL('./assets', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'react-native': fileURLToPath(new URL('./test/mocks/react-native.ts', import.meta.url)),
    },
  },
});
