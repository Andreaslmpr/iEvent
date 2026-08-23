/* ============================================================
   API facade — ΜΟΝΑΔΙΚΟ σημείο που χρησιμοποιεί η εφαρμογή.
   Τα components καλούν π.χ. api.login(...), ΠΟΤΕ απευθείας axios.

   USE_MOCK = true  → δουλεύουμε με τα mock δεδομένα (mock-first).
   USE_MOCK = false → πραγματικές κλήσεις στο backend του Ανδρέα.

   Κάθε function δείχνει ΚΑΙ τις δύο διαδρομές (mock + real) ώστε,
   όταν έρθει το backend, να αλλάξουμε απλώς το flag.
   ============================================================ */
import client from './client.js'
import { getStoredUser } from '../auth/token.js'
import {
  mockUsers, mockPasswords, mockEvents, mockBookings, mockMessages, nextId,
} from './mock/db.js'

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

/* Βοηθός: τυλίγει λίστα στο paginated wrapper του contract (§0). */
function paginate(items, page = 1, pageSize = 20) {
  const p = Math.max(1, Number(page) || 1)
  const size = Math.max(1, Number(pageSize) || 20)
  const start = (p - 1) * size
  return {
    items: items.slice(start, start + size),
    page: p,
    pageSize: size,
    total: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / size)),
  }
}

/* Ομαλοποίηση κειμένου για αναζήτηση: πεζά, χωρίς τόνους και με
   τελικό σίγμα ως σίγμα — ώστε «αθηνα» να βρίσκει «Αθήνα».
   (Στο πραγματικό backend το κάνει η βάση με unaccent/collation.) */
function norm(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ς/g, 'σ')
}

/* Χαμηλότερη τιμή εισιτηρίου — για φιλτράρισμα/ταξινόμηση κατά τιμή. */
function cheapest(event) {
  if (!event.ticketTypes?.length) return 0
  return Math.min(...event.ticketTypes.map((t) => Number(t.price)))
}

/* Οι επιτρεπτές ταξινομήσεις του contract (§2.3): date | price | title. */
const SORTERS = {
  date: (a, b) => a.startDateTime.localeCompare(b.startDateTime),
  price: (a, b) => cheapest(a) - cheapest(b),
  title: (a, b) => a.title.localeCompare(b.title, 'el'),
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
    return { id: nextId(mockUsers), status: 'PENDING' }
  }
  const { data } = await client.post('/auth/register', form)
  return data
}

// ------------------------------------------------------------
// EVENTS
// ------------------------------------------------------------
/* Αναζήτηση/πλοήγηση εκδηλώσεων (contract §2.3).
   Παράμετροι: q, category, city, from, to, minPrice, maxPrice, sort, page, pageSize.
   Στο mock εφαρμόζουμε τα ίδια φίλτρα τοπικά — στο πραγματικό API
   περνούν αυτούσια ως query params και τα εκτελεί ο server. */
export async function getEvents(params = {}) {
  if (USE_MOCK) {
    await delay()
    const { q, category, city, from, to, minPrice, maxPrice, sort, page, pageSize } = params

    // GUEST/USER βλέπουν μόνο δημοσιευμένες εκδηλώσεις.
    let items = mockEvents.filter((e) => e.status === 'PUBLISHED')

    if (q) {
      const needle = norm(q.trim())
      items = items.filter(
        (e) => norm(e.title).includes(needle) || norm(e.description).includes(needle),
      )
    }
    if (category) {
      items = items.filter((e) => e.categories.includes(category))
    }
    if (city) {
      const needle = norm(city.trim())
      items = items.filter((e) => norm(e.city).includes(needle))
    }
    if (from) {
      const start = new Date(`${from}T00:00:00`)
      items = items.filter((e) => new Date(e.startDateTime) >= start)
    }
    if (to) {
      const end = new Date(`${to}T23:59:59`)
      items = items.filter((e) => new Date(e.startDateTime) <= end)
    }
    if (minPrice !== undefined && minPrice !== '') {
      items = items.filter((e) => cheapest(e) >= Number(minPrice))
    }
    if (maxPrice !== undefined && maxPrice !== '') {
      items = items.filter((e) => cheapest(e) <= Number(maxPrice))
    }

    items = [...items].sort(SORTERS[sort] ?? SORTERS.date)
    return paginate(items, page, pageSize)
  }
  const { data } = await client.get('/events', { params })
  return data
}

