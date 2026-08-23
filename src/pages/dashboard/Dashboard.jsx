/* ============================================================
   Dashboard — «Οι εκδηλώσεις μου» (εκφώνηση §5-§8).
   Ο κάθε χρήστης γίνεται διοργανωτής για όσες εκδηλώσεις φτιάχνει,
   οπότε εδώ βλέπει ΟΛΕΣ τις δικές του (και τις πρόχειρες).

   Ενέργειες ανά κατάσταση:
     DRAFT     → επεξεργασία, δημοσίευση, διαγραφή (αν δεν έχει κρατήσεις)
     PUBLISHED → επεξεργασία, ακύρωση, προβολή κρατήσεων
     CANCELLED → μόνο προβολή
   ============================================================ */
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getMyEvents, publishEvent, cancelEvent, deleteEvent } from '../../api/index.js'
import Loader from '../../components/ui/Loader.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import { formatDateTime, errorMessage, EVENT_STATUS } from '../../utils/format.js'
import '../events/events-pages.css'
import './dashboard.css'

const PAGE_SIZE = 10

/* Τι ρωτάει και τι κάνει η κάθε ενέργεια επιβεβαίωσης. */
const ACTIONS = {
  publish: {
    title: 'Δημοσίευση εκδήλωσης',
    confirmLabel: 'Δημοσίευση',
    run: (event) => publishEvent(event.id),
    text: (event) => `Η «${event.title}» θα γίνει ορατή σε όλους και θα δέχεται κρατήσεις.`,
  },
  cancel: {
    title: 'Ακύρωση εκδήλωσης',
    confirmLabel: 'Ακύρωση εκδήλωσης',
    withNote: true,
    run: (event, note) => cancelEvent(event.id, note),
    text: (event) => `Η «${event.title}» θα ακυρωθεί και όσοι έχουν κράτηση θα ειδοποιηθούν με μήνυμα. Τα δεδομένα διατηρούνται.`,
  },
  delete: {
    title: 'Διαγραφή εκδήλωσης',
    confirmLabel: 'Διαγραφή',
    run: (event) => deleteEvent(event.id),
    text: (event) => `Η «${event.title}» θα διαγραφεί οριστικά. Η ενέργεια δεν αναιρείται.`,
  },
}

export default function Dashboard() {
  // Οι σελίδες δημιουργίας/επεξεργασίας στέλνουν μήνυμα επιτυχίας μέσω του router.
  const location = useLocation()
  const [result, setResult] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  // Ενέργεια που περιμένει επιβεβαίωση: { kind, event }
  const [pending, setPending] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState(location.state?.notice ?? '')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    getMyEvents({ page, pageSize: PAGE_SIZE })
      .then((data) => { if (!cancelled) setResult(data) })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, 'Αδυναμία φόρτωσης των εκδηλώσεών σας.'))
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [page, reloadKey])

  function ask(kind, event) {
    setPending({ kind, event })
    setNote('')
    setActionError('')
    setNotice('')
  }

  async function confirmAction() {
    const { kind, event } = pending
    setBusy(true)
    setActionError('')
    try {
      await ACTIONS[kind].run(event, note)
      setPending(null)
      setNotice(`Η ενέργεια ολοκληρώθηκε για την εκδήλωση «${event.title}».`)
      setReloadKey((k) => k + 1)
    } catch (err) {
      setActionError(errorMessage(err, 'Η ενέργεια δεν ολοκληρώθηκε.'))
    } finally {
      setBusy(false)
    }
  }

  const items = result?.items ?? []
  const action = pending ? ACTIONS[pending.kind] : null

  return (
    <div className="container page">
      <header className="page__head page__head--row">
        <div>
          <h1>Οι εκδηλώσεις μου</h1>
          <p className="page__sub">Δημιουργήστε και διαχειριστείτε τις εκδηλώσεις που διοργανώνετε.</p>
        </div>
        <Link to="/dashboard/events/new" className="btn btn--primary btn--lg">+ Νέα εκδήλωση</Link>
      </header>

      <Alert kind="error">{error || actionError}</Alert>
      <Alert kind="success">{notice}</Alert>

      {loading && <Loader label="Φόρτωση εκδηλώσεων…" />}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="Δεν έχετε δημιουργήσει εκδηλώσεις"
          text="Φτιάξτε την πρώτη σας εκδήλωση — αποθηκεύεται ως πρόχειρη και τη δημοσιεύετε όποτε είστε έτοιμοι."
          action={<Link to="/dashboard/events/new" className="btn btn--primary">Νέα εκδήλωση</Link>}
        />
      )}

      {!loading && items.length > 0 && (
        <>
          <div className="my-events">
            {items.map((event) => {
              const status = EVENT_STATUS[event.status]
              const isDraft = event.status === 'DRAFT'
              const isPublished = event.status === 'PUBLISHED'
              return (
                <article key={event.id} className="card my-event">
                  <div>
                    <h2 className="my-event__title">
                      <Link to={`/events/${event.id}`}>{event.title}</Link>
                      <span className={`badge ${status.variant}`}>{status.label}</span>
                    </h2>
                    <p className="my-event__meta">
                      {formatDateTime(event.startDateTime)} · {event.venue}, {event.city}
                    </p>
                    <p className="my-event__seats">
                      {event.reservedTotal} από {event.capacity} θέσεις κρατημένες
                    </p>
                  </div>

                  <div className="my-event__actions">
                    <Link to={`/dashboard/events/${event.id}/bookings`} className="btn btn--muted">
                      Κρατήσεις
                    </Link>

                    {(isDraft || isPublished) && (
                      <Link to={`/dashboard/events/${event.id}/edit`} className="btn btn--muted">
                        Επεξεργασία
                      </Link>
                    )}

                    {isDraft && (
                      <button className="btn btn--primary" onClick={() => ask('publish', event)}>
                        Δημοσίευση
                      </button>
                    )}

                    {isPublished && (
                      <button className="btn btn--danger" onClick={() => ask('cancel', event)}>
                        Ακύρωση
                      </button>
                    )}

                    {isDraft && event.isDeletable && (
                      <button className="btn btn--danger" onClick={() => ask('delete', event)}>
                        Διαγραφή
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
          <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />
        </>
      )}

      {pending && (
        <Modal
          title={action.title}
          confirmLabel={action.confirmLabel}
          busy={busy}
          onClose={() => setPending(null)}
          onConfirm={confirmAction}
        >
          {action.text(pending.event)}
          {action.withNote && (
            <textarea
              className="modal__note"
              placeholder="Προαιρετικό μήνυμα προς τους συμμετέχοντες…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
        </Modal>
      )}
    </div>
  )
}
