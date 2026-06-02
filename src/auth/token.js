/* ============================================================
   Διαχείριση JWT & στοιχείων χρήστη στο localStorage.
   Μοναδικό σημείο πρόσβασης — ώστε αν αλλάξει η στρατηγική
   αποθήκευσης, να αλλάξει μόνο εδώ.
   ============================================================ */

const TOKEN_KEY = 'stayapp_token'
const USER_KEY = 'stayapp_user'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY)
  return raw ? JSON.parse(raw) : null
}

export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
