/* ============================================================
   ComposeModal — αποστολή μηνύματος στο πλαίσιο μιας εκδήλωσης.

   Η επικοινωνία διοργανωτή↔συμμετέχοντα προϋποθέτει κράτηση (§10),
   γι' αυτό κάθε μήνυμα ξεκινά ΠΑΝΤΑ από συγκεκριμένη εκδήλωση:
   - χωρίς `toUserId` → παραλήπτης ο διοργανωτής της εκδήλωσης
   - με `toUserId`    → απάντηση προς συγκεκριμένο χρήστη
   ============================================================ */
import { useEffect, useState } from 'react'
import { getEvent, sendMessage } from '../../api/index.js'
import Modal from '../../components/ui/Modal.jsx'
import Alert from '../../components/ui/Alert.jsx'
import { errorMessage } from '../../utils/format.js'
import './messages.css'

export default function ComposeModal({ eventId, toUserId, toName, onClose, onSent }) {
  const [event, setEvent] = useState(null)
  const [recipient, setRecipient] = useState({ id: toUserId, name: toName })
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  /* Φέρνουμε την εκδήλωση ΜΟΝΟ όταν τη χρειαζόμαστε, δηλαδή όταν λείπει ο
     παραλήπτης και πρέπει να βρούμε τον διοργανωτή.

     Στην απάντηση (υπάρχει ήδη toUserId) δεν καλούμε το GET /events/{id}:
     έχει παρενέργεια — καταγράφει EventVisit για τον recommender. Ένα άνοιγμα
     modal δεν είναι επίσκεψη σε σελίδα εκδήλωσης και θα νόθευε τις συστάσεις. */
  useEffect(() => {
    if (toUserId) return undefined

    let cancelled = false
    getEvent(eventId)
      .then((data) => {
        if (cancelled) return
        setEvent(data)
        setRecipient({ id: data.organizer.id, name: data.organizer.username })
      })
      .catch((err) => { if (!cancelled) setError(errorMessage(err, 'Η εκδήλωση δεν βρέθηκε.')) })

    return () => { cancelled = true }
  }, [eventId, toUserId])

  async function handleSend() {
    setSending(true)
    setError('')
    try {
      await sendMessage({ toUserId: recipient.id, eventId, subject, body })
      onSent()
    } catch (err) {
      setError(errorMessage(err, 'Το μήνυμα δεν στάλθηκε.'))
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal
      title="Νέο μήνυμα"
      confirmLabel="Αποστολή"
      busy={sending || !recipient.id}
      onClose={onClose}
      onConfirm={handleSend}
    >
      <Alert kind="error">{error}</Alert>

      <p className="compose__to">
        <strong>Προς:</strong> {recipient.name ?? '…'}
        {/* Τον τίτλο τον ξέρουμε μόνο όταν φέραμε την εκδήλωση· στην απάντηση
            δεν την ξαναφέρνουμε (βλ. σχόλιο στο useEffect). */}
        {event && <><br /><strong>Σχετικά με:</strong> {event.title}</>}
      </p>

      <input
        className="compose__input"
        placeholder="Θέμα"
        aria-label="Θέμα"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />
      <textarea
        className="compose__textarea"
        placeholder="Γράψτε το μήνυμά σας…"
        aria-label="Κείμενο μηνύματος"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
    </Modal>
  )
}
