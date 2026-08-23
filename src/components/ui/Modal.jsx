/* ============================================================
   Modal — παράθυρο επιβεβαίωσης.
   Χρήση: επιβεβαίωση κράτησης (εκφώνηση §9 — η κράτηση είναι
   μη αναστρέψιμη, οπότε ο χρήστης πρέπει να επιβεβαιώσει ρητά).
   Κλείνει με Escape ή κλικ στο φόντο.
   ============================================================ */
import { useEffect } from 'react'
import './Modal.css'

export default function Modal({ title, children, confirmLabel = 'Επιβεβαίωση', onConfirm, onClose, busy = false }) {
  // Escape → κλείσιμο (προσβασιμότητα).
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="modal__backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* stopPropagation: κλικ μέσα στο παράθυρο δεν το κλείνει */}
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">{title}</h2>
        <div className="modal__body">{children}</div>

        <div className="modal__actions">
          <button className="btn btn--muted" onClick={onClose} disabled={busy}>
            Άκυρο
          </button>
          <button className="btn btn--primary" onClick={onConfirm} disabled={busy}>
            {busy ? 'Παρακαλώ περιμένετε…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
