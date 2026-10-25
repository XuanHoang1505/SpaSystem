import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const alias = Object.fromEntries(
  Object.entries({
    '@': './src',
    '@app': './src/app',
    '@components': './src/components',
    '@features': './src/features',
    '@lib': './src/lib',
  }).map(([key, path]) => [key, fileURLToPath(new URL(path, import.meta.url))]),
);
export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  server: { host: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
});
