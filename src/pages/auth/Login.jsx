/* ============================================================
   Login — είσοδος χρήστη (εκφώνηση §1).
   Καλεί AuthContext.login → mock API. Σε επιτυχία, redirect:
     ADMIN → /admin,  USER → η σελίδα που ζητούσε ή /events.
   ============================================================ */
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import AuthLayout from '../../components/auth/AuthLayout.jsx'
import Field from '../../components/form/Field.jsx'
import Alert from '../../components/ui/Alert.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useForm } from '../../hooks/useForm.js'
import { validateUsername, validatePassword } from '../../utils/validation.js'
import './auth-pages.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { values, errors, touched, handleChange, handleBlur, validateAll } = useForm(
    { username: '', password: '' },
    { username: validateUsername, password: validatePassword },
  )

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    if (!validateAll()) return

    setSubmitting(true)
    try {
      const user = await login(values)
      // Redirect: admin στο panel, αλλιώς στη σελίδα που ζητούσε ή στις εκδηλώσεις.
      const from = location.state?.from?.pathname
      const dest = user.role === 'ADMIN' ? '/admin' : from || '/events'
      navigate(dest, { replace: true })
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Καλώς ήρθες πίσω" subtitle="Συνδέσου για να συνεχίσεις.">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <Alert kind="error">{formError}</Alert>

        <Field
          label="Όνομα χρήστη" name="username" value={values.username}
          onChange={handleChange} onBlur={handleBlur}
          error={errors.username} touched={touched.username}
          autoComplete="username" required
        />
        <Field
          label="Κωδικός" name="password" type="password" value={values.password}
          onChange={handleChange} onBlur={handleBlur}
          error={errors.password} touched={touched.password}
          autoComplete="current-password" required
        />

        <button className="btn btn--primary btn--lg auth-form__submit" disabled={submitting}>
          {submitting ? 'Σύνδεση…' : 'Σύνδεση'}
        </button>
      </form>

      <p className="auth-form__foot">
        Δεν έχεις λογαριασμό; <Link to="/register">Κάνε εγγραφή</Link>
      </p>
    </AuthLayout>
  )
}
