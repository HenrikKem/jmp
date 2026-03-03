import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEvents } from '../../context/EventContext';
import './Dashboard.css';

/**
 * Dashboard Component
 *
 * Shows overview for the current user including events and registrations.
 */
function Dashboard() {
  const { user, isAdmin, isOrganizer, getManagedScope } = useAuth();
  const { getVisibleEvents, isRegistered } = useEvents();

  const managedUnits = getManagedScope();
  const visibleEvents = getVisibleEvents();
  const registeredEvents = visibleEvents.filter(e => isRegistered(e.id));
  const upcomingEvents = visibleEvents
    .filter(e => new Date(e.startDate) > new Date())
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .slice(0, 3);

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Meine Mitgliedschaften</h3>
          <div className="stat-number">{user.memberships.length}</div>
          <p>Organisationseinheiten</p>
        </div>

        {(isOrganizer || isAdmin) && (
          <div className="dashboard-card highlight">
            <h3>Mein Verwaltungsbereich</h3>
            <div className="stat-number">{managedUnits.length}</div>
            <p>Einheiten im Scope</p>
          </div>
        )}

        <Link to="/events" className="dashboard-card clickable">
          <h3>Verfügbare Events</h3>
          <div className="stat-number">{visibleEvents.length}</div>
          <p>Events in meinem Scope</p>
        </Link>

        <Link to="/events?filter=registered" className="dashboard-card clickable">
          <h3>Meine Anmeldungen</h3>
          <div className="stat-number">{registeredEvents.length}</div>
          <p>Bestätigte Teilnahmen</p>
        </Link>
      </div>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <section className="info-section upcoming-events">
          <div className="section-header-row">
            <h3>Anstehende Events</h3>
            <Link to="/events" className="view-all-link">Alle anzeigen →</Link>
          </div>
          <div className="mini-event-list">
            {upcomingEvents.map(event => (
              <Link to={`/events/${event.id}`} key={event.id} className="mini-event-item">
                <div className="mini-event-date">
                  <span className="day">{new Date(event.startDate).getDate()}</span>
                  <span className="month">
                    {new Date(event.startDate).toLocaleDateString('de-DE', { month: 'short' })}
                  </span>
                </div>
                <div className="mini-event-info">
                  <span className="mini-event-name">{event.name}</span>
                  <span className="mini-event-location">{event.location}</span>
                </div>
                {isRegistered(event.id) && (
                  <span className="mini-registered-badge">Angemeldet</span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Role Test Info */}
      <section className="info-section role-test">
        <h3>Aktueller Benutzer</h3>
        <div className="user-test-info">
          <p><strong>E-Mail:</strong> {user.email}</p>
          <p>
            <strong>Rollen:</strong>{' '}
            <span className="role-badge member">Mitglied</span>
            {isOrganizer && <span className="role-badge organizer">Organisator</span>}
            {isAdmin && <span className="role-badge admin">Admin</span>}
          </p>
          <p className="hint">
            Der Mock-Benutzer ist Mitglied in "Hegering Münster-Nord" und "Hegering Münster-Süd".
            Events auf Kreis-Ebene (Münster) und höher sind sichtbar.
          </p>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
