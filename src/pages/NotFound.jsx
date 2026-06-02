/* NotFound — σελίδα 404 για άγνωστα routes. */
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="container page" style={{ textAlign: 'center' }}>
      <h1>404</h1>
      <p style={{ color: 'var(--color-ink-soft)', margin: 'var(--space-3) 0 var(--space-5)' }}>
        Η σελίδα που ζητήσατε δεν βρέθηκε.
      </p>
      <Link to="/" className="btn btn--primary">Επιστροφή στην αρχική</Link>
    </div>
  )
}
