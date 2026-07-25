import { NavLink } from 'react-router-dom'

const links = [
  { to: '/nba', label: 'NBA' },
  { to: '/nfl', label: 'NFL' },
  { to: '/live', label: 'Ao Vivo' },
  { to: '/standings', label: 'Classificação' },
]

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="navbar-brand">
          <span className="logo-nba">🏀</span>
          <span>NFL+NBA</span>
          <span className="logo-nfl">🏈</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>Tracker</span>
        </NavLink>
        <ul className="navbar-links">
          {links.map(link => (
            <li key={link.to}>
              <NavLink 
                to={link.to} 
                className={({ isActive }) => isActive ? 'active' : ''}
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
