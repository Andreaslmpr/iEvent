/* ============================================================
   App — κεντρικό routing της εφαρμογής.
   Δομή σελίδων σύμφωνα με την εκφώνηση & το API_CONTRACT.md.
   Οι περισσότερες σελίδες είναι placeholders στη Φάση 0 και
   υλοποιούνται στις επόμενες φάσεις.
   ============================================================ */
import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'

import Welcome from './pages/Welcome.jsx'
import Placeholder from './pages/Placeholder.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* --- Δημόσια (GUEST) --- */}
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Placeholder title="Είσοδος" />} />
        <Route path="/register" element={<Placeholder title="Εγγραφή" />} />
        <Route path="/pending" element={<Placeholder title="Εκκρεμεί έγκριση" />} />
        <Route path="/events" element={<Placeholder title="Αναζήτηση εκδηλώσεων" />} />
        <Route path="/events/:id" element={<Placeholder title="Στοιχεία εκδήλωσης" />} />

        {/* --- Συνδεδεμένοι χρήστες (USER/ADMIN) --- */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allow={['USER', 'ADMIN']}>
              <Placeholder title="Dashboard Διοργανωτή" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookings"
          element={
            <ProtectedRoute allow={['USER', 'ADMIN']}>
              <Placeholder title="Οι κρατήσεις μου" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute allow={['USER', 'ADMIN']}>
              <Placeholder title="Μηνύματα" />
            </ProtectedRoute>
          }
        />

        {/* --- Μόνο διαχειριστής --- */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allow={['ADMIN']}>
              <Placeholder title="Διαχείριση χρηστών" />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
