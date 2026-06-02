import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Όταν φύγουμε από mock-first, τα /api requests προωθούνται στο backend του Ανδρέα.
      // Το ενεργοποιούμε στη Φάση integration — προς το παρόν το api layer δουλεύει με mocks.
      // '/api': { target: 'https://localhost:8000', changeOrigin: true, secure: false },
    },
  },
})
