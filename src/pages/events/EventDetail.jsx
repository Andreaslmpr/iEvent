/* ============================================================
   EventDetail — πλήρη στοιχεία εκδήλωσης + χάρτης + κράτηση
   (εκφώνηση §3 & §9).

   Ροή κράτησης: επιλογή τύπου εισιτηρίου → πλήθος → «Κράτηση»
   → παράθυρο επιβεβαίωσης (η κράτηση είναι μη αναστρέψιμη)
   → POST /bookings → ενημέρωση διαθεσιμότητας από τον server.
   ============================================================ */
import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom'
import { getEvent, createBooking, mediaUrl } from '../../api/index.js'
import { useAuth } from '../../context/AuthContext.jsx'
import EventMap from '../../components/events/EventMap.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Loader from '../../components/ui/Loader.jsx'
import {
  formatRange, formatMoney, totalAvailable, errorMessage, EVENT_STATUS,
} from '../../utils/format.js'
import './events-pages.css'

export default function EventDetail() {
  const { id } = useParams()
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Κατάσταση φόρμας κράτησης
  const [ticketTypeId, setTicketTypeId] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [success, setSuccess] = useState(null)

  /* Φόρτωση (και επαναφόρτωση μετά από κράτηση, ώστε οι θέσεις να
     έρχονται πάντα από τον server — αυτός είναι η πηγή αλήθειας). */
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    getEvent(id)
      .then((data) => {
        if (cancelled) return
        setEvent(data)
        // Προεπιλογή: ο πρώτος τύπος με διαθέσιμες θέσεις.
        const firstAvailable = data.ticketTypes.find((t) => t.available > 0)
        setTicketTypeId((firstAvailable ?? data.ticketTypes[0])?.id ?? null)
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, 'Η εκδήλωση δεν βρέθηκε.'))
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [id])

  if (loading) return <div className="container page"><Loader label="Φόρτωση εκδήλωσης…" /></div>

  if (error || !event) {
    return (
      <div className="container page">
        <Alert kind="error">{error || 'Η εκδήλωση δεν βρέθηκε.'}</Alert>
        <p style={{ marginTop: 'var(--space-4)' }}>
          <Link to="/events">← Πίσω στις εκδηλώσεις</Link>
        </p>
      </div>
    )
  }

  const selected = event.ticketTypes.find((t) => t.id === ticketTypeId)
  const seatsLeft = totalAvailable(event)
  const isOrganizer = user?.id === event.organizer.id
  // Εκφώνηση §9: κρατήσεις μόνο όσο η εκδήλωση είναι ενεργή. Ο server το
  // ελέγχει ούτως ή άλλως (409)· εδώ απλώς δεν προσφέρουμε κουμπί που θα αποτύχει.
  const hasStarted = new Date(event.startDateTime) <= new Date()
  const isBookable = event.status === 'PUBLISHED' && !hasStarted && seatsLeft > 0
  const photos = event.media ?? []
  const maxQuantity = selected?.available ?? 0
  const total = selected ? Number(selected.price) * quantity : 0
  const status = EVENT_STATUS[event.status]

  function handleSelectType(type) {
    setTicketTypeId(type.id)
    // Το πλήθος δεν πρέπει να ξεπερνά τη διαθεσιμότητα του νέου τύπου.
    setQuantity((q) => Math.min(Math.max(1, q), Math.max(1, type.available)))
    setBookingError('')
  }

  function handleBookClick() {
    if (!isAuthenticated) {
      // Ο επισκέπτης στέλνεται στο login και επιστρέφει εδώ μετά.
      navigate('/login', { state: { from: location } })
      return
    }
    setBookingError('')
    setConfirming(true)
  }

  async function handleConfirm() {
    setSubmitting(true)
    setBookingError('')
    try {
      const booking = await createBooking({
        eventId: event.id,
        ticketTypeId: selected.id,
        numberOfTickets: quantity,
      })
      setSuccess(booking)
      setConfirming(false)
      // Ξαναδιαβάζουμε την εκδήλωση για ενημερωμένες διαθέσιμες θέσεις.
      const refreshed = await getEvent(id)
      setEvent(refreshed)
    } catch (err) {
      setBookingError(errorMessage(err, 'Η κράτηση δεν ολοκληρώθηκε.'))
      setConfirming(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container page">
      <p className="detail__back"><Link to="/events">← Όλες οι εκδηλώσεις</Link></p>

      <header className="detail__head">
        <div className="detail__tags">
          {event.categories.map((c) => <span key={c} className="badge">{c}</span>)}
          {event.status !== 'PUBLISHED' && (
            <span className={`badge ${status.variant}`}>{status.label}</span>
          )}
        </div>
        <h1>{event.title}</h1>
        <p className="detail__when">{formatRange(event.startDateTime, event.endDateTime)}</p>
      </header>

      <div className="detail__grid">
        {/* ---------- Αριστερά: περιγραφή, στοιχεία, χάρτης ---------- */}
        <div className="detail__main">
          <section className="detail__section">
            <h2>Περιγραφή</h2>
            <p className="detail__text">{event.description}</p>
          </section>

          {photos.length > 0 && (
            <section className="detail__section">
              <h2>Φωτογραφίες</h2>
              <ul className="gallery">
                {photos.map((name, index) => (
                  <li key={name}>
                    <a href={mediaUrl(name)} target="_blank" rel="noreferrer">
                      <img
                        src={mediaUrl(name)} className="gallery__img" loading="lazy"
                        alt={`${event.title} — φωτογραφία ${index + 1}`}
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="detail__section">
            <h2>Στοιχεία</h2>
            <dl className="detail__facts">
              <div><dt>Τύπος</dt><dd>{event.eventType}</dd></div>
              <div><dt>Χώρος</dt><dd>{event.venue}</dd></div>
              <div><dt>Διεύθυνση</dt><dd>{event.address}, {event.city}, {event.country}</dd></div>
              <div><dt>Διοργανωτής</dt><dd>{event.organizer.username}</dd></div>
              <div><dt>Χωρητικότητα</dt><dd>{event.capacity} άτομα</dd></div>
              <div><dt>Κρατήσεις</dt><dd>{event.reservedTotal} θέσεις</dd></div>
            </dl>
          </section>

          <section className="detail__section">
            <h2>Τοποθεσία</h2>
            <EventMap geoLocation={event.geoLocation} label={event.venue} />
          </section>
        </div>

        {/* ---------- Δεξιά: πάνελ κράτησης ---------- */}
        <aside className="detail__aside">
          <div className="card booking">
            <h2 className="booking__title">Κράτηση θέσης</h2>

            {success && (
              <Alert kind="success">
                Η κράτηση καταχωρήθηκε ({success.numberOfTickets} εισιτήρια ·{' '}
                {formatMoney(success.totalCost)}).{' '}
                <Link to="/bookings">Δες τις κρατήσεις σου</Link>
              </Alert>
            )}

            <Alert kind="error">{bookingError}</Alert>

            {isOrganizer && (
              <p className="booking__note">Είστε ο διοργανωτής αυτής της εκδήλωσης.</p>
            )}

            {event.status !== 'PUBLISHED' ? (
              <p className="booking__note">
                Η εκδήλωση δεν δέχεται κρατήσεις ({status.label.toLowerCase()}).
              </p>
            ) : hasStarted ? (
              <p className="booking__note">
                Η εκδήλωση έχει ήδη ξεκινήσει και δεν δέχεται νέες κρατήσεις.
              </p>
            ) : (
              <>
                <ul className="ticket-list">
                  {event.ticketTypes.map((type) => {
                    const soldOut = type.available === 0
                    return (
                      <li key={type.id}>
                        <label className={`ticket ${ticketTypeId === type.id ? 'ticket--on' : ''} ${soldOut ? 'ticket--out' : ''}`}>
                          <input
                            type="radio"
                            name="ticketType"
                            checked={ticketTypeId === type.id}
                            onChange={() => handleSelectType(type)}
                            disabled={soldOut}
                          />
                          <span className="ticket__info">
                            <span className="ticket__name">{type.name}</span>
                            <span className="ticket__seats">
                              {soldOut ? 'Εξαντλήθηκε' : `${type.available} διαθέσιμα`}
                            </span>
                          </span>
                          <span className="ticket__price">{formatMoney(type.price)}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>

                <div className="booking__qty">
                  <label htmlFor="quantity">Εισιτήρια</label>
                  <input
                    id="quantity"
                    className="booking__input"
                    type="number"
                    min="1"
                    max={maxQuantity}
                    value={quantity}
                    disabled={!isBookable || maxQuantity === 0}
                    onChange={(e) => {
                      const n = Number(e.target.value)
                      // Κρατάμε το πλήθος μέσα στα όρια διαθεσιμότητας.
                      setQuantity(Math.min(Math.max(1, n || 1), Math.max(1, maxQuantity)))
                    }}
                  />
                </div>

                <p className="booking__total">
                  <span>Σύνολο</span>
                  <strong>{formatMoney(total.toFixed(2))}</strong>
                </p>

                <button
                  className="btn btn--primary btn--lg booking__cta"
                  onClick={handleBookClick}
                  disabled={!isBookable || maxQuantity === 0}
                >
                  {!isAuthenticated ? 'Σύνδεση για κράτηση' : 'Κράτηση'}
                </button>

                {!isAuthenticated && (
                  <p className="booking__note">
                    Χρειάζεται λογαριασμός για να κάνετε κράτηση.
                  </p>
                )}
                {seatsLeft === 0 && (
                  <p className="booking__note">Δεν υπάρχουν διαθέσιμες θέσεις.</p>
                )}
              </>
            )}
          </div>
        </aside>
      </div>

      {confirming && (
        <Modal
          title="Επιβεβαίωση κράτησης"
          confirmLabel="Επιβεβαίωση"
          busy={submitting}
          onClose={() => setConfirming(false)}
          onConfirm={handleConfirm}
        >
          Πρόκειται να κρατήσετε <strong>{quantity}</strong>{' '}
          {quantity === 1 ? 'εισιτήριο' : 'εισιτήρια'} τύπου{' '}
          <strong>{selected?.name}</strong> για την εκδήλωση{' '}
          <strong>{event.title}</strong>. Συνολικό κόστος{' '}
          <strong>{formatMoney(total.toFixed(2))}</strong>.
          <br /><br />
          Η κράτηση <strong>δεν αναιρείται</strong> μετά την επιβεβαίωση.
        </Modal>
      )}
    </div>
  )
}
