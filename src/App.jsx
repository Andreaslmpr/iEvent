/* ============================================================
   App — κεντρικό routing της εφαρμογής.
   Δομή σελίδων σύμφωνα με την εκφώνηση & το API_CONTRACT.md.
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
import Dashboard from './pages/dashboard/Dashboard.jsx'
import EventCreate from './pages/dashboard/EventCreate.jsx'
import EventEdit from './pages/dashboard/EventEdit.jsx'
import EventBookings from './pages/dashboard/EventBookings.jsx'
import AdminUsers from './pages/admin/AdminUsers.jsx'
import UserDetail from './pages/admin/UserDetail.jsx'
import Messages from './pages/messages/Messages.jsx'
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
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/events/new"
          element={
            <ProtectedRoute allow={['USER', 'ADMIN']}>
              <EventCreate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/events/:id/edit"
          element={
            <ProtectedRoute allow={['USER', 'ADMIN']}>
              <EventEdit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/events/:id/bookings"
          element={
            <ProtectedRoute allow={['USER', 'ADMIN']}>
              <EventBookings />
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
              <Messages />
            </ProtectedRoute>
          }
        />

        {/* --- Μόνο διαχειριστής --- */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allow={['ADMIN']}>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users/:id"
          element={
            <ProtectedRoute allow={['ADMIN']}>
              <UserDetail />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
