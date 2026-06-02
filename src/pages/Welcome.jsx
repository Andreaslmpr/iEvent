/* ============================================================
   Welcome — σελίδα καλωσορίσματος (εκφώνηση §1).
   Δίνει στον επισκέπτη τη δυνατότητα εγγραφής / εισόδου /
   περιήγησης στις εκδηλώσεις.
   ============================================================ */
import { Link } from 'react-router-dom'
import './Welcome.css'

export default function Welcome() {
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
