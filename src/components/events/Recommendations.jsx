/* ============================================================
   Recommendations — προτεινόμενες εκδηλώσεις (εκφώνηση §13).

   Ο αλγόριθμος (Biased Matrix Factorization, υλοποιημένος εκ του
   μηδενός) τρέχει στον server. Εδώ δείχνουμε το αποτέλεσμα και,
   κυρίως, ΓΙΑΤΙ προτείνεται: το πεδίο `strategy` της απάντησης
   λέει αν η πρόταση στηρίζεται σε ιστορικό κρατήσεων ή —όταν ο
   χρήστης δεν έχει κρατήσεις— μόνο στις εκδηλώσεις που επισκέφθηκε.

   Είναι συμπληρωματικό τμήμα της σελίδας: αν δεν υπάρχουν προτάσεις
   ή αποτύχει η κλήση, δεν δείχνουμε τίποτα αντί να χαλάσουμε τη ροή.
   ============================================================ */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRecommendations } from '../../api/index.js'
import { useAuth } from '../../context/AuthContext.jsx'
import EventCard from './EventCard.jsx'
import './Recommendations.css'

/* Το `strategy` του §2.6 → τι λέμε στον χρήστη. */
const STRATEGY_LABELS = {
  matrix_factorization: {
    title: 'Προτεινόμενα για εσένα',
    hint: 'Με βάση τις κρατήσεις σου και χρήστες με παρόμοια ενδιαφέροντα.',
  },
  cold_start_visits: {
    title: 'Μπορεί να σου αρέσουν',
    hint: 'Με βάση τις εκδηλώσεις που έχεις δει — κάνε μια κράτηση για πιο στοχευμένες προτάσεις.',
  },
}

export default function Recommendations({ limit = 3 }) {
  const { isAuthenticated } = useAuth()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Ο επισκέπτης δεν έχει ιστορικό — ούτε καν καλούμε (θα έπαιρνε 401).
    if (!isAuthenticated) {
      setLoading(false)
      return undefined
    }

    let cancelled = false
    setLoading(true)

    getRecommendations({ pageSize: limit })
      .then((data) => { if (!cancelled) setResult(data) })
      // Σιωπηλή αποτυχία: οι προτάσεις είναι «μπόνους» τμήμα της σελίδας.
      .catch(() => { if (!cancelled) setResult(null) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [isAuthenticated, limit])

  // Όσο φορτώνει δεν κρατάμε χώρο: το τμήμα είναι συμπληρωματικό και μπορεί
  // κάλλιστα να καταλήξει κενό. Ένας loader πάνω από τον τίτλο της σελίδας
  // θα τίναζε το layout για κάτι που ίσως δεν εμφανιστεί ποτέ.
  if (!isAuthenticated || loading) return null

  const items = result?.items ?? []
  if (items.length === 0) return null

  const labels = STRATEGY_LABELS[result.strategy] ?? STRATEGY_LABELS.cold_start_visits

  return (
    <section className="recs" aria-labelledby="recs-title">
      <header className="recs__head">
        <div>
          <h2 className="recs__title" id="recs-title">{labels.title}</h2>
          <p className="recs__hint">{labels.hint}</p>
        </div>
        <Link to="/events" className="recs__more">Όλες οι εκδηλώσεις →</Link>
      </header>

      <div className="recs__grid">
        {items.map((event) => <EventCard key={event.id} event={event} />)}
      </div>
    </section>
  )
}
