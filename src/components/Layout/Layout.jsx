import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/organisation': 'Organisation',
  '/events': 'Events',
  '/profil': 'Mein Profil',
  '/organizer': 'Event-Verwaltung',
  '/manage': 'Mitgliederverwaltung',
  '/admin/zugangsverwaltung': 'Zugangsverwaltung',
  '/admin/organisationsstruktur': 'Organisationsstruktur',
};

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function Layout() {
  const { user, isAdmin, isOrganizer, hasOrganizerAccess, hasAdminAccess, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const getPageTitle = () => {
    if (location.pathname.startsWith('/events/')) return 'Event-Details';
    return PAGE_TITLES[location.pathname] || 'JMP';
  };

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email?.split('@')[0] || '?'
    : '?';
  const roleLabel = isAdmin ? 'Administrator' : isOrganizer ? 'Organisator' : 'Mitglied';

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <nav className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-text">JMP</span>
        </div>

        <ul className="nav-list">
          <li>
            <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} end>
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/organisation" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Organisation
            </NavLink>
          </li>
          <li>
            <NavLink to="/events" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Events
            </NavLink>
          </li>
          <li>
            <NavLink to="/profil" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Profil
            </NavLink>
          </li>

          {hasOrganizerAccess && (
            <>
              <li className="nav-divider">
                <span>Verwaltung</span>
              </li>
              <li>
                <NavLink to="/manage" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  Mitgliederverwaltung
                </NavLink>
              </li>
              <li>
                <NavLink to="/organizer" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  Event-Verwaltung
                </NavLink>
              </li>
            </>
          )}

          {hasAdminAccess && (
            <>
              <li className="nav-divider">
                <span>Admin</span>
              </li>
              <li>
                <NavLink to="/admin/zugangsverwaltung" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  Zugangsverwaltung
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/organisationsstruktur" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  Organisationsstruktur
                </NavLink>
              </li>
            </>
          )}
        </ul>

        {/* User block */}
        <div className="sidebar-user">
          <div className="user-avatar">{getInitials(displayName)}</div>
          <div className="user-info">
            <span className="user-name">{displayName}</span>
            <span className="user-role">{roleLabel}</span>
          </div>
        </div>
      </nav>

      {/* Right side: topbar + content */}
      <div className="main-wrapper">
        <header className="topbar">
          <span className="topbar-title">{getPageTitle()}</span>
          <div className="topbar-right">
            <button className="topbar-icon-btn" title="Benachrichtigungen">
              🔔
            </button>
            <div className="topbar-avatar-wrapper">
              <button
                className="topbar-avatar"
                onClick={() => setUserMenuOpen(o => !o)}
                title={displayName}
              >
                {getInitials(displayName)}
              </button>
              {userMenuOpen && (
                <div className="user-dropdown" onClick={() => setUserMenuOpen(false)}>
                  <NavLink to="/profil" className="user-dropdown-item">Profil</NavLink>
                  <button
                    className="user-dropdown-item user-dropdown-item--danger"
                    onClick={handleLogout}
                  >
                    Abmelden
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
