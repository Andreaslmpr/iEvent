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

/* ------------------------------------------------------------
   Γέφυρα ημερομηνιών φόρμας ↔ API.
   Το <input type="datetime-local"> δουλεύει σε ΤΟΠΙΚΗ ώρα, ενώ
   το API θέλει ISO-8601 σε UTC (contract §0).
   ------------------------------------------------------------ */

/* ISO UTC → «2026-07-12T23:30» για το input. */
export function toInputDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/* Τιμή του input (τοπική ώρα) → ISO UTC για το API. */
export function fromInputDateTime(local) {
  if (!local) return ''
  return new Date(local).toISOString()
}

/* Ετικέτες κατάστασης λογαριασμού (σελίδα διαχείρισης χρηστών). */
export const USER_STATUS = {
  PENDING: { label: 'Εκκρεμεί έγκριση', variant: 'badge--warning' },
  APPROVED: { label: 'Εγκεκριμένος', variant: 'badge--success' },
  REJECTED: { label: 'Απορρίφθηκε', variant: 'badge--danger' },
}
