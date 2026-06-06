/* ============================================================
   AuthLayout — split-screen κέλυφος για Login/Register/Pending.
   Αριστερά: editorial visual panel (brand + tagline).
   Δεξιά: το περιεχόμενο της φόρμας (children).
   ============================================================ */
import { Link } from 'react-router-dom'
import './AuthLayout.css'

export default function AuthLayout({ title, subtitle, children, wide = false }) {
  return (
    <div className="auth">
      {/* --- Visual panel --- */}
      <aside className="auth__aside">
        <div className="auth__aside-content">
          <Link to="/" className="auth__brand">
            Stay<span className="auth__brand-accent">App</span>
          </Link>
          <blockquote className="auth__quote">
            «Κάθε εκδήλωση είναι μια ιστορία.<br />Βρες τη δική σου θέση μέσα της.»
          </blockquote>
          <p className="auth__quote-sub">
            Συναυλίες · Σεμινάρια · Παραστάσεις · Ημερίδες
          </p>
        </div>
        <div className="auth__aside-glow" aria-hidden="true" />
      </aside>

      {/* --- Form panel --- */}
      <main className="auth__main">
        <div className={`auth__form-wrap ${wide ? 'auth__form-wrap--wide' : ''}`}>
          <header className="auth__header">
            <h1 className="auth__title">{title}</h1>
            {subtitle && <p className="auth__subtitle">{subtitle}</p>}
          </header>
          {children}
        </div>
      </main>
    </div>
  )
}
