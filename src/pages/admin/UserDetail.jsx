/* ============================================================
   UserDetail — πλήρη στοιχεία χρήστη (εκφώνηση §4: ο διαχειριστής
   πλοηγείται από τη λίστα στη σελίδα του κάθε χρήστη, εξετάζει τα
   στοιχεία του και εγκρίνει/απορρίπτει την αίτηση εγγραφής).
   ============================================================ */
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getUser, approveUser, rejectUser } from '../../api/index.js'
import EventMap from '../../components/events/EventMap.jsx'
import Loader from '../../components/ui/Loader.jsx'
import Alert from '../../components/ui/Alert.jsx'
import { formatDateTime, errorMessage, USER_STATUS } from '../../utils/format.js'
import '../events/events-pages.css'
import './admin.css'

export default function UserDetail() {
  const { id } = useParams()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    getUser(id)
      .then((data) => { if (!cancelled) setUser(data) })
      .catch((err) => { if (!cancelled) setError(errorMessage(err, 'Ο χρήστης δεν βρέθηκε.')) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [id])

  async function decide(approved) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const updated = await (approved ? approveUser(id) : rejectUser(id))
      // Ο server επιστρέφει { id, status } — ενημερώνουμε μόνο την κατάσταση.
      setUser((prev) => ({ ...prev, status: updated.status }))
      setNotice(approved ? 'Η αίτηση εγκρίθηκε.' : 'Η αίτηση απορρίφθηκε.')
    } catch (err) {
      setError(errorMessage(err, 'Η ενέργεια δεν ολοκληρώθηκε.'))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="container page"><Loader label="Φόρτωση στοιχείων…" /></div>

  if (error && !user) {
    return (
      <div className="container page">
        <Alert kind="error">{error}</Alert>
        <p style={{ marginTop: 'var(--space-4)' }}><Link to="/admin">← Λίστα χρηστών</Link></p>
      </div>
    )
  }

  const status = USER_STATUS[user.status]
  const isPending = user.status === 'PENDING'

  return (
    <div className="container page">
      <p className="detail__back"><Link to="/admin">← Λίστα χρηστών</Link></p>

      <Alert kind="error">{error}</Alert>
      <Alert kind="success">{notice}</Alert>

      <div className="card user-card">
        <header className="user-card__head">
          <div>
            <p className="user-card__name">{user.firstName} {user.lastName}</p>
            <p className="user-card__username">@{user.username}</p>
          </div>
          <span className={`badge ${status.variant}`}>{status.label}</span>

          {isPending && (
            <div className="user-card__actions">
              <button className="btn btn--success" disabled={busy} onClick={() => decide(true)}>
                Έγκριση αίτησης
              </button>
              <button className="btn btn--danger" disabled={busy} onClick={() => decide(false)}>
                Απόρριψη
              </button>
            </div>
          )}
        </header>

        <dl className="detail__facts">
          <div><dt>Email</dt><dd>{user.email}</dd></div>
          <div><dt>Τηλέφωνο</dt><dd>{user.phone}</dd></div>
          <div><dt>ΑΦΜ</dt><dd>{user.afm}</dd></div>
          <div><dt>Διεύθυνση</dt><dd>{user.address}</dd></div>
          <div><dt>Πόλη / Χώρα</dt><dd>{user.city}, {user.country}</dd></div>
          <div><dt>Ρόλος</dt><dd>{user.role}</dd></div>
          <div><dt>Ημερομηνία εγγραφής</dt><dd>{formatDateTime(user.createdAt)}</dd></div>
          <div>
            <dt>Συντεταγμένες</dt>
            <dd>{user.geoLocation.lat}, {user.geoLocation.lng}</dd>
          </div>
        </dl>

        <div style={{ marginTop: 'var(--space-5)' }}>
          <EventMap geoLocation={user.geoLocation} label={`διεύθυνση ${user.username}`} />
        </div>
      </div>
    </div>
  )
}
