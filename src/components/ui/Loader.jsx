/* Loader — ένδειξη φόρτωσης για λίστες/σελίδες που περιμένουν το API. */
import './feedback.css'

export default function Loader({ label = 'Φόρτωση…' }) {
  return (
    <div className="state state--plain" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p className="state__text">{label}</p>
    </div>
  )
}
