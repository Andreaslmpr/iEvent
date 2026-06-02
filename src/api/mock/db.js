/* ============================================================
   Mock βάση δεδομένων (in-memory) — mock-first development.
   Επιτρέπει στο frontend να δουλεύει πλήρως ΧΩΡΙΣ το backend.
   Τα δεδομένα ακολουθούν τα DTOs του API_CONTRACT.md.
   Όταν συνδεθεί το backend του Ανδρέα, αλλάζουμε USE_MOCK=false.
   ============================================================ */

export const mockUsers = [
  {
    id: 1, username: 'admin', firstName: 'Δια', lastName: 'χειριστής',
    email: 'admin@stayapp.gr', phone: '+302100000000', address: '—',
    city: 'Αθήνα', country: 'Greece', geoLocation: { lat: 37.98, lng: 23.72 },
    afm: '000000000', status: 'APPROVED', role: 'ADMIN',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 12, username: 'maria21', firstName: 'Μαρία', lastName: 'Παπαδοπούλου',
    email: 'maria@example.com', phone: '+302101234567', address: 'Λεωφ. Κεντρική 25',
    city: 'Αθήνα', country: 'Greece', geoLocation: { lat: 37.9838, lng: 23.7275 },
    afm: '123456789', status: 'APPROVED', role: 'USER',
    createdAt: '2026-05-20T10:00:00Z',
  },
  {
    id: 7, username: 'org_athens_events', firstName: 'Νίκος', lastName: 'Γεωργίου',
    email: 'nikos@events.gr', phone: '+302109998877', address: 'Πλ. Συντάγματος 1',
    city: 'Αθήνα', country: 'Greece', geoLocation: { lat: 37.975, lng: 23.734 },
    afm: '987654321', status: 'APPROVED', role: 'USER',
    createdAt: '2026-04-10T09:00:00Z',
  },
  {
    id: 20, username: 'pending_user', firstName: 'Έλενα', lastName: 'Δήμου',
    email: 'elena@example.com', phone: '+302107776655', address: 'Ερμού 10',
    city: 'Θεσσαλονίκη', country: 'Greece', geoLocation: { lat: 40.64, lng: 22.94 },
    afm: '456789123', status: 'PENDING', role: 'USER',
    createdAt: '2026-06-01T12:00:00Z',
  },
]

/* Mock κωδικοί (μόνο για development — στο πραγματικό backend είναι hashed). */
export const mockPasswords = {
  admin: 'admin123',
  maria21: 'maria123',
  org_athens_events: 'nikos123',
  pending_user: 'elena123',
}

export const mockEvents = [
  {
    id: 1024,
    title: 'Συναυλία Σύγχρονης Μουσικής',
    categories: ['Music', 'Live Performance'],
    eventType: 'Concert',
    venue: 'Θέατρο Πόλης', address: 'Λεωφόρος Κεντρική 25',
    city: 'Αθήνα', country: 'Greece',
    geoLocation: { lat: 37.9838, lng: 23.7275 },
    startDateTime: '2026-07-12T20:30:00Z',
    endDateTime: '2026-07-12T23:00:00Z',
    capacity: 350,
    ticketTypes: [
      { id: 1, name: 'General Admission', price: '18.00', quantity: 250, available: 180 },
      { id: 2, name: 'Student', price: '12.00', quantity: 100, available: 75 },
    ],
    organizer: { id: 7, username: 'org_athens_events' },
    status: 'PUBLISHED',
    description: 'Βραδιά με έργα σύγχρονων δημιουργών και καλεσμένους μουσικούς.',
    media: ['cover1.jpg'],
    reservedTotal: 95,
    isDeletable: false,
    createdAt: '2026-06-15T09:00:00Z',
  },
  {
    id: 1025,
    title: 'Σεμινάριο Φωτογραφίας',
    categories: ['Workshop', 'Art'],
    eventType: 'Seminar',
    venue: 'Κέντρο Δημιουργίας', address: 'Αριστοτέλους 5',
    city: 'Θεσσαλονίκη', country: 'Greece',
    geoLocation: { lat: 40.6401, lng: 22.9444 },
    startDateTime: '2026-08-03T17:00:00Z',
    endDateTime: '2026-08-03T20:00:00Z',
    capacity: 40,
    ticketTypes: [
      { id: 3, name: 'Συμμετοχή', price: '25.00', quantity: 40, available: 12 },
    ],
    organizer: { id: 7, username: 'org_athens_events' },
    status: 'PUBLISHED',
    description: 'Πρακτικό σεμινάριο ψηφιακής φωτογραφίας για αρχάριους.',
    media: [],
    reservedTotal: 28,
    isDeletable: false,
    createdAt: '2026-06-18T11:00:00Z',
  },
]

export const mockBookings = [
  {
    id: 501, eventId: 1024, eventTitle: 'Συναυλία Σύγχρονης Μουσικής',
    attendee: { id: 12, username: 'maria21' },
    ticketTypeId: 1, ticketTypeName: 'General Admission',
    numberOfTickets: 2, totalCost: '36.00',
    status: 'CONFIRMED', time: '2026-06-20T11:42:10Z',
  },
]

export const mockMessages = [
  {
    id: 88,
    fromUser: { id: 7, username: 'org_athens_events' },
    toUser: { id: 12, username: 'maria21' },
    eventId: 1024,
    subject: 'Σχετικά με την κράτησή σας',
    body: 'Καλησπέρα Μαρία, σας περιμένουμε στη συναυλία!',
    read: false,
    sentAt: '2026-06-21T08:00:00Z',
  },
]
