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

      <div className="epic-status-grid">
        <section className="info-section">
          <h3>Epic A — Organisationsstruktur</h3>
          <ul className="checklist">
            <li className="done">A1: Organisationsstruktur mit Hierarchie</li>
            <li className="done">A1: Scope-Logik dokumentiert (Nachfahren)</li>
            <li className="done">A2: Profil mit Multi-Auswahl für OrgUnits</li>
            <li className="done">A2: Validierung (keine Duplikate)</li>
          </ul>
        </section>

        <section className="info-section">
          <h3>Epic B — Rollen & Berechtigungen</h3>
          <ul className="checklist">
            <li className="done">B1: Rollenmodell (Member/Organizer/Admin)</li>
            <li className="done">B1: Navigation role-based geschützt</li>
            <li className="done">B1: ProtectedRoute für Zugriffskontrolle</li>
            <li className="done">B2: Organizer-Bereich mit Scope-Filter</li>
            <li className="done">B2: Scope-Logik konsistent angewendet</li>
          </ul>
        </section>

        <section className="info-section">
          <h3>Epic C — Events v1</h3>
          <ul className="checklist">
            <li className="done">C1: Event-Liste mit Scope-Filterung</li>
            <li className="done">C1: Event-Detailansicht</li>
            <li className="done">C1: "Angemeldet"-Badge</li>
            <li className="done">C2: Anmeldung/Abmeldung mit Bestätigung</li>
            <li className="done">C2: Fehlerbehandlung</li>
          </ul>
        </section>

        <section className="info-section">
          <h3>Epic D — Groups & Capacity</h3>
          <ul className="checklist">
            <li className="done">D1: Gruppen mit Kapazitätsanzeige</li>
            <li className="done">D1: Optionale Startzeiten pro Gruppe</li>
            <li className="done">D2: Gruppenauswahl bei Anmeldung</li>
            <li className="done">D2: Kapazitätsprüfung (volle Gruppen blockiert)</li>
            <li className="done">D2: Abmeldung gibt Kapazität frei</li>
          </ul>
        </section>

        <section className="info-section">
          <h3>Epic E — Event Management</h3>
          <ul className="checklist">
            <li className="done">E1: Event CRUD im Organizer-Bereich</li>
            <li className="done">E1: Scope-Validierung bei Event-Erstellung</li>
            <li className="done">E2: Gruppen-Verwaltung pro Event</li>
            <li className="done">E2: Kapazitätsänderungen mit Validierung</li>
          </ul>
        </section>

        <section className="info-section">
          <h3>Epic F — Event-Specific Roles</h3>
          <ul className="checklist">
            <li className="done">F1: 5 feste Rollentypen definiert</li>
            <li className="done">F1: Rollen-Zuweisung im Organizer-Bereich</li>
            <li className="done">F1: Rollen-Anzeige in Event-Details</li>
          </ul>
        </section>

        <section className="info-section">
          <h3>Epic G — Privacy & Compliance</h3>
          <ul className="checklist">
            <li className="done">G1: Datensichtbarkeits-Regeln definiert</li>
            <li className="done">G1: Datenmaskierung implementiert</li>
            <li className="done">G1: Privacy-Info im Profil</li>
            <li className="done">G2: Audit-Konzept dokumentiert</li>
            <li className="done">G2: DSGVO-Rechte angezeigt</li>
          </ul>
        </section>
      </div>

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
