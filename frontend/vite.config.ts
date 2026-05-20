/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const VITE_API_URL = process.env.VITE_API_URL ?? 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  base:'/',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setupTests.ts',
    include: ['src/tests/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/tests/**',
        'src/vite-env.d.ts',
      ],
    },
  },
  server: {
    proxy: {
      '/api/': {
        target: VITE_API_URL,
        rewrite: path => path.replace(/^\/api/, ''),
        bypass: req => {
          if (req.headers.accept?.includes('text/html')) return '/index.html'
        },
      },
      '/employees': {
        target: VITE_API_URL,
        bypass: req => {
          if (req.headers.accept?.includes('text/html')) return '/index.html'
        },
      },
      '/departments': {
        target: VITE_API_URL,
        bypass: req => {
          if (req.headers.accept?.includes('text/html')) return '/index.html'
        },
      },
      '/auth': {
        target: VITE_API_URL,
        bypass: req => {
          if (req.headers.accept?.includes('text/html')) return '/index.html'
        },
      },
      '/audit': {
        target: VITE_API_URL,
        bypass: req => {
          if (req.headers.accept?.includes('text/html')) return '/index.html'
        },
      },
      '/health': {
        target: VITE_API_URL,
        bypass: req => {
          if (req.headers.accept?.includes('text/html')) return '/index.html'
        },
      },
    },
  },
})
