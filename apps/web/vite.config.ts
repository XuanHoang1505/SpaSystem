import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

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
  plugins: [react(), tailwindcss()],
  resolve: { alias },
  server: { host: true },
  build: {
    rolldownOptions: {
      output: {
        // Tách thư viện bên thứ ba khỏi mã ứng dụng để chunk nhỏ hơn và cache lâu hơn.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|scheduler)/ },
            { name: 'vendor', test: /node_modules/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
});
