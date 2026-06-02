/* ============================================================
   Axios instance — κεντρικό σημείο κλήσεων προς το REST API.
   Όπως ορίζει το API_CONTRACT.md:
     - base URL /api (μέσω SSL/TLS)
     - JWT στο header Authorization: Bearer <token>
   Το token αποθηκεύεται στο localStorage (βλ. auth/token.js).
   ============================================================ */
import axios from 'axios'
import { getToken, clearSession } from '../auth/token.js'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

/* Request interceptor: προσθέτει αυτόματα το JWT σε κάθε κλήση. */
client.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/* Response interceptor: σε 401 (έληξε/άκυρο token) καθαρίζει το session. */
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearSession()
      // Το redirect στο /login το χειρίζεται το AuthContext/ProtectedRoute.
    }
    return Promise.reject(error)
  },
)

export default client
