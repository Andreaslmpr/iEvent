/* ============================================================
   EventEdit — επεξεργασία εκδήλωσης (contract: PUT /events/{id}).
   Μόνο ο διοργανωτής· τον έλεγχο τον κάνει και ο server (403).
   ============================================================ */
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getEvent, updateEvent, uploadEventMedia } from '../../api/index.js'
import { useAuth } from '../../context/AuthContext.jsx'
import EventForm from '../../components/events/EventForm.jsx'
import Loader from '../../components/ui/Loader.jsx'
import Alert from '../../components/ui/Alert.jsx'
import { errorMessage } from '../../utils/format.js'
import '../events/events-pages.css'
import './dashboard.css'

export default function EventEdit() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  useEffect(() => {
    let cancelled = false
    getEvent(id)
      .then((data) => {
        if (cancelled) return
        if (data.organizer.id !== user.id) {
          setLoadError('Δεν είστε ο διοργανωτής αυτής της εκδήλωσης.')
          return
        }
        setEvent(data)
      })
      .catch((err) => { if (!cancelled) setLoadError(errorMessage(err, 'Η εκδήλωση δεν βρέθηκε.')) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [id, user.id])

  async function handleSubmit(payload, photos) {
    setSubmitting(true)
    setServerError('')
    try {
      const updated = await updateEvent(id, payload)
      // Αν αποτύχει το ανέβασμα, μένουμε στη φόρμα με το σφάλμα: η νέα υποβολή
      // ξαναστέλνει το ίδιο PUT (ακίνδυνο) και ξαναδοκιμάζει τις φωτογραφίες.
      if (photos.length > 0) await uploadEventMedia(id, photos)
      navigate('/dashboard', {
        state: { notice: `Οι αλλαγές στην «${updated.title}» αποθηκεύτηκαν.` },
      })
    } catch (err) {
      setServerError(errorMessage(err, 'Οι αλλαγές δεν αποθηκεύτηκαν.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="container page"><Loader label="Φόρτωση εκδήλωσης…" /></div>

  if (loadError) {
    return (
      <div className="container page">
        <Alert kind="error">{loadError}</Alert>
        <p style={{ marginTop: 'var(--space-4)' }}><Link to="/dashboard">← Οι εκδηλώσεις μου</Link></p>
      </div>
    )
  }

  return (
    <div className="container page">
      <p className="detail__back"><Link to="/dashboard">← Οι εκδηλώσεις μου</Link></p>
      <header className="page__head">
        <h1>Επεξεργασία εκδήλωσης</h1>
        <p className="page__sub">
          Οι ήδη κρατημένες θέσεις προστατεύονται: δεν μπορείτε να μειώσετε ποσότητα κάτω από αυτές.
        </p>
      </header>

      <EventForm
        event={event}
        submitting={submitting}
        serverError={serverError}
        submitLabel="Αποθήκευση αλλαγών"
        onSubmit={handleSubmit}
        onCancel={() => navigate('/dashboard')}
      />
    </div>
  )
}
