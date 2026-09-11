import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Τα /api requests προωθούνται στο backend του Ανδρέα.
      //
      // Γιατί proxy και όχι απευθείας https://localhost:8000/api:
      //  - Ο browser βλέπει same-origin → κανένα CORS preflight.
      //  - Το secure:false δέχεται το self-signed πιστοποιητικό ΕΔΩ (Node),
      //    οπότε δεν χρειάζεται ο χρήστης να κάνει εξαίρεση στον browser.
      // Για απευθείας κλήσεις: VITE_API_BASE_URL στο .env.local (βλ. .env.example).
      '/api': { target: 'https://localhost:8000', changeOrigin: true, secure: false },
    },
  },
})
