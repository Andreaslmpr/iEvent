/* NotFound — σελίδα 404 για άγνωστα routes. */
import { Link } from 'react-router-dom'
import './events/events-pages.css'

export default function NotFound() {
  return (
    <div className="container page not-found">
      <p className="not-found__code" aria-hidden="true">404</p>
      <h1 className="not-found__title">Η σελίδα δεν βρέθηκε</h1>
      <p className="not-found__text">
        Ίσως ο σύνδεσμος είναι παλιός ή η εκδήλωση δεν υπάρχει πια.
      </p>
      <div className="not-found__actions">
        <Link to="/events" className="btn btn--primary btn--lg">Δες εκδηλώσεις</Link>
        <Link to="/" className="btn btn--outline btn--lg">Αρχική σελίδα</Link>
      </div>
    </div>
  )
}
