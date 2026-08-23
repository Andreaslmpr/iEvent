/* ============================================================
   EventCreate — δημιουργία νέας εκδήλωσης (contract: POST /events).
   Ο server την αποθηκεύει ως DRAFT· η δημοσίευση είναι ξεχωριστό βήμα.
   ============================================================ */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createEvent } from '../../api/index.js'
import EventForm from '../../components/events/EventForm.jsx'
import { errorMessage } from '../../utils/format.js'
import '../events/events-pages.css'
import './dashboard.css'

export default function EventCreate() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  async function handleSubmit(payload) {
    setSubmitting(true)
    setServerError('')
    try {
      const event = await createEvent(payload)
      navigate('/dashboard', {
        state: { notice: `Η εκδήλωση «${event.title}» αποθηκεύτηκε ως πρόχειρη.` },
      })
    } catch (err) {
      setServerError(errorMessage(err, 'Η εκδήλωση δεν αποθηκεύτηκε.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container page">
      <p className="detail__back"><Link to="/dashboard">← Οι εκδηλώσεις μου</Link></p>
      <header className="page__head">
        <h1>Νέα εκδήλωση</h1>
        <p className="page__sub">Αποθηκεύεται ως πρόχειρη — τη δημοσιεύετε όποτε είστε έτοιμοι.</p>
      </header>

      <EventForm
        submitting={submitting}
        serverError={serverError}
        submitLabel="Αποθήκευση ως πρόχειρη"
        onSubmit={handleSubmit}
        onCancel={() => navigate('/dashboard')}
      />
    </div>
  )
}