/* Πλήρες Event DTO (με ticketTypes & geoLocation για τον χάρτη). */
export async function getEvent(id) {
  if (USE_MOCK) {
    await delay()
    const event = mockEvents.find((e) => e.id === Number(id))
    if (!event) throw apiError(404, 'NOT_FOUND', 'Η εκδήλωση δεν βρέθηκε.')
    // Αντίγραφο ώστε τα components να μη μεταλλάσσουν κατά λάθος τη «βάση».
    return structuredClone(event)
  }
  const { data } = await client.get(`/events/${id}`)
  return data
}

// ------------------------------------------------------------
// BOOKINGS
// ------------------------------------------------------------
/* Δημιουργία κράτησης (contract §2.4).
   ΠΡΟΣΟΧΗ: οι έλεγχοι διαθεσιμότητας είναι server-authoritative —
   εδώ τους μιμούμαστε ώστε το UI να δοκιμάζεται ρεαλιστικά. */
export async function createBooking({ eventId, ticketTypeId, numberOfTickets }) {
  if (USE_MOCK) {
    await delay()
    const me = getStoredUser()
    if (!me) throw apiError(401, 'UNAUTHENTICATED', 'Απαιτείται σύνδεση για κράτηση.')

    const event = mockEvents.find((e) => e.id === Number(eventId))
    if (!event) throw apiError(404, 'NOT_FOUND', 'Η εκδήλωση δεν βρέθηκε.')
    if (event.status !== 'PUBLISHED') {
      throw apiError(409, 'EVENT_NOT_ACTIVE', 'Η εκδήλωση δεν δέχεται κρατήσεις.')
    }

    const type = event.ticketTypes.find((t) => t.id === Number(ticketTypeId))
    if (!type) throw apiError(404, 'NOT_FOUND', 'Ο τύπος εισιτηρίου δεν βρέθηκε.')

    const count = Number(numberOfTickets)
    if (!Number.isInteger(count) || count < 1) {
      throw apiError(400, 'VALIDATION_ERROR', 'Μη έγκυρο πλήθος εισιτηρίων.')
    }
    if (count > type.available) {
      throw apiError(409, 'SEATS_UNAVAILABLE', 'Δεν υπάρχουν αρκετές διαθέσιμες θέσεις.')
    }

    // Ο server το κάνει ατομικά (transaction lock κατά overbooking).
    type.available -= count
    event.reservedTotal += count

    const booking = {
      id: nextId(mockBookings),
      eventId: event.id,
      eventTitle: event.title,
      attendee: { id: me.id, username: me.username },
      ticketTypeId: type.id,
      ticketTypeName: type.name,
      numberOfTickets: count,
      totalCost: (Number(type.price) * count).toFixed(2),
      status: 'CONFIRMED',
      time: new Date().toISOString(),
    }
    mockBookings.push(booking)
    return booking
  }
  const { data } = await client.post('/bookings', { eventId, ticketTypeId, numberOfTickets })
  return data
}

/* Οι κρατήσεις του συνδεδεμένου χρήστη, νεότερες πρώτα. */
export async function getMyBookings(params = {}) {
  if (USE_MOCK) {
    await delay()
    const me = getStoredUser()
    const items = mockBookings
      .filter((b) => b.attendee.id === me?.id)
      .sort((a, b) => b.time.localeCompare(a.time))
    return paginate(items, params.page, params.pageSize)
  }
  const { data } = await client.get('/bookings/mine', { params })
  return data
}

// ------------------------------------------------------------
// EVENTS — διαχείριση από τον διοργανωτή (owner-only ενέργειες)
// ------------------------------------------------------------

