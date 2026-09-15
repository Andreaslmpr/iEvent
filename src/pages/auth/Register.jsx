/* ============================================================
   Register — εγγραφή νέου χρήστη (εκφώνηση §2).
   Πεδία: username, password (+confirm), όνομα/επώνυμο, email,
   τηλέφωνο, διεύθυνση/πόλη/χώρα, ΑΦΜ και γεωγραφική θέση.
   Η εκφώνηση §2 λέει ότι η εγγραφή «θα απαιτεί» στοιχεία διεύθυνσης ΚΑΙ
   γεωγραφικής τοποθεσίας — γι' αυτό οι συντεταγμένες είναι υποχρεωτικές.
   Σε επιτυχία → /pending. Αν username υπάρχει → inline σφάλμα.
   ============================================================ */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../../components/auth/AuthLayout.jsx'
import Field from '../../components/form/Field.jsx'
import Alert from '../../components/ui/Alert.jsx'
import { useForm } from '../../hooks/useForm.js'
import { register } from '../../api/index.js'
import {
  validateUsername, validatePassword, validateConfirm,
  validateEmail, validatePhone, validateAfm, required,
  validateLatitude, validateLongitude, parseCoordinate,
} from '../../utils/validation.js'
import './auth-pages.css'

const validators = {
  username: validateUsername,
  password: validatePassword,
  confirmPassword: (v, all) => validateConfirm(all.password, v),
  firstName: (v) => required(v, 'Το όνομα'),
  lastName: (v) => required(v, 'Το επώνυμο'),
  email: validateEmail,
  phone: validatePhone,
  address: (v) => required(v, 'Η διεύθυνση'),
  city: (v) => required(v, 'Η πόλη'),
  country: (v) => required(v, 'Η χώρα'),
  afm: validateAfm,
  lat: validateLatitude,
  lng: validateLongitude,
}

/* Ο server επικυρώνει το ένθετο `geoLocation` και επιστρέφει κλειδιά όπως
   "geoLocation.lat". Η φόρμα όμως έχει δύο επίπεδα πεδία, `lat` και `lng` —
   χωρίς αυτή την αντιστοίχιση το σφάλμα θα χανόταν σε πεδίο που δεν υπάρχει. */
const FIELD_FOR_DETAIL = {
  geoLocation: 'lat',
  'geoLocation.lat': 'lat',
  'geoLocation.lng': 'lng',
}

const initial = {
  username: '', password: '', confirmPassword: '',
  firstName: '', lastName: '', email: '', phone: '',
  address: '', city: '', country: 'Greece', afm: '',
  lat: '', lng: '',
}

