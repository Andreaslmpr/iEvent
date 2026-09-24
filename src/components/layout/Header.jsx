/* ============================================================
   Header — κεντρική πλοήγηση, ευαίσθητη στην κατάσταση σύνδεσης.
   - GUEST: Εκδηλώσεις, Είσοδος, Εγγραφή
   - USER:  Εκδηλώσεις, Dashboard, Κρατήσεις, Μηνύματα, Έξοδος
   - ADMIN: + Διαχείριση

   Σε στενές οθόνες το μενού κρύβεται πίσω από κουμπί «☰» και
   ανοίγει ως πάνελ κάτω από τη μπάρα. Κλείνει σε κάθε αλλαγή σελίδας.
   ============================================================ */
import { useEffect, useState } from 'react'
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useUnreadCount } from '../../hooks/useUnreadCount.js'
import { displayName } from '../../utils/format.js'
import './Header.css'

export default function Header() {
  const { user, role, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const unread = useUnreadCount(isAuthenticated)
  const [menuOpen, setMenuOpen] = useState(false)

  // Μόλις ο χρήστης πάει σε άλλη σελίδα, το μενού του κινητού κλείνει.
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <header className="header">
      <div className="container header__inner">
        <Link to="/" className="header__brand">
          i<span className="header__brand-accent">Event</span>
        </Link>

        <button
          type="button"
          className="header__toggle"
          aria-expanded={menuOpen}
          aria-controls="main-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="sr-only">{menuOpen ? 'Κλείσιμο μενού' : 'Άνοιγμα μενού'}</span>
          <span aria-hidden="true">{menuOpen ? '✕' : '☰'}</span>
          {unread > 0 && !menuOpen && <span className="header__toggle-dot" aria-hidden="true" />}
        </button>

        <div id="main-menu" className={`header__menu ${menuOpen ? 'header__menu--open' : ''}`}>
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
                <span className="header__user">
                  {/* Αρχικό γράμμα ως «avatar» — δεν έχουμε φωτογραφίες προφίλ. */}
                  <span className="header__avatar" aria-hidden="true">
                    {displayName(user)[0]}
                  </span>
                  {displayName(user)}
                </span>
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
      </div>
    </header>
  )
}
