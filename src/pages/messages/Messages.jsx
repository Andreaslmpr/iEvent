/* ============================================================
   Messages — σελίδα μηνυμάτων (εκφώνηση §10).
   Κατάλογοι εισερχομένων/απεσταλμένων, άνοιγμα μηνύματος (που το
   μαρκάρει ως διαβασμένο), απάντηση και διαγραφή.

   Η διαγραφή αφορά ΜΟΝΟ τον δικό μας κατάλογο: ο συνομιλητής συνεχίζει
   να βλέπει το μήνυμα στον δικό του (soft delete ανά χρήστη, §10).

   Η σύνθεση ξεκινά πάντα από εκδήλωση: άλλες σελίδες οδηγούν εδώ με
   ?event=<id> (μήνυμα στον διοργανωτή) ή ?to=<id>&toName=<username>.
   ============================================================ */
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getInbox, getOutbox, getMessage, deleteMessage } from '../../api/index.js'
import Loader from '../../components/ui/Loader.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import Modal from '../../components/ui/Modal.jsx'
import ComposeModal from './ComposeModal.jsx'
import { formatDateTime, errorMessage } from '../../utils/format.js'
import '../events/events-pages.css'
import '../admin/admin.css'
import './messages.css'

const PAGE_SIZE = 10

export default function Messages() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [folder, setFolder] = useState('inbox')
  const [result, setResult] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [opened, setOpened] = useState(null)
  const [compose, setCompose] = useState(null)
  const [notice, setNotice] = useState('')
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const isInbox = folder === 'inbox'

  /* Αν η σελίδα ανοίξει με context εκδήλωσης, ξεκινά κατευθείαν σύνθεση. */
  useEffect(() => {
    const eventId = searchParams.get('event')
    if (!eventId) return
    setCompose({
      eventId: Number(eventId),
      toUserId: searchParams.get('to') ? Number(searchParams.get('to')) : undefined,
      toName: searchParams.get('toName') ?? undefined,
    })
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    const load = isInbox ? getInbox : getOutbox
    load({ page, pageSize: PAGE_SIZE })
      .then((data) => { if (!cancelled) setResult(data) })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, 'Αδυναμία φόρτωσης των μηνυμάτων.'))
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [isInbox, page, reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  function changeFolder(next) {
    setFolder(next)
    setPage(1)
    setOpened(null)
    setNotice('')
  }

  /* Το άνοιγμα περνά από το API ώστε ο server να το μαρκάρει διαβασμένο. */
  async function open(message) {
    setError('')
    try {
      const full = await getMessage(message.id)
      setOpened(full)
      if (isInbox && !message.read) reload()
    } catch (err) {
      setError(errorMessage(err, 'Το μήνυμα δεν άνοιξε.'))
    }
  }

  /* Η διαγραφή δεν αναιρείται, οπότε περνά από επιβεβαίωση (ίδιο μοτίβο με
     την κράτηση και την ακύρωση εκδήλωσης). */
  async function confirmDelete() {
    setError('')
    setDeleting(true)
    try {
      await deleteMessage(toDelete.id)
      if (opened?.id === toDelete.id) setOpened(null)
      setToDelete(null)
      setNotice('Το μήνυμα διαγράφηκε από τον κατάλογό σου.')
      reload()
    } catch (err) {
      setError(errorMessage(err, 'Η διαγραφή απέτυχε.'))
    } finally {
      setDeleting(false)
    }
  }

  const items = result?.items ?? []

  return (
    <div className="container page">
      <header className="page__head">
        <h1>Μηνύματα</h1>
        <p className="page__sub">
          Επικοινωνία διοργανωτή και συμμετεχόντων για τις εκδηλώσεις με κράτηση.
        </p>
      </header>

      <div className="toolbar">
        <div className="tabs">
          <button className={`tab ${isInbox ? 'tab--on' : ''}`} onClick={() => changeFolder('inbox')}>
            Εισερχόμενα
          </button>
          <button className={`tab ${!isInbox ? 'tab--on' : ''}`} onClick={() => changeFolder('outbox')}>
            Απεσταλμένα
          </button>
        </div>
      </div>

      <Alert kind="error">{error}</Alert>
      <Alert kind="success">{notice}</Alert>

      {loading && <Loader label="Φόρτωση μηνυμάτων…" />}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          title={isInbox ? 'Κανένα εισερχόμενο μήνυμα' : 'Κανένα απεσταλμένο μήνυμα'}
          text="Τα μηνύματα ξεκινούν από μια εκδήλωση: από τις κρατήσεις σας ή από τη λίστα κρατήσεων εκδήλωσης που διοργανώνετε."
        />
      )}

      {!loading && items.length > 0 && (
        <div className="mail">
          <div>
            <div className="mail__list">
              {items.map((message) => {
                const other = isInbox ? message.fromUser : message.toUser
                const unread = isInbox && !message.read
                return (
                  <button
                    key={message.id}
                    className={`mail__item ${opened?.id === message.id ? 'mail__item--on' : ''}`}
                    onClick={() => open(message)}
                  >
                    <span className="mail__top">
                      <span className="mail__who">
                        {isInbox ? 'Από' : 'Προς'} @{other.username}
                      </span>
                      <span className="mail__top">
                        {unread && <span className="mail__dot" aria-label="Μη αναγνωσμένο" />}
                        <span className="mail__date">{formatDateTime(message.sentAt)}</span>
                      </span>
                    </span>
                    <span className={`mail__subject ${unread ? 'mail__subject--unread' : ''}`}>
                      {message.subject}
                    </span>
                  </button>
                )
              })}
            </div>
            <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />
          </div>

          {opened && (
            <article className="card mail__view">
              <h2 className="mail__view-subject">{opened.subject}</h2>
              <p className="mail__meta">
                Από @{opened.fromUser.username} προς @{opened.toUser.username}
                <br />
                {formatDateTime(opened.sentAt)}
              </p>
              <p className="mail__body">{opened.body}</p>

              <div className="mail__actions">
                <button
                  className="btn btn--primary"
                  onClick={() => setCompose({
                    eventId: opened.eventId,
                    toUserId: isInbox ? opened.fromUser.id : opened.toUser.id,
                    toName: isInbox ? opened.fromUser.username : opened.toUser.username,
                  })}
                >
                  Απάντηση
                </button>
                <button className="btn btn--danger" onClick={() => setToDelete(opened)}>
                  Διαγραφή
                </button>
              </div>
            </article>
          )}
        </div>
      )}

      {toDelete && (
        <Modal
          title="Διαγραφή μηνύματος"
          confirmLabel="Διαγραφή"
          busy={deleting}
          onClose={() => setToDelete(null)}
          onConfirm={confirmDelete}
        >
          <p>
            Το μήνυμα «{toDelete.subject}» θα αφαιρεθεί από τα{' '}
            {isInbox ? 'εισερχόμενά' : 'απεσταλμένα'} σου και δεν επανέρχεται.
          </p>
          <p style={{ marginTop: 'var(--space-3)' }}>
            Ο άλλος χρήστης θα συνεχίσει να το βλέπει στον δικό του κατάλογο.
          </p>
        </Modal>
      )}

      {compose && (
        <ComposeModal
          eventId={compose.eventId}
          toUserId={compose.toUserId}
          toName={compose.toName}
          onClose={() => setCompose(null)}
          onSent={() => {
            setCompose(null)
            setNotice('Το μήνυμα στάλθηκε.')
            if (!isInbox) reload()
          }}
        />
      )}
    </div>
  )
}
