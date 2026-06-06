/* ============================================================
   Pending — σελίδα μετά την εγγραφή (εκφώνηση §2):
   ενημερώνει ότι εκκρεμεί η έγκριση από τον διαχειριστή.
   ============================================================ */
import { Link } from 'react-router-dom'
import AuthLayout from '../../components/auth/AuthLayout.jsx'
import './auth-pages.css'

export default function Pending() {
  return (
    <AuthLayout title="Σχεδόν έτοιμα!">
      <div className="pending">
        <div className="pending__icon" aria-hidden="true">✓</div>
        <p className="pending__text">
          Η αίτηση εγγραφής σου καταχωρήθηκε με επιτυχία και
          <strong> εκκρεμεί έγκριση από τον διαχειριστή</strong>.
        </p>
        <p className="pending__text pending__text--soft">
          Μόλις εγκριθεί ο λογαριασμός σου, θα μπορείς να συνδεθείς και να
          πραγματοποιείς κρατήσεις. Μέχρι τότε μπορείς να περιηγηθείς στις εκδηλώσεις.
        </p>
        <div className="pending__actions">
          <Link to="/events" className="btn btn--primary">Περιήγηση εκδηλώσεων</Link>
          <Link to="/login" className="btn btn--outline">Σύνδεση</Link>
        </div>
      </div>
    </AuthLayout>
  )
}
