/* ============================================================
   AdminUsers — σελίδα διαχείρισης χρηστών (εκφώνηση §4).
   Ο διαχειριστής πλοηγείται στη λίστα, φιλτράρει κατά κατάσταση,
   ανοίγει τα στοιχεία κάθε χρήστη και εγκρίνει/απορρίπτει αιτήσεις.
   Επιπλέον: εξαγωγή εκδηλώσεων σε XML/JSON (εκφώνηση §12).
   ============================================================ */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getUsers, approveUser, rejectUser, exportEvents } from '../../api/index.js'
import Loader from '../../components/ui/Loader.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import { formatDate, errorMessage, USER_STATUS } from '../../utils/format.js'
import { downloadText } from '../../utils/download.js'
import '../events/events-pages.css'
import '../dashboard/dashboard.css'
import './admin.css'

const PAGE_SIZE = 10

const FILTERS = [
  { value: '', label: 'Όλοι' },
  { value: 'PENDING', label: 'Εκκρεμείς' },
  { value: 'APPROVED', label: 'Εγκεκριμένοι' },
  { value: 'REJECTED', label: 'Απορριφθέντες' },
]

export default function AdminUsers() {
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [busyId, setBusyId] = useState(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    getUsers({ status: status || undefined, page, pageSize: PAGE_SIZE })
      .then((data) => { if (!cancelled) setResult(data) })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, 'Αδυναμία φόρτωσης των χρηστών.'))
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [status, page, reloadKey])

  async function decide(user, approved) {
    setBusyId(user.id)
    setError('')
    setNotice('')
    try {
      await (approved ? approveUser(user.id) : rejectUser(user.id))
      setNotice(`Η αίτηση του «${user.username}» ${approved ? 'εγκρίθηκε' : 'απορρίφθηκε'}.`)
      setReloadKey((k) => k + 1)
    } catch (err) {
      setError(errorMessage(err, 'Η ενέργεια δεν ολοκληρώθηκε.'))
    } finally {
      setBusyId(null)
    }
  }

  async function handleExport(format) {
    setError('')
    try {
      const content = await exportEvents(format)
      downloadText(
        `events.${format}`,
        content,
        format === 'xml' ? 'application/xml' : 'application/json',
      )
    } catch (err) {
      setError(errorMessage(err, 'Η εξαγωγή απέτυχε.'))
    }
  }

  function changeFilter(value) {
    setStatus(value)
    setPage(1)
  }

  const items = result?.items ?? []

  return (
    <div className="container page">
      <header className="page__head">
        <h1>Διαχείριση χρηστών</h1>
        <p className="page__sub">Έγκριση ή απόρριψη αιτήσεων εγγραφής και επισκόπηση λογαριασμών.</p>
      </header>

      <div className="toolbar">
        <div className="tabs">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              className={`tab ${status === filter.value ? 'tab--on' : ''}`}
              onClick={() => changeFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="tabs">
          <button className="btn btn--muted" onClick={() => handleExport('xml')}>
            Εξαγωγή XML
          </button>
          <button className="btn btn--muted" onClick={() => handleExport('json')}>
            Εξαγωγή JSON
          </button>
        </div>
      </div>

      <Alert kind="error">{error}</Alert>
      <Alert kind="success">{notice}</Alert>

      {loading && <Loader label="Φόρτωση χρηστών…" />}

      {!loading && !error && items.length === 0 && (
        <EmptyState title="Δεν βρέθηκαν χρήστες" text="Δοκιμάστε διαφορετικό φίλτρο κατάστασης." />
      )}

      {!loading && items.length > 0 && (
        <>
          <div className="card table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Χρήστης</th>
                  <th>Ονοματεπώνυμο</th>
                  <th>Email</th>
                  <th>Πόλη</th>
                  <th>Εγγραφή</th>
                  <th>Κατάσταση</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((user) => {
                  const userStatus = USER_STATUS[user.status]
                  const isPending = user.status === 'PENDING'
                  return (
                    <tr key={user.id}>
                      <td>
                        <Link to={`/admin/users/${user.id}`}>{user.username}</Link>
                        {user.role === 'ADMIN' && <span className="badge" style={{ marginLeft: 'var(--space-2)' }}>ADMIN</span>}
                      </td>
                      <td>{user.firstName} {user.lastName}</td>
                      <td>{user.email}</td>
                      <td>{user.city}</td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td><span className={`badge ${userStatus.variant}`}>{userStatus.label}</span></td>
                      <td>
                        <div className="users-table__actions">
                          <Link to={`/admin/users/${user.id}`} className="btn btn--muted">Στοιχεία</Link>
                          {isPending && (
                            <>
                              <button
                                className="btn btn--success"
                                disabled={busyId === user.id}
                                onClick={() => decide(user, true)}
                              >
                                Έγκριση
                              </button>
                              <button
                                className="btn btn--danger"
                                disabled={busyId === user.id}
                                onClick={() => decide(user, false)}
                              >
                                Απόρριψη
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  )
}
