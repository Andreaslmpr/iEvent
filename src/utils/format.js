/* ============================================================
   Μορφοποίηση δεδομένων για εμφάνιση.
   Το API στέλνει ημερομηνίες ISO-8601 UTC και χρήματα ως string
   (API_CONTRACT §0) — εδώ γίνονται αναγνώσιμα στα ελληνικά.
   ΟΛΗ η μορφοποίηση περνά από εδώ, ώστε να είναι συνεπής παντού.
   ============================================================ */

const DATE_OPTS = { day: 'numeric', month: 'long', year: 'numeric' }
const TIME_OPTS = { hour: '2-digit', minute: '2-digit' }

/* «12 Ιουλίου 2026» */
export function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('el-GR', DATE_OPTS)
}

/* «23:30» */
export function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('el-GR', TIME_OPTS)
}

/* «12 Ιουλίου 2026, 23:30» */
export function formatDateTime(iso) {
  if (!iso) return ''
  return `${formatDate(iso)}, ${formatTime(iso)}`
}

/* Διάστημα εκδήλωσης. Αν αρχίζει και τελειώνει την ίδια μέρα δεν
   επαναλαμβάνουμε την ημερομηνία: «12 Ιουλίου 2026, 23:30 – 02:00». */
export function formatRange(startIso, endIso) {
  if (!startIso) return ''
  if (!endIso) return formatDateTime(startIso)
  const sameDay = new Date(startIso).toDateString() === new Date(endIso).toDateString()
  return sameDay
    ? `${formatDateTime(startIso)} – ${formatTime(endIso)}`
    : `${formatDateTime(startIso)} – ${formatDateTime(endIso)}`
}

/* «18.00» → «18,00 €»  (τα ποσά έρχονται ως string από το API) */
export function formatMoney(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return String(value ?? '')
  return n.toLocaleString('el-GR', { style: 'currency', currency: 'EUR' })
}

/* Χαμηλότερη τιμή εισιτηρίου — για το «από X €» στις κάρτες. */
export function minPrice(event) {
  if (!event?.ticketTypes?.length) return null
  return Math.min(...event.ticketTypes.map((t) => Number(t.price)))
}

/* Σύνολο διαθέσιμων θέσεων σε όλους τους τύπους εισιτηρίου. */
export function totalAvailable(event) {
  return (event?.ticketTypes ?? []).reduce((sum, t) => sum + t.available, 0)
}

/* Ετικέτες καταστάσεων (κείμενο + κλάση badge) — μία πηγή αλήθειας. */
export const EVENT_STATUS = {
  DRAFT: { label: 'Πρόχειρη', variant: '' },
  PUBLISHED: { label: 'Δημοσιευμένη', variant: 'badge--success' },
  COMPLETED: { label: 'Ολοκληρώθηκε', variant: '' },
  CANCELLED: { label: 'Ακυρώθηκε', variant: 'badge--danger' },
}

export const BOOKING_STATUS = {
  PENDING: { label: 'Σε εκκρεμότητα', variant: 'badge--warning' },
  CONFIRMED: { label: 'Επιβεβαιωμένη', variant: 'badge--success' },
  CANCELLED: { label: 'Ακυρωμένη', variant: 'badge--danger' },
}

/* Μήνυμα σφάλματος από απόκριση API (σχήμα error του contract). */
export function errorMessage(err, fallback = 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.') {
  return err?.response?.data?.error?.message || fallback
}
