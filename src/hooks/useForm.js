/* ============================================================
   useForm — ελαφρύ hook διαχείρισης φόρμας.
   Κρατά values, errors, touched και τρέχει τους validators.
   Επιστρέφει helpers για binding των πεδίων (handleChange/handleBlur)
   και validateAll() για submit.
   ============================================================ */
import { useState, useCallback } from 'react'
import { runValidators } from '../utils/validation.js'

export function useForm(initialValues, validators = {}) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
  }, [])

  const handleBlur = useCallback(
    (e) => {
      const { name } = e.target
      setTouched((prev) => ({ ...prev, [name]: true }))
      // Validate το συγκεκριμένο πεδίο on blur (άμεση ανατροφοδότηση).
      // Το value έχει ήδη γραφτεί στο handleChange, οπότε το `values` εδώ είναι ενημερωμένο.
      if (validators[name]) {
        const msg = validators[name](values[name], values)
        setErrors((prev) => ({ ...prev, [name]: msg }))
      }
    },
    [validators, values],
  )

  /* Validate όλα τα πεδία (π.χ. στο submit). Μαρκάρει όλα ως touched. */
  const validateAll = useCallback(() => {
    const { errors: allErrors, isValid } = runValidators(values, validators)
    setErrors(allErrors)
    setTouched(Object.keys(validators).reduce((acc, k) => ({ ...acc, [k]: true }), {}))
    return isValid
  }, [values, validators])

  /* Καθαρίζει το error ενός πεδίου (π.χ. μετά από server-side σφάλμα). */
  const setFieldError = useCallback((name, message) => {
    setErrors((prev) => ({ ...prev, [name]: message }))
    setTouched((prev) => ({ ...prev, [name]: true }))
  }, [])

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    setFieldError,
  }
}
