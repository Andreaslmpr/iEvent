/* ============================================================
   AuthContext — κεντρική κατάσταση ταυτοποίησης.
   Παρέχει: τρέχοντα χρήστη, ρόλο, login(), logout().
   Τα στοιχεία επιβιώνουν σε refresh μέσω localStorage (token.js).
   ============================================================ */
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { getStoredUser, saveSession, clearSession } from '../auth/token.js'
import { login as apiLogin } from '../api/index.js'
import { UNAUTHORIZED_EVENT } from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Αρχικοποίηση από localStorage ώστε το login να επιβιώνει σε refresh.
  const [user, setUser] = useState(() => getStoredUser())

  const login = useCallback(async (credentials) => {
    const { token, user: loggedIn } = await apiLogin(credentials)
    saveSession(token, loggedIn)
    setUser(loggedIn)
    return loggedIn
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])

  /* Όταν ο interceptor δει 401 (έληξε/ακυρώθηκε το JWT), μηδενίζουμε και το
     state — αλλιώς το UI θα έδειχνε συνδεδεμένο χρήστη χωρίς token, και το
     ProtectedRoute δεν θα έστελνε ποτέ στο /login. */
  useEffect(() => {
    const onUnauthorized = () => setUser(null)
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [])

  const value = {
    user,
    role: user?.role ?? 'GUEST',
    isAuthenticated: Boolean(user),
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/* Hook πρόσβασης στο auth state από οποιοδήποτε component. */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth πρέπει να χρησιμοποιείται μέσα σε <AuthProvider>')
  return ctx
}
