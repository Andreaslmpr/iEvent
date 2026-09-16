/* Footer — κοινό κάτω μέρος όλων των σελίδων. */
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import './Footer.css'

export default function Footer() {
  const { isAuthenticated } = useAuth()

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div>
          <p className="footer__brand">Stay<span>App</span></p>
          <p className="footer__text">Εκδηλώσεις και ηλεκτρονικές κρατήσεις θέσεων.</p>
        </div>

        <nav className="footer__links" aria-label="Σύνδεσμοι υποσέλιδου">
          <Link to="/events">Εκδηλώσεις</Link>
          {isAuthenticated ? (
            <>
              <Link to="/bookings">Οι κρατήσεις μου</Link>
              <Link to="/dashboard/events/new">Νέα εκδήλωση</Link>
            </>
          ) : (
            <>
              <Link to="/login">Είσοδος</Link>
              <Link to="/register">Εγγραφή</Link>
            </>
          )}
        </nav>
      </div>
      <p className="container footer__legal">
        Εργασία ΤΕΔ 2026 · Λαμπρόπουλος Ανδρέας · Πατσάκας Γεώργιος
      </p>
    </footer>
  )
}
