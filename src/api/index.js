/* ============================================================
   API facade — ΜΟΝΑΔΙΚΟ σημείο που χρησιμοποιεί η εφαρμογή.
   Τα components καλούν π.χ. api.login(...), ΠΟΤΕ απευθείας axios.

   USE_MOCK = true  → δουλεύουμε με τα mock δεδομένα (mock-first).
   USE_MOCK = false → πραγματικές κλήσεις στο backend του Ανδρέα.

   Κάθε function δείχνει ΚΑΙ τις δύο διαδρομές (mock + real) ώστε,
   όταν έρθει το backend, να αλλάξουμε απλώς το flag.
   ============================================================ */
import client from './client.js'
import { mockUsers, mockPasswords, mockEvents } from './mock/db.js'

export const USE_MOCK = true

/* Μικρή καθυστέρηση ώστε τα mocks να μοιάζουν με πραγματικό δίκτυο. */
const delay = (ms = 350) => new Promise((res) => setTimeout(res, ms))

/* Βοηθός: δημιουργεί mock JWT (απλώς base64 — ΟΧΙ πραγματικό token). */
function fakeToken(user) {
  const payload = btoa(JSON.stringify({ sub: user.id, role: user.role }))
  return `mock.${payload}.signature`
}

/* Βοηθός: ρίχνει σφάλμα στη μορφή του API_CONTRACT.md. */
function apiError(status, code, message, details) {
  const err = new Error(message)
  err.response = { status, data: { error: { code, message, details } } }
  return err
}

// ------------------------------------------------------------
// AUTH
// ------------------------------------------------------------
export async function login({ username, password }) {
  if (USE_MOCK) {
    await delay()
    const user = mockUsers.find((u) => u.username === username)
    if (!user || mockPasswords[username] !== password) {
      throw apiError(401, 'UNAUTHENTICATED', 'Λάθος όνομα χρήστη ή κωδικός.')
    }
    if (user.status !== 'APPROVED') {
      const msg = user.status === 'PENDING'
        ? 'Η αίτηση εγγραφής σας εκκρεμεί έγκριση από τον διαχειριστή.'
        : 'Η αίτηση εγγραφής σας έχει απορριφθεί.'
      throw apiError(403, 'FORBIDDEN', msg)
    }
    return { token: fakeToken(user), user }
  }
  const { data } = await client.post('/auth/login', { username, password })
  return data
}

export async function register(form) {
  if (USE_MOCK) {
    await delay()
    if (form.password !== form.confirmPassword) {
      throw apiError(400, 'VALIDATION_ERROR', 'Οι κωδικοί δεν ταιριάζουν.', {
        confirmPassword: 'Δεν ταιριάζει με τον κωδικό.',
      })
    }
    if (mockUsers.some((u) => u.username === form.username)) {
      throw apiError(409, 'USERNAME_TAKEN', 'Το όνομα χρήστη χρησιμοποιείται ήδη.')
    }
    return { id: Math.floor(Math.random() * 1000) + 100, status: 'PENDING' }
  }
  const { data } = await client.post('/auth/register', form)
  return data
}

// ------------------------------------------------------------
// EVENTS  (placeholder — επεκτείνεται στη Φάση 2)
// ------------------------------------------------------------
export async function getEvents(params = {}) {
  if (USE_MOCK) {
    await delay()
    const items = mockEvents.filter((e) => e.status === 'PUBLISHED')
    return { items, page: 1, pageSize: 20, total: items.length, totalPages: 1 }
  }
  const { data } = await client.get('/events', { params })
  return data
}

export async function getEvent(id) {
  if (USE_MOCK) {
    await delay()
    const event = mockEvents.find((e) => e.id === Number(id))
    if (!event) throw apiError(404, 'NOT_FOUND', 'Η εκδήλωση δεν βρέθηκε.')
    return event
  }
  const { data } = await client.get(`/events/${id}`)
  return data
}
