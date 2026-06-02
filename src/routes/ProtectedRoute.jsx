/* ============================================================
   ProtectedRoute — περιορισμός πρόσβασης ανά ρόλο.
   Χρήση στο App routing:
     <ProtectedRoute allow={['USER','ADMIN']}> ... </ProtectedRoute>

   - Μη συνδεδεμένος (GUEST) σε προστατευμένη σελίδα → /login
   - Λάθος ρόλος → /  (αρχική)
   ============================================================ */
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProtectedRoute({ allow, children }) {
  const { role, isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    // Κρατάμε το from ώστε μετά το login να επιστρέψουμε εδώ.
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allow && !allow.includes(role)) {
    return <Navigate to="/" replace />
  }

  return children
}
