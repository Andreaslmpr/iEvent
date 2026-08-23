/* ============================================================
   EventForm — φόρμα δημιουργίας & επεξεργασίας εκδήλωσης
   (contract §2.3: POST /events και PUT /events/{id}).

   Η ίδια φόρμα εξυπηρετεί και τις δύο περιπτώσεις: αν λάβει
   `event`, ξεκινά συμπληρωμένη· αλλιώς είναι κενή.
   Οι έλεγχοι εδώ είναι για τον χρήστη — την τελική ευθύνη την
   έχει ο server (CAPACITY_EXCEEDED κ.λπ.).
   ============================================================ */
import { useState } from 'react'
import Field from '../form/Field.jsx'
import Alert from '../ui/Alert.jsx'
import EventMap from './EventMap.jsx'
import { EVENT_CATEGORIES } from '../../api/mock/db.js'
import { toInputDateTime, fromInputDateTime } from '../../utils/format.js'
import '../form/form.css'
import './EventForm.css'

const BLANK_TICKET = { name: '', price: '', quantity: '' }

const EMPTY_FORM = {
  title: '', eventType: '', categories: [], venue: '', address: '',
  city: '', country: 'Greece', lat: '', lng: '', start: '', end: '',
  capacity: '', description: '', ticketTypes: [{ ...BLANK_TICKET }],
}

/* Event DTO → επίπεδες τιμές φόρμας. Το `reserved` ανά τύπο μας
   επιτρέπει να μπλοκάρουμε μειώσεις κάτω από τις ήδη κρατημένες. */
function toFormValues(event) {
  if (!event) return { ...EMPTY_FORM, ticketTypes: [{ ...BLANK_TICKET }] }
  return {
    title: event.title,
    eventType: event.eventType,
    categories: [...event.categories],
    venue: event.venue,
    address: event.address,
    city: event.city,
    country: event.country,
    lat: String(event.geoLocation.lat),
    lng: String(event.geoLocation.lng),
    start: toInputDateTime(event.startDateTime),
    end: toInputDateTime(event.endDateTime),
    capacity: String(event.capacity),
    description: event.description,
    ticketTypes: event.ticketTypes.map((t) => ({
      id: t.id,
      name: t.name,
      price: t.price,
      quantity: String(t.quantity),
      reserved: t.quantity - t.available,
    })),
  }
}

const isBlank = (v) => !v || String(v).trim() === ''

