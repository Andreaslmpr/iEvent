import fs from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/* Η εκφώνηση §1 απαιτεί ΟΛΕΣ οι αλληλεπιδράσεις να είναι κρυπτογραφημένες.
   Χρησιμοποιούμε τα ίδια self-signed πιστοποιητικά με το backend
   (bash make-certs.sh). Αν λείπουν, ο dev server σηκώνεται σε HTTP αντί να
   αρνηθεί να ξεκινήσει — αλλιώς ένα καθαρό clone δεν θα έτρεχε καθόλου. */
function httpsCerts() {
  try {
    return {
      key: fs.readFileSync('certs/key.pem'),
      cert: fs.readFileSync('certs/cert.pem'),
    }
  } catch {
    console.warn(
      '\n[vite] Δεν βρέθηκαν τα certs/ — ο dev server ξεκινά σε HTTP.\n' +
      '       Για HTTPS (όπως το απαιτεί το §1): bash make-certs.sh\n',
    )
    return undefined
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    https: httpsCerts(),
    proxy: {
      // Τα /api requests προωθούνται στο backend του Ανδρέα.
      //
      // Γιατί proxy και όχι απευθείας https://localhost:8000/api:
      //  - Ο browser βλέπει same-origin → κανένα CORS preflight.
      //  - Το secure:false δέχεται το self-signed πιστοποιητικό ΕΔΩ (Node),
      //    οπότε αρκεί ΜΙΑ εξαίρεση στον browser (για το :5173), όχι δύο.
      // Για απευθείας κλήσεις: VITE_API_BASE_URL στο .env.local (βλ. .env.example).
      '/api': { target: 'https://localhost:8000', changeOrigin: true, secure: false },
    },
  },
})
