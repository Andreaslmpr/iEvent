/* EmptyState — μήνυμα όταν μια λίστα δεν έχει αποτελέσματα.
   Το `action` είναι προαιρετικό κουμπί/σύνδεσμος (π.χ. «Καθαρισμός φίλτρων»). */
import './feedback.css'

export default function EmptyState({ title, text, action }) {
  return (
    <div className="state">
      <span className="state__icon" aria-hidden="true">✦</span>
      <p className="state__title">{title}</p>
      {text && <p className="state__text">{text}</p>}
      {action}
    </div>
  )
}
