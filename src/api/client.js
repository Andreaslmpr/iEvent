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

/* Σήμα «το session δεν ισχύει πια» προς το AuthContext.
   Το localStorage από μόνο του δεν ξυπνά το React: χωρίς αυτό, μετά τη λήξη
   του JWT ο χρήστης θα συνέχιζε να βλέπει συνδεδεμένο UI μέχρι να κάνει
   refresh, με κάθε κλήση να γυρίζει 401. */
export const UNAUTHORIZED_EVENT = 'stayapp:unauthorized'

/* Response interceptor: σε 401 (έληξε/άκυρο token) καθαρίζει το session.

   ΜΟΝΟ σε 401 — ΠΟΤΕ σε 403. Το 403 σημαίνει «έγκυρο token, αλλά δεν σου
   ανήκει / λάθος ρόλος»· logout εκεί θα πετούσε τον χρήστη έξω κάθε φορά
   που πατάει κάτι που δεν δικαιούται (API_CONTRACT.md §0). */
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearSession()
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }
    return Promise.reject(error)
  },
)

export default client
