import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';

/**
 * Layout Component
 *
 * Provides the main application layout with role-based navigation.
 *
 * Navigation visibility:
 * - Dashboard, Organisation, Profil: All members
 * - Organizer-Bereich: Organizers and Admins only
 * - Admin-Bereich: Admins only
 */
function Layout() {
  const { user, isAdmin, isOrganizer, hasOrganizerAccess, hasAdminAccess } = useAuth();

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">JMP</h1>
          <span className="logo-subtitle">Jagd-Management-Portal</span>
        </div>
        <div className="user-info">
          <span className="user-email">{user.email}</span>
          {isAdmin && <span className="role-tag admin">Admin</span>}
          {isOrganizer && !isAdmin && <span className="role-tag organizer">Organisator</span>}
          {!isOrganizer && !isAdmin && <span className="role-tag member">Mitglied</span>}
        </div>
      </header>

      <div className="main-container">
        <nav className="sidebar">
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

            {/* Organizer/Admin section - only visible if user has access */}
            {hasOrganizerAccess && (
              <>
                <li className="nav-divider">
                  <span>Verwaltung</span>
                </li>
                <li>
                  <NavLink to="/organizer" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                    Organizer-Bereich
                  </NavLink>
                </li>
              </>
            )}

            {/* Admin section - only visible if user is admin */}
            {hasAdminAccess && (
              <li>
                <NavLink to="/admin" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  Admin-Bereich
                </NavLink>
              </li>
            )}
          </ul>

          {/* Role info box */}
          <div className="role-info-box">
            <h4>Ihre Rollen</h4>
            <ul>
              <li className="active">Mitglied</li>
              {isOrganizer && <li className="active">Organisator</li>}
              {isAdmin && <li className="active">Administrator</li>}
            </ul>
          </div>
        </nav>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
