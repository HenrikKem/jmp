import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useEvents } from '../../context/EventContext';
import { orgUnitLevels } from '../../data/mockData';
import './Events.css';

/**
 * EventList Component
 *
 * Displays events visible to the current user based on scope.
 * Shows "Angemeldet" badge for registered events.
 */
function EventList() {
  const { getVisibleEvents, isRegistered, getOrgUnitById } = useEvents();
  const [filter, setFilter] = useState('all'); // 'all', 'registered', 'upcoming'

  const visibleEvents = getVisibleEvents();

  // Sort by date
  const sortedEvents = [...visibleEvents].sort(
    (a, b) => new Date(a.startDate) - new Date(b.startDate)
  );

  // Apply filters
  const filteredEvents = sortedEvents.filter(event => {
    if (filter === 'registered') {
      return isRegistered(event.id);
    }
    if (filter === 'upcoming') {
      return new Date(event.startDate) > new Date();
    }
    return true;
  });

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="event-list-page">
      <div className="page-header">
        <h2>Events</h2>
        <p className="subtitle">
          Zeigt Events basierend auf Ihren Organisationszugehörigkeiten
        </p>
      </div>

      <div className="filter-bar">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Alle ({visibleEvents.length})
        </button>
        <button
          className={`filter-btn ${filter === 'upcoming' ? 'active' : ''}`}
          onClick={() => setFilter('upcoming')}
        >
          Anstehend
        </button>
        <button
          className={`filter-btn ${filter === 'registered' ? 'active' : ''}`}
          onClick={() => setFilter('registered')}
        >
          Meine Anmeldungen
        </button>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="empty-state">
          <p>Keine Events gefunden.</p>
          {filter !== 'all' && (
            <button className="link-btn" onClick={() => setFilter('all')}>
              Alle Events anzeigen
            </button>
          )}
        </div>
      ) : (
        <div className="event-cards">
          {filteredEvents.map(event => {
            const scopeOrg = getOrgUnitById(event.scopeOrgId);
            const registered = isRegistered(event.id);

            return (
              <Link
                to={`/events/${event.id}`}
                key={event.id}
                className="event-card"
              >
                {registered && (
                  <span className="registered-badge">Angemeldet</span>
                )}

                <div className="event-date">
                  <span className="day">{new Date(event.startDate).getDate()}</span>
                  <span className="month">
                    {new Date(event.startDate).toLocaleDateString('de-DE', { month: 'short' })}
                  </span>
                </div>

                <div className="event-info">
                  <h3 className="event-title">{event.name}</h3>
                  <div className="event-meta">
                    <span className="meta-item">
                      <span className="icon">📍</span>
                      {event.location}
                    </span>
                    <span className="meta-item">
                      <span className="icon">🕐</span>
                      {formatDate(event.startDate)}, {formatTime(event.startDate)} Uhr
                    </span>
                  </div>
                  {scopeOrg && (
                    <span className={`scope-tag level-${scopeOrg.level}`}>
                      {orgUnitLevels[scopeOrg.level]?.name}: {scopeOrg.name}
                    </span>
                  )}
                </div>

                <span className="arrow">→</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default EventList;