/* Επιστρέφει αντικείμενο σφαλμάτων· κενό = έγκυρη φόρμα. */
function validate(values, isNew) {
  const errors = {}

  if (isBlank(values.title)) errors.title = 'Ο τίτλος είναι υποχρεωτικός.'
  if (isBlank(values.eventType)) errors.eventType = 'Ο τύπος εκδήλωσης είναι υποχρεωτικός.'
  if (values.categories.length === 0) errors.categories = 'Επιλέξτε τουλάχιστον μία κατηγορία.'
  if (isBlank(values.description)) errors.description = 'Η περιγραφή είναι υποχρεωτική.'
  if (isBlank(values.venue)) errors.venue = 'Ο χώρος είναι υποχρεωτικός.'
  if (isBlank(values.address)) errors.address = 'Η διεύθυνση είναι υποχρεωτική.'
  if (isBlank(values.city)) errors.city = 'Η πόλη είναι υποχρεωτική.'
  if (isBlank(values.country)) errors.country = 'Η χώρα είναι υποχρεωτική.'

  const lat = Number(values.lat)
  const lng = Number(values.lng)
  if (isBlank(values.lat) || Number.isNaN(lat) || lat < -90 || lat > 90) {
    errors.lat = 'Γεωγραφικό πλάτος από -90 έως 90.'
  }
  if (isBlank(values.lng) || Number.isNaN(lng) || lng < -180 || lng > 180) {
    errors.lng = 'Γεωγραφικό μήκος από -180 έως 180.'
  }

  if (isBlank(values.start)) {
    errors.start = 'Η ώρα έναρξης είναι υποχρεωτική.'
  } else if (isNew && new Date(values.start) < new Date()) {
    errors.start = 'Η έναρξη δεν μπορεί να είναι στο παρελθόν.'
  }
  if (isBlank(values.end)) {
    errors.end = 'Η ώρα λήξης είναι υποχρεωτική.'
  } else if (values.start && new Date(values.end) <= new Date(values.start)) {
    errors.end = 'Η λήξη πρέπει να είναι μετά την έναρξη.'
  }

  const capacity = Number(values.capacity)
  if (!Number.isInteger(capacity) || capacity < 1) {
    errors.capacity = 'Η χωρητικότητα πρέπει να είναι θετικός ακέραιος.'
  }

  // Ένα μήνυμα ανά γραμμή εισιτηρίου (δείχνεται κάτω από τη γραμμή).
  const ticketErrors = values.ticketTypes.map((t) => {
    if (isBlank(t.name)) return 'Συμπληρώστε όνομα τύπου.'
    const price = Number(t.price)
    if (isBlank(t.price) || Number.isNaN(price) || price < 0) return 'Μη έγκυρη τιμή.'
    const quantity = Number(t.quantity)
    if (!Number.isInteger(quantity) || quantity < 1) return 'Η ποσότητα πρέπει να είναι θετικός ακέραιος.'
    if (t.reserved > 0 && quantity < t.reserved) {
      return `Υπάρχουν ήδη ${t.reserved} κρατήσεις — η ποσότητα δεν μπορεί να πέσει κάτω από αυτές.`
    }
    return ''
  })
  if (ticketErrors.some(Boolean)) errors.ticketTypes = ticketErrors

  // Invariant του contract: Σ(quantity) ≤ capacity.
  const sum = values.ticketTypes.reduce((total, t) => total + (Number(t.quantity) || 0), 0)
  if (capacity > 0 && sum > capacity) {
    errors.capacitySum = `Το σύνολο των εισιτηρίων (${sum}) ξεπερνά τη χωρητικότητα (${capacity}).`
  }

  return errors
}

