/* ============================================================
   Header — κεντρική πλοήγηση, ευαίσθητη στην κατάσταση σύνδεσης.
   - GUEST: Εκδηλώσεις, Είσοδος, Εγγραφή
   - USER:  Εκδηλώσεις, Dashboard, Κρατήσεις, Μηνύματα, Έξοδος
   - ADMIN: + Διαχείριση
   ============================================================ */
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useUnreadCount } from '../../hooks/useUnreadCount.js'
import './Header.css'

export default function Header() {
  const { user, role, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const unread = useUnreadCount(isAuthenticated)

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <header className="header">
      <div className="container header__inner">
        <Link to="/" className="header__brand">
          Stay<span className="header__brand-accent">App</span>
        </Link>

        <nav className="header__nav">
          <NavLink to="/events" className="header__link">Εκδηλώσεις</NavLink>

          {isAuthenticated && (
            <>
              <NavLink to="/dashboard" className="header__link">Dashboard</NavLink>
              <NavLink to="/bookings" className="header__link">Κρατήσεις</NavLink>
              <NavLink to="/messages" className="header__link">
                Μηνύματα
                {unread > 0 && (
                  <span className="header__badge" aria-label={`${unread} νέα μηνύματα`}>
                    {unread}
                  </span>
                )}
              </NavLink>
            </>
          )}

          {role === 'ADMIN' && (
            <NavLink to="/admin" className="header__link">Διαχείριση</NavLink>
          )}
        </nav>

        <div className="header__actions">
          {isAuthenticated ? (
            <>
              <span className="header__user">{user.firstName}</span>
              <button className="btn btn--ghost" onClick={handleLogout}>Έξοδος</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn--ghost">Είσοδος</Link>
              <Link to="/register" className="btn btn--primary">Εγγραφή</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
