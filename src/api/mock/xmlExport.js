/* ============================================================
   Παραγωγή XML εκδηλώσεων ΑΚΡΙΒΩΣ κατά το DTD της εκφώνησης (§7).

   ΠΡΟΣΟΧΗ — mock μόνο: στην πραγματική εφαρμογή το XML το παράγει
   ο server (GET /admin/events/export?format=xml). Το κρατάμε εδώ
   ώστε η λειτουργία να είναι επιδείξιμη όσο δουλεύουμε mock-first.

   Σειρά στοιχείων (την επιβάλλει το DTD):
   Title, Category+, EventType, Venue, Address, City, Country,
   GeoLocation?, StartDateTime, EndDateTime, Capacity, TicketTypes,
   Bookings, Organizer, Status, Description, Media?
   ============================================================ */

/* Διαφυγή χαρακτήρων που έχουν ειδική σημασία στην XML. */
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/* Το παράδειγμα του DTD δίνει τοπική μορφή χωρίς ζώνη: 2026-07-12T20:30:00 */
function xmlDateTime(iso) {
  return String(iso ?? '').replace(/\.\d{3}Z$/, '').replace(/Z$/, '')
}

const tag = (name, value, indent) => `${indent}<${name}>${esc(value)}</${name}>`

function ticketTypeXml(type, indent) {
  return [
    `${indent}<TicketType TicketTypeID="T${type.id}">`,
    tag('Name', type.name, indent + '  '),
    tag('Price', type.price, indent + '  '),
    tag('Quantity', type.quantity, indent + '  '),
    tag('Available', type.available, indent + '  '),
    `${indent}</TicketType>`,
  ].join('\n')
}

function bookingXml(booking, indent) {
  return [
    `${indent}<Booking BookingID="B${booking.id}">`,
    `${indent}  <Attendee UserID="${esc(booking.attendee.username)}"/>`,
    tag('Time', xmlDateTime(booking.time), indent + '  '),
    tag('TicketTypeRef', `T${booking.ticketTypeId}`, indent + '  '),
    tag('NumberOfTickets', booking.numberOfTickets, indent + '  '),
    tag('TotalCost', booking.totalCost, indent + '  '),
    tag('BookingStatus', booking.status, indent + '  '),
    `${indent}</Booking>`,
  ].join('\n')
}

function eventXml(event, bookings) {
  const i = '    '
  const lines = [`  <Event EventID="EV${event.id}">`]

  lines.push(tag('Title', event.title, i))
  // Category+ : μία εκδήλωση μπορεί να ανήκει σε πολλές κατηγορίες.
  for (const category of event.categories) lines.push(tag('Category', category, i))
  lines.push(tag('EventType', event.eventType, i))
  lines.push(tag('Venue', event.venue, i))
  lines.push(tag('Address', event.address, i))
  lines.push(tag('City', event.city, i))
  lines.push(tag('Country', event.country, i))

  if (event.geoLocation) {
    lines.push(`${i}<GeoLocation Latitude="${esc(event.geoLocation.lat)}" Longitude="${esc(event.geoLocation.lng)}"/>`)
  }

  lines.push(tag('StartDateTime', xmlDateTime(event.startDateTime), i))
  lines.push(tag('EndDateTime', xmlDateTime(event.endDateTime), i))
  lines.push(tag('Capacity', event.capacity, i))

  lines.push(`${i}<TicketTypes>`)
  for (const type of event.ticketTypes) lines.push(ticketTypeXml(type, i + '  '))
  lines.push(`${i}</TicketTypes>`)

  // Bookings: υποχρεωτικό στοιχείο, μπορεί να είναι κενό (Booking*).
  const own = bookings.filter((b) => b.eventId === event.id)
  if (own.length === 0) {
    lines.push(`${i}<Bookings/>`)
  } else {
    lines.push(`${i}<Bookings>`)
    for (const booking of own) lines.push(bookingXml(booking, i + '  '))
    lines.push(`${i}</Bookings>`)
  }

  lines.push(`${i}<Organizer UserID="${esc(event.organizer.username)}"/>`)
  lines.push(tag('Status', event.status, i))
  lines.push(tag('Description', event.description, i))

  if (event.media?.length) {
    lines.push(`${i}<Media>`)
    for (const photo of event.media) lines.push(tag('Photo', photo, i + '  '))
    lines.push(`${i}</Media>`)
  }

  lines.push('  </Event>')
  return lines.join('\n')
}

/* Ολόκληρο το έγγραφο: root <Events> με όλες τις εκδηλώσεις. */
export function eventsToXml(events, bookings) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Events>',
    ...events.map((event) => eventXml(event, bookings)),
    '</Events>',
    '',
  ].join('\n')
}
