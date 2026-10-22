import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const { version: appVersion } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

// https://vite.dev/config/
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [react(), tailwindcss()],
  // ExcelJS is CommonJS-heavy; optimize it before dev requests so the first lazy import does not trigger a Vite reload.
  optimizeDeps: {
    include: ['exceljs'],
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    // During local development Vite serves the UI; forward the PHP API to PHP's dev server.
    proxy: {
      '/api.php': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
