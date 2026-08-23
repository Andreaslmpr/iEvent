/* ============================================================
   EventBookings — οι κρατήσεις μιας εκδήλωσης (contract §2.3:
   GET /events/{id}/bookings — μόνο ο διοργανωτής, αλλιώς 403).
   ============================================================ */
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getEvent, getEventBookings } from '../../api/index.js'
import Loader from '../../components/ui/Loader.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import { formatDateTime, formatMoney, errorMessage, BOOKING_STATUS } from '../../utils/format.js'
import '../events/events-pages.css'
import './dashboard.css'

const PAGE_SIZE = 20

export default function EventBookings() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [result, setResult] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    // Ο τίτλος/χωρητικότητα από την εκδήλωση, οι κρατήσεις από το δικό της endpoint.
    Promise.all([getEvent(id), getEventBookings(id, { page, pageSize: PAGE_SIZE })])
      .then(([eventData, bookingsData]) => {
        if (cancelled) return
        setEvent(eventData)
        setResult(bookingsData)
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, 'Αδυναμία φόρτωσης των κρατήσεων.'))
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [id, page])

  const items = result?.items ?? []
  const revenue = items.reduce((sum, b) => sum + Number(b.totalCost), 0)

  return (
    <div className="container page">
      <p className="detail__back"><Link to="/dashboard">← Οι εκδηλώσεις μου</Link></p>

      <header className="page__head">
        <h1>Κρατήσεις{event ? `: ${event.title}` : ''}</h1>
      </header>

      <Alert kind="error">{error}</Alert>

      {loading && <Loader label="Φόρτωση κρατήσεων…" />}

      {!loading && !error && event && (
        <div className="summary">
          <div className="summary__item">
            <span className="summary__label">Κρατήσεις</span>
            <span className="summary__value">{result.total}</span>
          </div>
          <div className="summary__item">
            <span className="summary__label">Θέσεις</span>
            <span className="summary__value">{event.reservedTotal} / {event.capacity}</span>
          </div>
          <div className="summary__item">
            <span className="summary__label">Έσοδα σελίδας</span>
            <span className="summary__value">{formatMoney(revenue.toFixed(2))}</span>
          </div>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="Καμία κράτηση ακόμη"
          text="Μόλις κάποιος κρατήσει θέση, θα εμφανιστεί εδώ."
        />
      )}

      {!loading && items.length > 0 && (
        <>
          <div className="card table-wrap">
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>Συμμετέχων</th>
                  <th>Τύπος εισιτηρίου</th>
                  <th className="bookings-table__num">Εισιτήρια</th>
                  <th className="bookings-table__num">Κόστος</th>
                  <th>Κατάσταση</th>
                  <th>Ημερομηνία</th>
                </tr>
              </thead>
              <tbody>
                {items.map((booking) => {
                  const status = BOOKING_STATUS[booking.status]
                  return (
                    <tr key={booking.id}>
                      <td>{booking.attendee.username}</td>
                      <td>{booking.ticketTypeName}</td>
                      <td className="bookings-table__num">{booking.numberOfTickets}</td>
                      <td className="bookings-table__num">{formatMoney(booking.totalCost)}</td>
                      <td><span className={`badge ${status.variant}`}>{status.label}</span></td>
                      <td>{formatDateTime(booking.time)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  )
}
