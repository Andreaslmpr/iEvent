/* ============================================================
   useUnreadCount — πλήθος μη αναγνωσμένων μηνυμάτων για την
   ένδειξη στο μενού (εκφώνηση §10: ο χρήστης ενημερώνεται για νέα
   μηνύματα από οπουδήποτε κι αν πλοηγείται).

   Το contract προβλέπει polling ~30s στο /messages/unread-count.
   ============================================================ */
import { useEffect, useState } from 'react'
import { getUnreadCount } from '../api/index.js'

const POLL_MS = 30000

export function useUnreadCount(enabled) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setCount(0)
      return
    }
    let cancelled = false

    const load = () =>
      getUnreadCount()
        .then((data) => { if (!cancelled) setCount(data.count) })
        // Δευτερεύουσα ένδειξη: αν αποτύχει, δεν ενοχλούμε τον χρήστη.
        .catch(() => {})

    load()
    const timer = setInterval(load, POLL_MS)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [enabled])

  return count
}
