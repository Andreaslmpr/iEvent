/* ============================================================
   Field — επαναχρησιμοποιήσιμο πεδίο φόρμας (label + input + error).
   Δείχνει error μόνο αφού το πεδίο «αγγιχτεί» (touched) ή μετά submit.
   ============================================================ */
import './form.css'

export default function Field({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  touched,
  required = false,
  autoComplete,
  placeholder,
}) {
  const showError = error && touched
  return (
    <div className={`field ${showError ? 'field--error' : ''}`}>
      <label htmlFor={name} className="field__label">
        {label}
        {required && <span className="field__req" aria-hidden="true"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        className="field__input"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={showError ? 'true' : 'false'}
        aria-describedby={showError ? `${name}-error` : undefined}
      />
      {showError && (
        <span id={`${name}-error`} className="field__message" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