/* Ο συνδεδεμένος χρήστης — αλλιώς 401 (στο πραγματικό API το κρίνει το JWT). */
function requireUser() {
  const me = getStoredUser()
  if (!me) throw apiError(401, 'UNAUTHENTICATED', 'Απαιτείται σύνδεση.')
  return me
}

/* Εκδήλωση που ανήκει στον χρήστη — αλλιώς 404/403. */
function requireOwnedEvent(id, me) {
  const event = mockEvents.find((e) => e.id === Number(id))
  if (!event) throw apiError(404, 'NOT_FOUND', 'Η εκδήλωση δεν βρέθηκε.')
  if (event.organizer.id !== me.id) {
    throw apiError(403, 'FORBIDDEN', 'Δεν είστε ο διοργανωτής αυτής της εκδήλωσης.')
  }
  return event
}

/* Invariant του contract: Σ(quantity) ≤ capacity. */
function assertCapacity(payload) {
  const sum = payload.ticketTypes.reduce((t, type) => t + Number(type.quantity), 0)
  if (sum > Number(payload.capacity)) {
    throw apiError(409, 'CAPACITY_EXCEEDED',
      `Το σύνολο των εισιτηρίων (${sum}) ξεπερνά τη χωρητικότητα (${payload.capacity}).`)
  }
}

/* Επόμενο id τύπου εισιτηρίου — μοναδικό σε όλες τις εκδηλώσεις. */
function nextTicketTypeId() {
  const all = mockEvents.flatMap((e) => e.ticketTypes)
  return all.reduce((max, t) => Math.max(max, t.id), 0) + 1
}

