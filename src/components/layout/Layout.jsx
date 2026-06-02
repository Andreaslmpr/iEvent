/* Layout — κοινό κέλυφος όλων των σελίδων (Header + περιεχόμενο). */
import { Outlet } from 'react-router-dom'
import Header from './Header.jsx'

export default function Layout() {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
    </>
  )
}
