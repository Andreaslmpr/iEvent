/* ============================================================
   MyBookings — «Οι κρατήσεις μου» (εκφώνηση §9).
   Ιστορικό κρατήσεων του συνδεδεμένου χρήστη, νεότερες πρώτα.
   ============================================================ */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyBookings } from '../../api/index.js'
import Loader from '../../components/ui/Loader.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import { formatDateTime, formatMoney, errorMessage, BOOKING_STATUS } from '../../utils/format.js'
import './MyBookings.css'

const PAGE_SIZE = 10

export default function MyBookings() {
  const [result, setResult] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    getMyBookings({ page, pageSize: PAGE_SIZE })
      .then((data) => { if (!cancelled) setResult(data) })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, 'Αδυναμία φόρτωσης των κρατήσεων.'))
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [page])

  const items = result?.items ?? []

  return (
    <div className="container page">
      <header className="page__head">
        <h1>Οι κρατήσεις μου</h1>
        {result && !loading && result.total > 0 && (
          <p className="page__sub">{result.total} κρατήσεις</p>
        )}
      </header>

      <Alert kind="error">{error}</Alert>

      {loading && <Loader label="Φόρτωση κρατήσεων…" />}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="Δεν έχετε κρατήσεις ακόμη"
          text="Βρείτε μια εκδήλωση που σας ενδιαφέρει και κρατήστε τη θέση σας."
          action={<Link to="/events" className="btn btn--primary">Δες εκδηλώσεις</Link>}
        />
      )}

      {!loading && items.length > 0 && (
        <>
          <div className="bookings-list">
            {items.map((booking) => {
              const status = BOOKING_STATUS[booking.status]
              return (
                <article key={booking.id} className="card booking-row">
                  <div>
                    <h2 className="booking-row__title">
                      <Link to={`/events/${booking.eventId}`}>{booking.eventTitle}</Link>
                    </h2>
                    <p className="booking-row__meta">
                      {booking.ticketTypeName} · {booking.numberOfTickets}{' '}
                      {booking.numberOfTickets === 1 ? 'εισιτήριο' : 'εισιτήρια'}
                    </p>
                    <p className="booking-row__time">
                      Κράτηση: {formatDateTime(booking.time)}
                    </p>
                  </div>

                  <div className="booking-row__side">
                    <span className={`badge ${status.variant}`}>{status.label}</span>
                    <span className="booking-row__cost">{formatMoney(booking.totalCost)}</span>
                    {/* Η επικοινωνία με τον διοργανωτή επιτρέπεται μετά την κράτηση. */}
                    <Link to={`/messages?event=${booking.eventId}`} className="btn btn--muted">
                      Μήνυμα στον διοργανωτή
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
          <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  )
}
