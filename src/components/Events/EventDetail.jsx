import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useEvents } from '../../context/EventContext';
import { orgUnitLevels } from '../../data/mockData';
import PrivacyInfo from '../Privacy/PrivacyInfo';
import './Events.css';

/**
 * EventDetail Component
 *
 * Shows event details with groups and handles registration.
 * - Displays groups with capacity (D1)
 * - Group selection during registration (D2)
 * - Capacity enforcement (D2)
 */
function EventDetail() {
  const { eventId } = useParams();
  const {
    getEventById,
    getOrgUnitById,
    isRegistered,
    getRegistration,
    registerForEvent,
    unregisterFromEvent,
    eventHasGroups,
    getEventGroupsWithCapacity,
    getGroupById,
    getEventRolesWithDetails,
  } = useEvents();

  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const event = getEventById(eventId);

  if (!event) {
    return (
      <div className="event-detail-page">
        <div className="error-state">
          <h2>Event nicht gefunden</h2>
          <p>Das Event existiert nicht oder Sie haben keinen Zugriff.</p>
          <Link to="/events" className="back-link">← Zurück zur Übersicht</Link>
        </div>
      </div>
    );
  }

  const scopeOrg = getOrgUnitById(event.scopeOrgId);
  const registered = isRegistered(event.id);
  const registration = getRegistration(event.id);
  const hasGroups = eventHasGroups(event.id);
  const groupsWithCapacity = hasGroups ? getEventGroupsWithCapacity(event.id) : [];
  const registeredGroup = registration?.groupId ? getGroupById(registration.groupId) : null;
  const eventRoles = getEventRolesWithDetails(event.id);

  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleRegisterClick = () => {
    if (hasGroups && !selectedGroupId) {
      setError('Bitte wählen Sie eine Gruppe aus');
      return;
    }
    setConfirmAction('register');
    setShowConfirmDialog(true);
    setError(null);
    setSuccess(null);
  };

  const handleUnregisterClick = () => {
    setConfirmAction('unregister');
    setShowConfirmDialog(true);
    setError(null);
    setSuccess(null);
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (confirmAction === 'register') {
        await registerForEvent(event.id, selectedGroupId);
        setSuccess('Sie wurden erfolgreich angemeldet!');
        setSelectedGroupId(null);
      } else {
        await unregisterFromEvent(event.id);
        setSuccess('Sie wurden erfolgreich abgemeldet.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    setConfirmAction(null);
  };

  const selectedGroup = selectedGroupId ? groupsWithCapacity.find(g => g.id === selectedGroupId) : null;

  return (
    <div className="event-detail-page">
      <Link to="/events" className="back-link">← Zurück zur Übersicht</Link>

      <div className="event-detail-card">
        {registered && (
          <div className="registration-status registered">
            <span className="status-icon">✓</span>
            <div>
              <strong>Sie sind angemeldet</strong>
              {registeredGroup && (
                <span className="registration-group">
                  Gruppe: {registeredGroup.name}
                </span>
              )}
              {registration && (
                <span className="registration-date">
                  Angemeldet am {new Date(registration.registeredAt).toLocaleDateString('de-DE')}
                </span>
              )}
            </div>
          </div>
        )}

        {success && (
          <div className="alert success">
            <span className="alert-icon">✓</span>
            {success}
          </div>
        )}

        {error && (
          <div className="alert error">
            <span className="alert-icon">!</span>
            {error}
          </div>
        )}

        <header className="event-header">
          <h1>{event.name}</h1>
          {scopeOrg && (
            <span className={`scope-tag large level-${scopeOrg.level}`}>
              {orgUnitLevels[scopeOrg.level]?.name}: {scopeOrg.name}
            </span>
          )}
        </header>

        <div className="event-details">
          <div className="detail-row">
            <span className="detail-icon">📅</span>
            <div className="detail-content">
              <span className="detail-label">Beginn</span>
              <span className="detail-value">{formatDateTime(event.startDate)} Uhr</span>
            </div>
          </div>

          <div className="detail-row">
            <span className="detail-icon">🏁</span>
            <div className="detail-content">
              <span className="detail-label">Ende</span>
              <span className="detail-value">{formatDateTime(event.endDate)} Uhr</span>
            </div>
          </div>

          <div className="detail-row">
            <span className="detail-icon">📍</span>
            <div className="detail-content">
              <span className="detail-label">Ort</span>
              <span className="detail-value">{event.location}</span>
            </div>
          </div>
        </div>

        {event.description && (
          <div className="event-description">
            <h3>Beschreibung</h3>
            <p>{event.description}</p>
          </div>
        )}

        {/* Groups Section */}
        {hasGroups && (
          <div className="groups-section">
            <h3>Gruppen wählen</h3>
            <p className="groups-info">
              Dieses Event hat mehrere Gruppen mit begrenzter Kapazität.
              {!registered && ' Bitte wählen Sie eine Gruppe für Ihre Anmeldung.'}
            </p>

            <div className="groups-list">
              {groupsWithCapacity.map(group => (
                <div
                  key={group.id}
                  className={`group-card ${group.isFull ? 'full' : ''} ${selectedGroupId === group.id ? 'selected' : ''} ${registered ? 'disabled' : ''}`}
                  onClick={() => {
                    if (!registered && !group.isFull) {
                      setSelectedGroupId(group.id);
                      setError(null);
                    }
                  }}
                >
                  <div className="group-header">
                    <span className="group-name">{group.name}</span>
                    {group.startTime && (
                      <span className="group-time">{formatTime(group.startTime)} Uhr</span>
                    )}
                  </div>

                  <div className="group-capacity">
                    <div className="capacity-bar">
                      <div
                        className="capacity-fill"
                        style={{ width: `${(group.currentCount / group.capacity) * 100}%` }}
                      />
                    </div>
                    <span className="capacity-text">
                      {group.currentCount} / {group.capacity} Plätze belegt
                    </span>
                  </div>

                  {group.isFull ? (
                    <span className="group-status full">Ausgebucht</span>
                  ) : (
                    <span className="group-status available">
                      {group.availableCapacity} {group.availableCapacity === 1 ? 'Platz' : 'Plätze'} frei
                    </span>
                  )}

                  {!registered && !group.isFull && (
                    <div className="group-select-indicator">
                      {selectedGroupId === group.id ? '✓ Ausgewählt' : 'Auswählen'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Event Roles Section */}
        {eventRoles.length > 0 && (
          <div className="roles-section">
            <h3>Verantwortliche</h3>
            <div className="roles-list">
              {eventRoles.map(role => (
                <div key={role.id} className="role-item">
                  <span className="role-type-badge">{role.name}</span>
                  <span className="role-user">
                    {role.userEventRoles?.length > 0
                      ? `${role.userEventRoles.length} zugewiesen`
                      : 'Unbesetzt'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!registered && (
          <div className="privacy-notice-container">
            <PrivacyInfo variant="registration" />
          </div>
        )}

        <div className="event-actions">
          {!registered ? (
            <button
              className="btn btn-primary btn-large"
              onClick={handleRegisterClick}
              disabled={isLoading || (hasGroups && !selectedGroupId)}
            >
              {hasGroups && selectedGroup
                ? `Für "${selectedGroup.name}" anmelden`
                : 'Jetzt anmelden'}
            </button>
          ) : (
            <button
              className="btn btn-danger btn-large"
              onClick={handleUnregisterClick}
              disabled={isLoading}
            >
              Abmelden
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="dialog-overlay" onClick={handleCancel}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <h3>
              {confirmAction === 'register'
                ? 'Anmeldung bestätigen'
                : 'Abmeldung bestätigen'}
            </h3>
            <p>
              {confirmAction === 'register'
                ? `Möchten Sie sich verbindlich für "${event.name}"${selectedGroup ? ` (Gruppe: ${selectedGroup.name})` : ''} anmelden?`
                : `Möchten Sie Ihre Anmeldung für "${event.name}" wirklich stornieren?`}
            </p>
            {confirmAction === 'unregister' && registeredGroup && (
              <p className="dialog-note">
                Ihr Platz in der Gruppe "{registeredGroup.name}" wird freigegeben.
              </p>
            )}
            <div className="dialog-actions">
              <button
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Abbrechen
              </button>
              <button
                className={`btn ${confirmAction === 'register' ? 'btn-primary' : 'btn-danger'}`}
                onClick={handleConfirm}
                disabled={isLoading}
              >
                {isLoading ? 'Wird verarbeitet...' : 'Bestätigen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventDetail;
