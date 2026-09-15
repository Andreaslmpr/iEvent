/* ============================================================
   Validation helpers — έλεγχοι πεδίων φόρμας.
   Κάθε function επιστρέφει string μήνυμα σφάλματος, ή '' αν έγκυρο.
   Χρησιμοποιούνται από Login/Register (και αργότερα φόρμα event).
   ============================================================ */

export const isBlank = (v) => !v || String(v).trim() === ''

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+\d][\d\s-]{7,}$/
const AFM_RE = /^\d{9}$/ // Ελληνικό ΑΦΜ: 9 ψηφία

export function required(value, label = 'Το πεδίο') {
  return isBlank(value) ? `${label} είναι υποχρεωτικό.` : ''
}

export function validateUsername(v) {
  if (isBlank(v)) return 'Το όνομα χρήστη είναι υποχρεωτικό.'
  if (v.trim().length < 3) return 'Τουλάχιστον 3 χαρακτήρες.'
  return ''
}

export function validatePassword(v) {
  if (isBlank(v)) return 'Ο κωδικός είναι υποχρεωτικός.'
  if (v.length < 6) return 'Τουλάχιστον 6 χαρακτήρες.'
  return ''
}

export function validateConfirm(pw, confirm) {
  if (isBlank(confirm)) return 'Επιβεβαιώστε τον κωδικό.'
  if (pw !== confirm) return 'Οι κωδικοί δεν ταιριάζουν.'
  return ''
}

export function validateEmail(v) {
  if (isBlank(v)) return 'Το email είναι υποχρεωτικό.'
  if (!EMAIL_RE.test(v.trim())) return 'Μη έγκυρη διεύθυνση email.'
  return ''
}

export function validatePhone(v) {
  if (isBlank(v)) return 'Το τηλέφωνο είναι υποχρεωτικό.'
  if (!PHONE_RE.test(v.trim())) return 'Μη έγκυρος αριθμός τηλεφώνου.'
  return ''
}

export function validateAfm(v) {
  if (isBlank(v)) return 'Το ΑΦΜ είναι υποχρεωτικό.'
  if (!AFM_RE.test(v.trim())) return 'Το ΑΦΜ πρέπει να έχει 9 ψηφία.'
  return ''
}

/* Γεωγραφικές συντεταγμένες (εκφώνηση §2: υποχρεωτικές στην εγγραφή).
   Δεχόμαστε και κόμμα ως υποδιαστολή, όπως το πληκτρολογεί ένας Έλληνας χρήστης. */
export const parseCoordinate = (v) => Number(String(v).trim().replace(',', '.'))

function validateCoordinate(v, min, max, label) {
  if (isBlank(v)) return `${label} είναι υποχρεωτικό.`
  const n = parseCoordinate(v)
  if (!Number.isFinite(n) || n < min || n > max) {
    return `${label} πρέπει να είναι αριθμός από ${min} έως ${max}.`
  }
  return ''
}

export const validateLatitude = (v) => validateCoordinate(v, -90, 90, 'Το γεωγραφικό πλάτος')
export const validateLongitude = (v) => validateCoordinate(v, -180, 180, 'Το γεωγραφικό μήκος')

/* Τρέχει ένα αντικείμενο validators πάνω σε values και επιστρέφει
   { errors, isValid }. */
export function runValidators(values, validators) {
  const errors = {}
  for (const [field, validate] of Object.entries(validators)) {
    const msg = validate(values[field], values)
    if (msg) errors[field] = msg
  }
  return { errors, isValid: Object.keys(errors).length === 0 }
}
