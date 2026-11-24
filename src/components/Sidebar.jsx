import { Link, useLocation } from 'react-router-dom'
import useCurrentMonthKey from '../hooks/useCurrentMonthKey'

export default function Sidebar() {
  const { pathname } = useLocation()
  const currentMonthKey = useCurrentMonthKey()
  const currentMonthPath = `/mes/${currentMonthKey}`
  const onCurrentMonthPage = pathname === currentMonthPath

  return (
    <aside className="sidebar">
      <p className="sidebar-heading">Navegación</p>
      <nav className="sidebar-links" aria-label="Navegación principal">
        <Link to="/" className={`sidebar-link ${pathname === '/' ? 'active' : ''}`} aria-current={pathname === '/' ? 'page' : undefined}>
          Resumen
        </Link>
        <Link to={currentMonthPath} className={`sidebar-link ${onCurrentMonthPage ? 'active' : ''}`} aria-current={onCurrentMonthPage ? 'page' : undefined}>
          Mes actual
        </Link>
        <Link to="/cuotas" className={`sidebar-link ${pathname === '/cuotas' ? 'active' : ''}`} aria-current={pathname === '/cuotas' ? 'page' : undefined}>
          Cuotas
        </Link>
        <Link to="/repeticiones" className={`sidebar-link ${pathname === '/repeticiones' ? 'active' : ''}`} aria-current={pathname === '/repeticiones' ? 'page' : undefined}>
          Repeticiones
        </Link>
      </nav>
    </aside>
  )
}