/* Οι εκδηλώσεις που διοργανώνω — όλα τα statuses (contract §2.3). */
export async function getMyEvents(params = {}) {
  if (USE_MOCK) {
    await delay()
    const me = requireUser()
    const items = mockEvents
      .filter((e) => e.organizer.id === me.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return paginate(items, params.page, params.pageSize)
  }
  const { data } = await client.get('/events/mine', { params })
  return data
}

/* Δημιουργία: ο server ορίζει status/available/reservedTotal. */
export async function createEvent(payload) {
  if (USE_MOCK) {
    await delay()
    const me = requireUser()
    assertCapacity(payload)

    let ticketId = nextTicketTypeId()
    const event = {
      ...payload,
      id: nextId(mockEvents),
      capacity: Number(payload.capacity),
      ticketTypes: payload.ticketTypes.map((t) => ({
        id: ticketId++,
        name: t.name,
        price: Number(t.price).toFixed(2),
        quantity: Number(t.quantity),
        available: Number(t.quantity),
      })),
      organizer: { id: me.id, username: me.username },
      status: 'DRAFT',
      media: payload.media ?? [],
      reservedTotal: 0,
      isDeletable: true,
      createdAt: new Date().toISOString(),
    }
    mockEvents.push(event)
    return structuredClone(event)
  }
  const { data } = await client.post('/events', payload)
  return data
}

/* Ενημέρωση (owner). Οι ήδη κρατημένες θέσεις δεν χάνονται. */
export async function updateEvent(id, payload) {
  if (USE_MOCK) {
    await delay()
    const me = requireUser()
    const event = requireOwnedEvent(id, me)
    assertCapacity(payload)

    let ticketId = nextTicketTypeId()
    const ticketTypes = payload.ticketTypes.map((t) => {
      const existing = event.ticketTypes.find((x) => x.id === t.id)
      const quantity = Number(t.quantity)
      if (!existing) {
        return { id: ticketId++, name: t.name, price: Number(t.price).toFixed(2), quantity, available: quantity }
      }
      // Οι κρατημένες θέσεις αυτού του τύπου δεν μπορούν να «εξαφανιστούν».
      const reserved = existing.quantity - existing.available
      if (quantity < reserved) {
        throw apiError(409, 'CAPACITY_EXCEEDED',
          `Ο τύπος «${existing.name}» έχει ήδη ${reserved} κρατήσεις — δεν μπορεί να πέσει κάτω από αυτές.`)
      }
      return { id: existing.id, name: t.name, price: Number(t.price).toFixed(2), quantity, available: quantity - reserved }
    })

    Object.assign(event, {
      ...payload,
      id: event.id,
      capacity: Number(payload.capacity),
      ticketTypes,
      organizer: event.organizer,
      status: event.status,
      reservedTotal: event.reservedTotal,
      isDeletable: event.status === 'DRAFT' && event.reservedTotal === 0,
      createdAt: event.createdAt,
    })
    return structuredClone(event)
  }
  const { data } = await client.put(`/events/${id}`, payload)
  return data
}

/* Διαγραφή: επιτρέπεται μόνο σε πρόχειρη εκδήλωση χωρίς κρατήσεις. */
export async function deleteEvent(id) {
  if (USE_MOCK) {
    await delay()
    const me = requireUser()
    const event = requireOwnedEvent(id, me)
    const hasBookings = mockBookings.some((b) => b.eventId === event.id)
    if (event.status !== 'DRAFT' || hasBookings) {
      throw apiError(409, 'DELETE_NOT_ALLOWED',
        'Διαγράφονται μόνο πρόχειρες εκδηλώσεις χωρίς κρατήσεις.')
    }
    mockEvents.splice(mockEvents.indexOf(event), 1)
    return
  }
  await client.delete(`/events/${id}`)
}

/* Δημοσίευση: η εκδήλωση γίνεται ορατή στην αναζήτηση και δέχεται κρατήσεις. */
export async function publishEvent(id) {
  if (USE_MOCK) {
    await delay()
    const me = requireUser()
    const event = requireOwnedEvent(id, me)
    if (event.status !== 'DRAFT') {
      throw apiError(409, 'EVENT_NOT_ACTIVE', 'Μόνο πρόχειρες εκδηλώσεις δημοσιεύονται.')
    }
    event.status = 'PUBLISHED'
    event.isDeletable = false
    return structuredClone(event)
  }
  const { data } = await client.post(`/events/${id}/publish`)
  return data
}

/* Ακύρωση: τα δεδομένα διατηρούνται (ιστορικότητα) και ο server
   ειδοποιεί όσους έχουν κράτηση (εκφώνηση §10). */
export async function cancelEvent(id, note = '') {
  if (USE_MOCK) {
    await delay()
    const me = requireUser()
    const event = requireOwnedEvent(id, me)
    if (event.status !== 'PUBLISHED') {
      throw apiError(409, 'EVENT_NOT_ACTIVE', 'Ακυρώνονται μόνο δημοσιευμένες εκδηλώσεις.')
    }
    event.status = 'CANCELLED'

    // Μαζικό μήνυμα σε κάθε συμμετέχοντα με κράτηση (μία φορά ανά χρήστη).
    const attendees = new Map()
    for (const b of mockBookings.filter((b) => b.eventId === event.id)) {
      attendees.set(b.attendee.id, b.attendee)
    }
    for (const attendee of attendees.values()) {
      mockMessages.push({
        id: nextId(mockMessages),
        fromUser: { id: me.id, username: me.username },
        toUser: attendee,
        eventId: event.id,
        subject: `Ακύρωση: ${event.title}`,
        body: note || 'Η εκδήλωση ακυρώθηκε. Λυπούμαστε για την αναστάτωση.',
        read: false,
        sentAt: new Date().toISOString(),
      })
    }
    return structuredClone(event)
  }
  const { data } = await client.post(`/events/${id}/cancel`, { note })
  return data
}

/* Οι κρατήσεις μιας εκδήλωσης — μόνο ο διοργανωτής της. */
export async function getEventBookings(id, params = {}) {
  if (USE_MOCK) {
    await delay()
    const me = requireUser()
    const event = requireOwnedEvent(id, me)
    const items = mockBookings
      .filter((b) => b.eventId === event.id)
      .sort((a, b) => b.time.localeCompare(a.time))
    return paginate(items, params.page, params.pageSize)
  }
  const { data } = await client.get(`/events/${id}/bookings`, { params })
  return data
}
