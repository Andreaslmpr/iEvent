/* ============================================================
   Welcome — σελίδα καλωσορίσματος (εκφώνηση §1) και, για τον
   συνδεδεμένο χρήστη, η αρχική σελίδα της εφαρμογής (§5).

   Δύο όψεις της ίδιας διαδρομής «/»:
   - ΕΠΙΣΚΕΠΤΗΣ: hero με εγγραφή / είσοδο / περιήγηση (§1), τα τρία
     βήματα της εφαρμογής και οι επόμενες εκδηλώσεις.
   - ΣΥΝΔΕΔΕΜΕΝΟΣ: σύντομο καλωσόρισμα με τις δύο διαδρομές που
     ορίζει το §6 (διαχείριση εκδηλώσεων / αναζήτηση), οι προτεινόμενες
     εκδηλώσεις του (§13) και οι επόμενες εκδηλώσεις.
   ============================================================ */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { getEvents } from '../api/index.js'
import { displayName } from '../utils/format.js'
import EventCard from '../components/events/EventCard.jsx'
import Recommendations from '../components/events/Recommendations.jsx'
import './Welcome.css'

const UPCOMING_COUNT = 3

/* Τα τρία βήματα που δείχνουμε στον επισκέπτη. */
const FEATURES = [
  {
    icon: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.35-4.35',
    title: 'Βρες την εκδήλωση',
    text: 'Αναζήτηση με λέξεις, κατηγορία, πόλη, ημερομηνία και τιμή — με χάρτη για κάθε χώρο.',
  },
  {
    icon: 'M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4V7Zm10 0v10',
    title: 'Κράτησε θέση',
    text: 'Διάλεξε τύπο εισιτηρίου και πλήθος. Η διαθεσιμότητα ενημερώνεται αμέσως.',
  },
  {
    icon: 'M5 6h14v14H5V6Zm0 4h14M9 3v4m6-4v4m-3 6v5m-2.5-2.5h5',
    title: 'Διοργάνωσε τη δική σου',
    text: 'Φτιάξε εκδήλωση με φωτογραφίες και εισιτήρια, δες τις κρατήσεις και μίλα με τους συμμετέχοντες.',
  },
]

/* Οι επόμενες δημοσιευμένες εκδηλώσεις (ταξινόμηση κατά ημερομηνία). */
function UpcomingEvents() {
  const [events, setEvents] = useState([])

  useEffect(() => {
    let cancelled = false
    const today = new Date().toISOString().slice(0, 10)
    const now = new Date()

    getEvents({ from: today, sort: 'date', page: 1, pageSize: UPCOMING_COUNT * 2 })
      // Όσες ξεκίνησαν νωρίτερα σήμερα δεν δέχονται πια κρατήσεις — τις παραλείπουμε.
      .then((data) => {
        if (cancelled) return
        const future = data.items.filter((e) => new Date(e.startDateTime) > now)
        setEvents(future.slice(0, UPCOMING_COUNT))
      })
      // Συμπληρωματικό τμήμα: σε αποτυχία απλώς δεν εμφανίζεται.
      .catch(() => { if (!cancelled) setEvents([]) })

    return () => { cancelled = true }
  }, [])

  if (events.length === 0) return null

  return (
    <section className="home-section" aria-labelledby="upcoming-title">
      <header className="home-section__head">
        <div>
          <p className="home-section__eyebrow">Σύντομα</p>
          <h2 id="upcoming-title">Επόμενες εκδηλώσεις</h2>
        </div>
        <Link to="/events" className="home-section__more">Όλες οι εκδηλώσεις →</Link>
      </header>
      <div className="home-grid">
        {events.map((event) => <EventCard key={event.id} event={event} />)}
      </div>
    </section>
  )
}

export default function Welcome() {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return (
      <>
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

        <div className="container home">
          <section className="home-section" aria-labelledby="how-title">
            <header className="home-section__head home-section__head--center">
              <div>
                <p className="home-section__eyebrow">Πώς λειτουργεί</p>
                <h2 id="how-title">Από την ιδέα στη θέση σου, σε τρία βήματα</h2>
              </div>
            </header>
            <ol className="features">
              {FEATURES.map((feature, index) => (
                <li key={feature.title} className="card feature">
                  <span className="feature__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
                      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d={feature.icon} />
                    </svg>
                  </span>
                  <span className="feature__step">Βήμα {index + 1}</span>
                  <h3 className="feature__title">{feature.title}</h3>
                  <p className="feature__text">{feature.text}</p>
                </li>
              ))}
            </ol>
          </section>

          <UpcomingEvents />

          <section className="cta-band">
            <div>
              <h2 className="cta-band__title">Οργανώνεις κάτι;</h2>
              <p className="cta-band__text">
                Κάθε χρήστης μπορεί να γίνει διοργανωτής. Η εγγραφή εγκρίνεται από τον διαχειριστή.
              </p>
            </div>
            <Link to="/register" className="btn btn--primary btn--lg">Δημιουργία λογαριασμού</Link>
          </section>
        </div>
      </>
    )
  }

  return (
    <>
      <section className="welcome welcome--compact">
        <div className="container welcome__inner welcome__inner--start">
          <p className="welcome__eyebrow">Καλώς ήρθες</p>
          <h1 className="welcome__title welcome__title--sm">
            Γεια σου, <span className="welcome__accent">{displayName(user)}</span>.
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
        <UpcomingEvents />
      </div>
    </>
  )
}
