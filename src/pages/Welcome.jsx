/* ============================================================
   Welcome — σελίδα καλωσορίσματος (εκφώνηση §1) και, για τον
   συνδεδεμένο χρήστη, η αρχική σελίδα της εφαρμογής (§5).

   Δύο όψεις της ίδιας διαδρομής «/»:
   - ΕΠΙΣΚΕΠΤΗΣ: hero με εγγραφή / είσοδο / περιήγηση (§1).
   - ΣΥΝΔΕΔΕΜΕΝΟΣ: σύντομο καλωσόρισμα με τις δύο διαδρομές που
     ορίζει το §6 (διαχείριση εκδηλώσεων / αναζήτηση) και από κάτω
     οι προτεινόμενες εκδηλώσεις του (§13).
   ============================================================ */
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Recommendations from '../components/events/Recommendations.jsx'
import './Welcome.css'

export default function Welcome() {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return (
      <section className="welcome">
        <div className="container welcome__inner">
          <p className="welcome__eyebrow">Εκδηλώσεις & Ηλεκτρονικές Κρατήσεις</p>
          <h1 className="welcome__title">
            Ανακάλυψε εκδηλώσεις.<br />
            Κράτησε τη θέση σου με ένα <span className="welcome__accent">κλικ</span>.
          </h1>
          <p className="welcome__lead">
            Περιηγήσου σε συναυλίες, σεμινάρια και παραστάσεις, ή δημιούργησε
            τις δικές σου εκδηλώσεις ως διοργανωτής.
          </p>

          <div className="welcome__cta">
            <Link to="/register" className="btn btn--primary btn--lg">Ξεκίνα τώρα</Link>
            <Link to="/events" className="btn btn--outline btn--lg">Περιήγηση εκδηλώσεων</Link>
          </div>

          <p className="welcome__note">
            Έχεις ήδη λογαριασμό; <Link to="/login">Σύνδεση</Link>
          </p>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="welcome welcome--compact">
        <div className="container welcome__inner welcome__inner--start">
          <p className="welcome__eyebrow">Καλώς ήρθες</p>
          <h1 className="welcome__title welcome__title--sm">
            Γεια σου, <span className="welcome__accent">{user.firstName}</span>.
          </h1>
          <p className="welcome__lead welcome__lead--start">
            Βρες την επόμενη εκδήλωσή σου ή διαχειρίσου αυτές που διοργανώνεις.
          </p>

          <div className="welcome__cta welcome__cta--start">
            <Link to="/events" className="btn btn--primary btn--lg">Αναζήτηση εκδηλώσεων</Link>
            <Link to="/dashboard" className="btn btn--outline btn--lg">Οι εκδηλώσεις μου</Link>
          </div>
        </div>
      </section>

      <div className="container page">
        <Recommendations limit={3} />
      </div>
    </>
  )
}
