/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve('./src'),
      '@components': resolve('./src/components'),
      '@hooks': resolve('./src/hooks'),
      '@utils': resolve('./src/utils'),
      '@types': resolve('./src/types'),
      '@data': resolve('./src/data'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/unit/setup.ts',
    exclude: ['**/node_modules/**', '**/tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/main.tsx',
        'dist/',
      ],
    },
    bail: 0,
    passWithNoTests: true,
    silent: false,
    watch: false,
  },
})