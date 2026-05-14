import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/': {
        target: 'http://localhost:8000',
        rewrite: path => path.replace(/^\/api/, ''),
        bypass: req => {
          if (req.headers.accept?.includes('text/html')) return '/index.html'
        },
      },
      '/employees': {
        target: 'http://localhost:8000',
        bypass: req => {
          if (req.headers.accept?.includes('text/html')) return '/index.html'
        },
      },
      '/departments': {
        target: 'http://localhost:8000',
        bypass: req => {
          if (req.headers.accept?.includes('text/html')) return '/index.html'
        },
      },
      '/health': 'http://localhost:8000',
    },
  },
})
