/* ============================================================
   App — κεντρικό routing της εφαρμογής.
   Δομή σελίδων σύμφωνα με την εκφώνηση & το API_CONTRACT.md.
   Όσες σελίδες είναι ακόμη placeholders υλοποιούνται στις
   επόμενες φάσεις (dashboard διοργανωτή, μηνύματα, admin).
   ============================================================ */
import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'

import Welcome from './pages/Welcome.jsx'
import Login from './pages/auth/Login.jsx'
import Register from './pages/auth/Register.jsx'
import Pending from './pages/auth/Pending.jsx'
import EventsList from './pages/events/EventsList.jsx'
import EventDetail from './pages/events/EventDetail.jsx'
import MyBookings from './pages/bookings/MyBookings.jsx'
import Placeholder from './pages/Placeholder.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <Routes>
      {/* --- Auth σελίδες: δικό τους full-screen layout (χωρίς Header) --- */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/pending" element={<Pending />} />

      <Route element={<Layout />}>
        {/* --- Δημόσια (GUEST) --- */}
        <Route path="/" element={<Welcome />} />
        <Route path="/events" element={<EventsList />} />
        <Route path="/events/:id" element={<EventDetail />} />

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
              <MyBookings />
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
