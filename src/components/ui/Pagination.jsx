/* ============================================================
   Pagination — πλοήγηση σελίδων για κάθε paginated λίστα
   (το API επιστρέφει page/totalPages — contract §0).
   ============================================================ */
import './Pagination.css'

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null

  return (
    <nav className="pagination" aria-label="Σελιδοποίηση">
      <button
        className="btn btn--outline"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        ← Προηγούμενη
      </button>

      <span className="pagination__info" aria-live="polite">
        Σελίδα {page} από {totalPages}
      </span>

      <button
        className="btn btn--outline"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
      >
        Επόμενη →
      </button>
    </nav>
  )
}
