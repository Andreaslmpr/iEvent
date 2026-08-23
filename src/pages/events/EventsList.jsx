/* ============================================================
   EventsList — αναζήτηση & πλοήγηση εκδηλώσεων (εκφώνηση §3).
   Ορατή και σε επισκέπτες (GUEST) χωρίς σύνδεση.

   Τα φίλτρα ζουν στο URL (?q=...&city=...&page=2), οπότε:
   - η αναζήτηση μοιράζεται/αποθηκεύεται ως link
   - το «πίσω» του browser δουλεύει σωστά
   ============================================================ */
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getEvents } from '../../api/index.js'
import EventCard from '../../components/events/EventCard.jsx'
import EventFilters from '../../components/events/EventFilters.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import Loader from '../../components/ui/Loader.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Alert from '../../components/ui/Alert.jsx'
import { errorMessage } from '../../utils/format.js'
import './events-pages.css'

const PAGE_SIZE = 6

export default function EventsList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const query = useMemo(() => Object.fromEntries(searchParams), [searchParams])
  const page = Number(query.page ?? 1)

  useEffect(() => {
    // `cancelled`: αν ο χρήστης αλλάξει φίλτρα πριν απαντήσει το API,
    // αγνοούμε την παλιά απάντηση ώστε να μη «γυρίσει» πίσω η λίστα.
    let cancelled = false
    setLoading(true)
    setError('')

    getEvents({ ...query, page, pageSize: PAGE_SIZE })
      .then((data) => { if (!cancelled) setResult(data) })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, 'Αδυναμία φόρτωσης των εκδηλώσεων.'))
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [query, page])

  /* Εφαρμογή φίλτρων: κρατάμε μόνο όσα έχουν τιμή και μηδενίζουμε τη σελίδα. */
  function applyFilters(values) {
    const next = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== ''))
    setSearchParams(next)
  }

  function resetFilters() {
    setSearchParams({})
  }

  function changePage(nextPage) {
    setSearchParams({ ...query, page: String(nextPage) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const items = result?.items ?? []

  return (
    <div className="container page">
      <header className="page__head">
        <h1>Εκδηλώσεις</h1>
        {result && !loading && (
          <p className="page__sub">
            {result.total === 0
              ? 'Καμία εκδήλωση δεν ταιριάζει με την αναζήτηση.'
              : `${result.total} εκδηλώσεις`}
          </p>
        )}
      </header>

      {/* key: όταν αλλάξει το URL, τα πεδία ξαναδιαβάζουν τις τιμές τους από εκεί. */}
      <EventFilters
        key={searchParams.toString()}
        initial={query}
        onApply={applyFilters}
        onReset={resetFilters}
      />

      <Alert kind="error">{error}</Alert>

      {loading && <Loader label="Φόρτωση εκδηλώσεων…" />}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="Δεν βρέθηκαν εκδηλώσεις"
          text="Δοκιμάστε διαφορετικά κριτήρια ή καθαρίστε τα φίλτρα."
          action={
            <button className="btn btn--outline" onClick={resetFilters}>
              Καθαρισμός φίλτρων
            </button>
          }
        />
      )}

      {!loading && items.length > 0 && (
        <>
          <div className="events-grid">
            {items.map((event) => <EventCard key={event.id} event={event} />)}
          </div>
          <Pagination page={result.page} totalPages={result.totalPages} onChange={changePage} />
        </>
      )}
    </div>
  )
}