export default function Register() {
  const navigate = useNavigate()
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [locating, setLocating] = useState(false)
  const f = useForm(initial, validators)

  /* Συμπληρώνει τις συντεταγμένες από τον browser. Η Geolocation API
     λειτουργεί μόνο σε ασφαλές πλαίσιο (HTTPS ή localhost) — που ισχύει εδώ. */
  function fillMyLocation() {
    if (!navigator.geolocation) {
      setFormError('Ο browser δεν υποστηρίζει εντοπισμό θέσης — συμπλήρωσε τις συντεταγμένες χειροκίνητα.')
      return
    }
    setFormError('')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        f.handleChange({ target: { name: 'lat', value: coords.latitude.toFixed(6) } })
        f.handleChange({ target: { name: 'lng', value: coords.longitude.toFixed(6) } })
        setLocating(false)
      },
      () => {
        setFormError('Δεν ήταν δυνατός ο εντοπισμός θέσης — συμπλήρωσε τις συντεταγμένες χειροκίνητα.')
        setLocating(false)
      },
      { timeout: 10000 },
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    if (!f.validateAll()) return

    setSubmitting(true)
    try {
      const { lat, lng, ...rest } = f.values
      const payload = {
        ...rest,
        geoLocation: { lat: parseCoordinate(lat), lng: parseCoordinate(lng) },
      }
      await register(payload)
      navigate('/pending', { replace: true })
    } catch (err) {
      const code = err.response?.data?.error?.code
      if (code === 'USERNAME_TAKEN') {
        f.setFieldError('username', 'Το όνομα χρήστη χρησιμοποιείται ήδη — δοκίμασε άλλο.')
      } else if (code === 'VALIDATION_ERROR') {
        const details = err.response?.data?.error?.details || {}
        Object.entries(details).forEach(([k, msg]) => f.setFieldError(FIELD_FOR_DETAIL[k] ?? k, msg))
        // Σφάλμα σε πεδίο που δεν δείχνει η φόρμα δεν πρέπει να χαθεί σιωπηλά.
        if (Object.keys(details).length === 0) {
          setFormError(err.response?.data?.error?.message || 'Ελέγξτε τα στοιχεία της φόρμας.')
        }
      } else {
        setFormError(err.response?.data?.error?.message || 'Η εγγραφή απέτυχε. Δοκίμασε ξανά.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Συντομία για binding ενός πεδίου.
  const bind = (name) => ({
    name, value: f.values[name], onChange: f.handleChange, onBlur: f.handleBlur,
    error: f.errors[name], touched: f.touched[name],
  })

  return (
    <AuthLayout
      title="Δημιουργία λογαριασμού"
      subtitle="Συμπλήρωσε τα στοιχεία σου για να ξεκινήσεις."
      wide
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <Alert kind="error">{formError}</Alert>

        <fieldset className="auth-form__group">
          <legend className="auth-form__legend">Στοιχεία λογαριασμού</legend>
          <Field label="Όνομα χρήστη" {...bind('username')} autoComplete="username" required />
          <div className="field-row">
            <Field label="Κωδικός" type="password" {...bind('password')} autoComplete="new-password" required />
            <Field label="Επιβεβαίωση κωδικού" type="password" {...bind('confirmPassword')} autoComplete="new-password" required />
          </div>
        </fieldset>

        <fieldset className="auth-form__group">
          <legend className="auth-form__legend">Προσωπικά στοιχεία</legend>
          <div className="field-row">
            <Field label="Όνομα" {...bind('firstName')} autoComplete="given-name" required />
            <Field label="Επώνυμο" {...bind('lastName')} autoComplete="family-name" required />
          </div>
          <div className="field-row">
            <Field label="Email" type="email" {...bind('email')} autoComplete="email" required />
            <Field label="Τηλέφωνο" {...bind('phone')} autoComplete="tel" required />
          </div>
          <Field label="ΑΦΜ" {...bind('afm')} placeholder="9 ψηφία" required />
        </fieldset>

        <fieldset className="auth-form__group">
          <legend className="auth-form__legend">Διεύθυνση & τοποθεσία</legend>
          <Field label="Διεύθυνση" {...bind('address')} autoComplete="street-address" required />
          <div className="field-row">
            <Field label="Πόλη" {...bind('city')} autoComplete="address-level2" required />
            <Field label="Χώρα" {...bind('country')} autoComplete="country-name" required />
          </div>
          <div className="field-row">
            <Field label="Γεωγρ. πλάτος" {...bind('lat')} placeholder="π.χ. 37.9838" required />
            <Field label="Γεωγρ. μήκος" {...bind('lng')} placeholder="π.χ. 23.7275" required />
          </div>
          <div className="auth-form__geo">
            <button
              type="button" className="btn btn--outline"
              onClick={fillMyLocation} disabled={locating}
            >
              {locating ? 'Εντοπισμός…' : 'Χρήση της τοποθεσίας μου'}
            </button>
            <span className="auth-form__hint">
              ή δεξί κλικ στο σημείο σου στο openstreetmap.org → «Show address».
            </span>
          </div>
        </fieldset>

        <button className="btn btn--primary btn--lg auth-form__submit" disabled={submitting}>
          {submitting ? 'Εγγραφή…' : 'Εγγραφή'}
        </button>
      </form>

      <p className="auth-form__foot">
        Έχεις ήδη λογαριασμό; <Link to="/login">Σύνδεση</Link>
      </p>
    </AuthLayout>
  )
}
