/* ============================================================
   EventCard — μία εκδήλωση μέσα στη λίστα αναζήτησης.
   Δείχνει τα ελάχιστα που χρειάζεται ο χρήστης για να αποφασίσει:
   τίτλος, πότε, πού, κατηγορίες, από πόσο και αν έχει θέσεις.
   ============================================================ */
import { Link } from 'react-router-dom'
import { mediaUrl } from '../../api/index.js'
import { formatDateTime, formatMoney, minPrice, totalAvailable } from '../../utils/format.js'
import './EventCard.css'

export default function EventCard({ event }) {
  const from = minPrice(event)
  const seats = totalAvailable(event)

  return (
    <Link to={`/events/${event.id}`} className="card event-card">
      {/* Εξώφυλλο: η πρώτη φωτογραφία, αλλιώς ο τύπος εκδήλωσης σε ντεγκραντέ. */}
      {event.media?.length > 0 ? (
        <img
          src={mediaUrl(event.media[0])} alt="" loading="lazy"
          className="event-card__thumb event-card__thumb--photo"
        />
      ) : (
        <div className="event-card__thumb">{event.eventType}</div>
      )}

      <div className="event-card__body">
        <h3 className="event-card__title">{event.title}</h3>

        <p className="event-card__meta">{formatDateTime(event.startDateTime)}</p>
        <p className="event-card__meta">
          {event.venue} · {event.city}
        </p>

        <div className="event-card__tags">
          {event.categories.map((c) => (
            <span key={c} className="badge">{c}</span>
          ))}
        </div>

        <div className="event-card__foot">
          <span className="event-card__price">
            {from === 0 ? 'Ελεύθερη είσοδος' : <><small>από </small>{formatMoney(from)}</>}
          </span>
          <span className={`event-card__seats ${seats === 0 ? 'event-card__seats--out' : ''}`}>
            {seats === 0 ? 'Εξαντλήθηκε' : `${seats} θέσεις`}
          </span>
        </div>
      </div>
    </Link>
  )
}
