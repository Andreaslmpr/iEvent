/* ============================================================
   Mock βάση δεδομένων (in-memory) — mock-first development.
   Επιτρέπει στο frontend να δουλεύει πλήρως ΧΩΡΙΣ το backend.
   Τα δεδομένα ακολουθούν τα DTOs του API_CONTRACT.md.
   Όταν συνδεθεί το backend του Ανδρέα, αλλάζουμε USE_MOCK=false.

   Σημ.: οι πίνακες είναι mutable — οι mock κλήσεις (π.χ. κράτηση)
   τους ενημερώνουν, ώστε η εφαρμογή να συμπεριφέρεται ρεαλιστικά
   όσο διαρκεί η περιήγηση (τα δεδομένα επανέρχονται σε refresh).
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

/* Κατηγορίες για το φίλτρο αναζήτησης. */
export const EVENT_CATEGORIES = [
  'Music', 'Theatre', 'Workshop', 'Art', 'Technology', 'Sports', 'Comedy', 'Food',
]

const ORG_NIKOS = { id: 7, username: 'org_athens_events' }
const ORG_MARIA = { id: 12, username: 'maria21' }

export const mockEvents = [
  {
    id: 1024,
    title: 'Συναυλία Σύγχρονης Μουσικής',
    categories: ['Music'], eventType: 'Concert',
    venue: 'Θέατρο Πόλης', address: 'Λεωφόρος Κεντρική 25',
    city: 'Αθήνα', country: 'Greece',
    geoLocation: { lat: 37.9838, lng: 23.7275 },
    startDateTime: '2026-07-12T20:30:00Z', endDateTime: '2026-07-12T23:00:00Z',
    capacity: 350,
    ticketTypes: [
      { id: 1, name: 'General Admission', price: '18.00', quantity: 250, available: 180 },
      { id: 2, name: 'Student', price: '12.00', quantity: 100, available: 75 },
    ],
    organizer: ORG_NIKOS, status: 'PUBLISHED',
    description: 'Βραδιά με έργα σύγχρονων δημιουργών και καλεσμένους μουσικούς. Η ορχήστρα δωματίου παρουσιάζει πρεμιέρες ελληνικών συνθέσεων.',
    media: [], reservedTotal: 95, isDeletable: false,
    createdAt: '2026-06-15T09:00:00Z',
  },
  {
    id: 1025,
    title: 'Σεμινάριο Φωτογραφίας',
    categories: ['Workshop', 'Art'], eventType: 'Seminar',
    venue: 'Κέντρο Δημιουργίας', address: 'Αριστοτέλους 5',
    city: 'Θεσσαλονίκη', country: 'Greece',
    geoLocation: { lat: 40.6401, lng: 22.9444 },
    startDateTime: '2026-08-03T17:00:00Z', endDateTime: '2026-08-03T20:00:00Z',
    capacity: 40,
    ticketTypes: [
      { id: 3, name: 'Συμμετοχή', price: '25.00', quantity: 40, available: 12 },
    ],
    organizer: ORG_NIKOS, status: 'PUBLISHED',
    description: 'Πρακτικό σεμινάριο ψηφιακής φωτογραφίας για αρχάριους: έκθεση, σύνθεση και βασική επεξεργασία.',
    media: [], reservedTotal: 28, isDeletable: false,
    createdAt: '2026-06-18T11:00:00Z',
  },
  {
    id: 1026,
    title: 'Θεατρική Παράσταση: Αντιγόνη',
    categories: ['Theatre'], eventType: 'Play',
    venue: 'Αρχαίο Θέατρο', address: 'Διονυσίου Αρεοπαγίτου 1',
    city: 'Αθήνα', country: 'Greece',
    geoLocation: { lat: 37.9705, lng: 23.7276 },
    startDateTime: '2026-07-20T21:00:00Z', endDateTime: '2026-07-20T23:15:00Z',
    capacity: 500,
    ticketTypes: [
      { id: 4, name: 'Πλατεία', price: '22.00', quantity: 300, available: 210 },
      { id: 5, name: 'Φοιτητικό', price: '15.00', quantity: 200, available: 140 },
    ],
    organizer: ORG_NIKOS, status: 'PUBLISHED',
    description: 'Η τραγωδία του Σοφοκλή σε σύγχρονη σκηνοθετική ανάγνωση, με ζωντανή μουσική επί σκηνής.',
    media: [], reservedTotal: 150, isDeletable: false,
    createdAt: '2026-05-30T08:00:00Z',
  },
  {
    id: 1027,
    title: 'Φεστιβάλ Τζαζ Πατρών',
    categories: ['Music'], eventType: 'Festival',
    venue: 'Πλατεία Γεωργίου', address: 'Πλατεία Γεωργίου Α',
    city: 'Πάτρα', country: 'Greece',
    geoLocation: { lat: 38.2466, lng: 21.7346 },
    startDateTime: '2026-09-05T19:00:00Z', endDateTime: '2026-09-06T01:00:00Z',
    capacity: 1200,
    ticketTypes: [
      { id: 6, name: 'Ημερήσιο', price: '30.00', quantity: 800, available: 640 },
      { id: 7, name: 'Early Bird', price: '20.00', quantity: 400, available: 0 },
    ],
    organizer: ORG_MARIA, status: 'PUBLISHED',
    description: 'Φεστιβάλ με ελληνικά και διεθνή τζαζ σχήματα, σε υπαίθριο χώρο στο κέντρο της πόλης.',
    media: [], reservedTotal: 560, isDeletable: false,
    createdAt: '2026-06-01T10:30:00Z',
  },
  {
    id: 1028,
    title: 'Συνέδριο Τεχνολογίας DevGreece',
    categories: ['Technology'], eventType: 'Conference',
    venue: 'Συνεδριακό Κέντρο', address: 'Λεωφ. Συγγρού 120',
    city: 'Αθήνα', country: 'Greece',
    geoLocation: { lat: 37.9601, lng: 23.7245 },
    startDateTime: '2026-10-15T09:00:00Z', endDateTime: '2026-10-15T18:00:00Z',
    capacity: 600,
    ticketTypes: [
      { id: 8, name: 'Full Pass', price: '60.00', quantity: 400, available: 320 },
      { id: 9, name: 'Φοιτητικό', price: '35.00', quantity: 200, available: 155 },
    ],
    organizer: ORG_NIKOS, status: 'PUBLISHED',
    description: 'Ημερίδα με ομιλίες για web development, τεχνητή νοημοσύνη και ασφάλεια εφαρμογών.',
    media: [], reservedTotal: 125, isDeletable: false,
    createdAt: '2026-06-20T09:15:00Z',
  },
  {
    id: 1029,
    title: 'Έκθεση Ζωγραφικής: Χρώματα του Βορρά',
    categories: ['Art'], eventType: 'Exhibition',
    venue: 'Δημοτική Πινακοθήκη', address: 'Βασιλίσσης Όλγας 162',
    city: 'Θεσσαλονίκη', country: 'Greece',
    geoLocation: { lat: 40.5965, lng: 22.9575 },
    startDateTime: '2026-09-01T10:00:00Z', endDateTime: '2026-09-01T20:00:00Z',
    capacity: 200,
    ticketTypes: [
      { id: 10, name: 'Ελεύθερη είσοδος', price: '0.00', quantity: 200, available: 168 },
    ],
    organizer: ORG_MARIA, status: 'PUBLISHED',
    description: 'Ομαδική έκθεση νέων εικαστικών με έργα εμπνευσμένα από το τοπίο της Βόρειας Ελλάδας.',
    media: [], reservedTotal: 32, isDeletable: false,
    createdAt: '2026-06-22T13:00:00Z',
  },
  {
    id: 1030,
    title: 'Φιλικός Αγώνας Καλαθοσφαίρισης',
    categories: ['Sports'], eventType: 'Match',
    venue: 'Κλειστό Γυμναστήριο', address: 'Λεωφ. Ικάρου 45',
    city: 'Ηράκλειο', country: 'Greece',
    geoLocation: { lat: 35.3387, lng: 25.1442 },
    startDateTime: '2026-09-12T19:30:00Z', endDateTime: '2026-09-12T21:30:00Z',
    capacity: 900,
    ticketTypes: [
      { id: 11, name: 'Κερκίδα', price: '10.00', quantity: 700, available: 520 },
      { id: 12, name: 'Παρκέ', price: '25.00', quantity: 200, available: 40 },
    ],
    organizer: ORG_NIKOS, status: 'PUBLISHED',
    description: 'Προετοιμασία της σεζόν με φιλικό αγώνα και δράσεις για τους μικρούς φιλάθλους στο ημίχρονο.',
    media: [], reservedTotal: 340, isDeletable: false,
    createdAt: '2026-06-25T16:40:00Z',
  },
  {
    id: 1031,
    title: 'Εργαστήριο Μεσογειακής Μαγειρικής',
    categories: ['Workshop', 'Food'], eventType: 'Workshop',
    venue: 'Culinary Lab', address: 'Πλαταιών 22',
    city: 'Αθήνα', country: 'Greece',
    geoLocation: { lat: 37.9789, lng: 23.7166 },
    startDateTime: '2026-08-25T18:00:00Z', endDateTime: '2026-08-25T21:00:00Z',
    capacity: 24,
    ticketTypes: [
      { id: 13, name: 'Θέση εργασίας', price: '45.00', quantity: 24, available: 6 },
    ],
    organizer: ORG_MARIA, status: 'PUBLISHED',
    description: 'Μαγειρεύουμε τρία πιάτα μεσογειακής κουζίνας με εποχικά υλικά — περιλαμβάνεται δείπνο.',
    media: [], reservedTotal: 18, isDeletable: false,
    createdAt: '2026-06-27T12:10:00Z',
  },
  {
    id: 1032,
    title: 'Βραδιά Stand-up Comedy',
    categories: ['Comedy'], eventType: 'Show',
    venue: 'Θέατρο Αλκμήνη', address: 'Αλκμήνης 12',
    city: 'Αθήνα', country: 'Greece',
    geoLocation: { lat: 37.9727, lng: 23.7091 },
    startDateTime: '2026-07-30T21:30:00Z', endDateTime: '2026-07-30T23:30:00Z',
    capacity: 180,
    ticketTypes: [
      { id: 14, name: 'Γενική είσοδος', price: '14.00', quantity: 180, available: 96 },
    ],
    organizer: ORG_NIKOS, status: 'PUBLISHED',
    description: 'Πέντε κωμικοί, μία σκηνή, καθόλου σενάριο. Αυστηρά για ενήλικες.',
    media: [], reservedTotal: 84, isDeletable: false,
    createdAt: '2026-06-28T18:20:00Z',
  },
  {
    id: 1033,
    title: 'Ροκ Συναυλία στη Λίμνη',
    categories: ['Music'], eventType: 'Concert',
    venue: 'Υπαίθριο Θέατρο', address: 'Παραλίμνιος Οδός 3',
    city: 'Ιωάννινα', country: 'Greece',
    geoLocation: { lat: 39.6675, lng: 20.8511 },
    startDateTime: '2026-08-22T21:00:00Z', endDateTime: '2026-08-23T00:30:00Z',
    capacity: 800,
    ticketTypes: [
      { id: 15, name: 'Προπώληση', price: '20.00', quantity: 600, available: 410 },
      { id: 16, name: 'Ταμείο', price: '25.00', quantity: 200, available: 200 },
    ],
    organizer: ORG_NIKOS, status: 'PUBLISHED',
    description: 'Τρία συγκροτήματα της εγχώριας ροκ σκηνής σε μια βραδιά δίπλα στη λίμνη.',
    media: [], reservedTotal: 190, isDeletable: false,
    createdAt: '2026-06-29T11:05:00Z',
  },
  {
    /* Πρόχειρη — δεν εμφανίζεται στην αναζήτηση (μόνο στο dashboard του owner, Φάση 3). */
    id: 1034,
    title: 'Χειμερινό Φεστιβάλ Χορού',
    categories: ['Theatre', 'Art'], eventType: 'Festival',
    venue: 'Στέγη Χορού', address: 'Πειραιώς 260',
    city: 'Αθήνα', country: 'Greece',
    geoLocation: { lat: 37.9784, lng: 23.7025 },
    startDateTime: '2026-12-05T20:00:00Z', endDateTime: '2026-12-05T22:30:00Z',
    capacity: 300,
    ticketTypes: [
      { id: 17, name: 'Γενική είσοδος', price: '16.00', quantity: 300, available: 300 },
    ],
    organizer: ORG_MARIA, status: 'DRAFT',
    description: 'Υπό προετοιμασία — τριήμερο σύγχρονου χορού με ελληνικές και ξένες ομάδες.',
    media: [], reservedTotal: 0, isDeletable: true,
    createdAt: '2026-06-30T09:00:00Z',
  },
  {
    /* Ακυρωμένη — τα δεδομένα διατηρούνται για ιστορικότητα (contract §2.3). */
    id: 1035,
    title: 'Υπαίθρια Προβολή Ταινίας',
    categories: ['Art'], eventType: 'Screening',
    venue: 'Πάρκο Πόλης', address: 'Κηφισίας 100',
    city: 'Αθήνα', country: 'Greece',
    geoLocation: { lat: 38.0209, lng: 23.7908 },
    startDateTime: '2026-07-05T21:00:00Z', endDateTime: '2026-07-05T23:00:00Z',
    capacity: 250,
    ticketTypes: [
      { id: 18, name: 'Γενική είσοδος', price: '8.00', quantity: 250, available: 244 },
    ],
    organizer: ORG_NIKOS, status: 'CANCELLED',
    description: 'Η προβολή ακυρώθηκε λόγω δυσμενών καιρικών συνθηκών.',
    media: [], reservedTotal: 6, isDeletable: false,
    createdAt: '2026-06-10T15:00:00Z',
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
  {
    id: 502, eventId: 1026, eventTitle: 'Θεατρική Παράσταση: Αντιγόνη',
    attendee: { id: 12, username: 'maria21' },
    ticketTypeId: 5, ticketTypeName: 'Φοιτητικό',
    numberOfTickets: 1, totalCost: '15.00',
    status: 'CONFIRMED', time: '2026-06-24T09:05:00Z',
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

/* Επόμενο id — στο πραγματικό backend το δίνει η βάση (auto-increment). */
export function nextId(collection) {
  return collection.reduce((max, item) => Math.max(max, item.id), 0) + 1
}