export default function EventForm({
  event, submitting = false, serverError = '', onSubmit, onCancel,
  submitLabel = 'Αποθήκευση',
}) {
  const isNew = !event
  const [values, setValues] = useState(() => toFormValues(event))
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)

  /* Μετά την πρώτη υποβολή, τα σφάλματα ανανεώνονται σε κάθε αλλαγή
     ώστε ο χρήστης να βλέπει αμέσως ότι διόρθωσε το πεδίο. */
  function update(patch) {
    const next = { ...values, ...patch }
    setValues(next)
    if (submitted) setErrors(validate(next, isNew))
  }

  const handleChange = (e) => update({ [e.target.name]: e.target.value })

  function toggleCategory(category) {
    const categories = values.categories.includes(category)
      ? values.categories.filter((c) => c !== category)
      : [...values.categories, category]
    update({ categories })
  }

  function updateTicket(index, patch) {
    update({ ticketTypes: values.ticketTypes.map((t, i) => (i === index ? { ...t, ...patch } : t)) })
  }

  function addTicket() {
    update({ ticketTypes: [...values.ticketTypes, { ...BLANK_TICKET }] })
  }

  function removeTicket(index) {
    update({ ticketTypes: values.ticketTypes.filter((_, i) => i !== index) })
  }

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
    const found = validate(values, isNew)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    // Σχήμα request όπως ακριβώς το ορίζει το API_CONTRACT.md.
    onSubmit({
      title: values.title.trim(),
      categories: values.categories,
      eventType: values.eventType.trim(),
      venue: values.venue.trim(),
      address: values.address.trim(),
      city: values.city.trim(),
      country: values.country.trim(),
      geoLocation: { lat: Number(values.lat), lng: Number(values.lng) },
      startDateTime: fromInputDateTime(values.start),
      endDateTime: fromInputDateTime(values.end),
      capacity: Number(values.capacity),
      ticketTypes: values.ticketTypes.map((t) => ({
        id: t.id,
        name: t.name.trim(),
        price: Number(t.price).toFixed(2),
        quantity: Number(t.quantity),
      })),
      description: values.description.trim(),
      media: [],
    })
  }

  const ticketSum = values.ticketTypes.reduce((total, t) => total + (Number(t.quantity) || 0), 0)
  const capacity = Number(values.capacity) || 0
  const hasCoords = values.lat !== '' && values.lng !== '' && !errors.lat && !errors.lng

  return (
    <form className="eform" onSubmit={handleSubmit} noValidate>
      <Alert kind="error">{serverError}</Alert>

      {/* ---------- Βασικά στοιχεία ---------- */}
      <section className="eform__section">
        <h2 className="eform__legend">Βασικά στοιχεία</h2>

        <div className="eform__grid">
          <Field
            label="Τίτλος" name="title" value={values.title} onChange={handleChange}
            error={errors.title} touched={submitted} required
          />
          <Field
            label="Τύπος εκδήλωσης" name="eventType" value={values.eventType} onChange={handleChange}
            error={errors.eventType} touched={submitted} placeholder="π.χ. Concert, Seminar" required
          />
        </div>

        <div style={{ marginTop: 'var(--space-4)' }}>
          <span className="field__label">Κατηγορίες <span className="field__req">*</span></span>
          <div className="eform__chips" style={{ marginTop: 'var(--space-2)' }}>
            {EVENT_CATEGORIES.map((category) => (
              <label
                key={category}
                className={`chip ${values.categories.includes(category) ? 'chip--on' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={values.categories.includes(category)}
                  onChange={() => toggleCategory(category)}
                />
                {category}
              </label>
            ))}
          </div>
          {submitted && errors.categories && (
            <span className="field__message" role="alert">{errors.categories}</span>
          )}
        </div>

        <div className="field" style={{ marginTop: 'var(--space-4)' }}>
          <label className="field__label" htmlFor="description">
            Περιγραφή <span className="field__req">*</span>
          </label>
          <textarea
            id="description" name="description" className="eform__textarea"
            value={values.description} onChange={handleChange}
          />
          {submitted && errors.description && (
            <span className="field__message" role="alert">{errors.description}</span>
          )}
        </div>
      </section>

      {/* ---------- Πότε & πού ---------- */}
      <section className="eform__section">
        <h2 className="eform__legend">Πότε &amp; πού</h2>

        <div className="eform__grid">
          <Field
            label="Έναρξη" name="start" type="datetime-local" value={values.start}
            onChange={handleChange} error={errors.start} touched={submitted} required
          />
          <Field
            label="Λήξη" name="end" type="datetime-local" value={values.end}
            onChange={handleChange} error={errors.end} touched={submitted} required
          />
        </div>

        <div className="eform__grid" style={{ marginTop: 'var(--space-4)' }}>
          <Field
            label="Χώρος" name="venue" value={values.venue} onChange={handleChange}
            error={errors.venue} touched={submitted} required
          />
          <Field
            label="Διεύθυνση" name="address" value={values.address} onChange={handleChange}
            error={errors.address} touched={submitted} required
          />
          <Field
            label="Πόλη" name="city" value={values.city} onChange={handleChange}
            error={errors.city} touched={submitted} required
          />
          <Field
            label="Χώρα" name="country" value={values.country} onChange={handleChange}
            error={errors.country} touched={submitted} required
          />
        </div>

        <div className="eform__grid" style={{ marginTop: 'var(--space-4)' }}>
          <Field
            label="Γεωγρ. πλάτος (lat)" name="lat" type="number" step="any" value={values.lat}
            onChange={handleChange} error={errors.lat} touched={submitted} required
          />
          <Field
            label="Γεωγρ. μήκος (lng)" name="lng" type="number" step="any" value={values.lng}
            onChange={handleChange} error={errors.lng} touched={submitted} required
          />
        </div>
        <p className="eform__hint">
          Οι συντεταγμένες εμφανίζονται ως χάρτης στη σελίδα της εκδήλωσης.
          Τις βρίσκετε με δεξί κλικ → «Show address» στο openstreetmap.org.
        </p>

        {hasCoords && (
          <div style={{ marginTop: 'var(--space-4)' }}>
            <EventMap
              geoLocation={{ lat: Number(values.lat), lng: Number(values.lng) }}
              label={values.venue || 'προεπισκόπηση'}
            />
          </div>
        )}
      </section>

      {/* ---------- Εισιτήρια ---------- */}
      <section className="eform__section">
        <h2 className="eform__legend">Χωρητικότητα &amp; εισιτήρια</h2>

        <div className="eform__grid">
          <Field
            label="Χωρητικότητα (άτομα)" name="capacity" type="number" min="1" value={values.capacity}
            onChange={handleChange} error={errors.capacity} touched={submitted} required
          />
        </div>

        <div className="tickets" style={{ marginTop: 'var(--space-5)' }}>
          <div className="tickets__head">
            <span>Τύπος εισιτηρίου</span>
            <span>Τιμή (€)</span>
            <span>Ποσότητα</span>
            <span />
          </div>

          {values.ticketTypes.map((ticket, index) => (
            <div className="ticket-row" key={ticket.id ?? `new-${index}`}>
              <input
                className="ticket-row__input" aria-label={`Όνομα τύπου ${index + 1}`}
                value={ticket.name} placeholder="π.χ. Γενική είσοδος"
                onChange={(e) => updateTicket(index, { name: e.target.value })}
              />
              <input
                className="ticket-row__input" aria-label={`Τιμή τύπου ${index + 1}`}
                type="number" min="0" step="0.01" value={ticket.price} placeholder="0.00"
                onChange={(e) => updateTicket(index, { price: e.target.value })}
              />
              <input
                className="ticket-row__input" aria-label={`Ποσότητα τύπου ${index + 1}`}
                type="number" min="1" value={ticket.quantity} placeholder="0"
                onChange={(e) => updateTicket(index, { quantity: e.target.value })}
              />
              <button
                type="button"
                className="ticket-row__remove"
                onClick={() => removeTicket(index)}
                /* Τύπος με κρατήσεις δεν διαγράφεται — ούτε ο τελευταίος. */
                disabled={values.ticketTypes.length === 1 || ticket.reserved > 0}
                title={ticket.reserved > 0 ? 'Έχει κρατήσεις' : 'Αφαίρεση'}
              >
                ✕
              </button>

              {submitted && errors.ticketTypes?.[index] && (
                <span className="ticket-row__error" role="alert">{errors.ticketTypes[index]}</span>
              )}
            </div>
          ))}

          <div>
            <button type="button" className="btn btn--outline" onClick={addTicket}>
              + Προσθήκη τύπου
            </button>
          </div>

          <p className={`tickets__sum ${capacity > 0 && ticketSum > capacity ? 'tickets__sum--over' : ''}`}>
            <span>Σύνολο εισιτηρίων</span>
            <span>{ticketSum} από {capacity || '—'} θέσεις</span>
          </p>

          {submitted && errors.capacitySum && (
            <span className="field__message" role="alert">{errors.capacitySum}</span>
          )}
        </div>
      </section>

      <div className="eform__actions">
        <button type="button" className="btn btn--muted" onClick={onCancel} disabled={submitting}>
          Άκυρο
        </button>
        <button type="submit" className="btn btn--primary btn--lg" disabled={submitting}>
          {submitting ? 'Αποθήκευση…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
