import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEvents } from '../../context/EventContext';
import { orgUnitLevels } from '../../data/mockData';
import EventForm from './EventForm';
import EventWizard from './EventWizard';
import GroupManager from './GroupManager';
import RoleManager from './RoleManager';
import HintButton from '../HintButton/HintButton';
import './OrganizerArea.css';

/**
 * OrganizerArea Component
 *
 * Scope-based event management area for organizers.
 */

function OrganizerArea() {
  const { isAdmin, getManagedScope, organizerOrgUnitIds, orgUnits } = useAuth();
  const {
    getEventsForManagement,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventRegistrations,
    eventHasGroups,
  } = useEvents();

  // Event form/wizard state
  const [showEventWizard, setShowEventWizard] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const [managingGroupsEventId, setManagingGroupsEventId] = useState(null);
  const [managingRolesEventId, setManagingRolesEventId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const managedScope = getManagedScope();
  const managedOrgUnitIds = managedScope.map(u => u.id);
  const managedEvents = getEventsForManagement(managedOrgUnitIds);

  const getOrgUnitById = (id) => orgUnits.find(u => u.id === id);

  const handleCreateEvent = () => setShowEventWizard(true);

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setShowEventForm(true);
  };

  const handleSaveEvent = async (eventData) => {
    if (editingEvent) {
      await updateEvent(editingEvent.id, eventData);
      setShowEventForm(false);
      setEditingEvent(null);
    } else {
      await createEvent(eventData);
      setShowEventWizard(false);
    }
  };

  const handleCancelEventForm = () => {
    setShowEventForm(false);
    setEditingEvent(null);
  };

  const handleDeleteEvent = async (eventId) => {
    await deleteEvent(eventId);
    setDeleteConfirm(null);
  };

  const handleManageGroups = (eventId) => setManagingGroupsEventId(eventId);
  const handleManageRoles = (eventId) => setManagingRolesEventId(eventId);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  };

  return (
    <div className="organizer-area">
      <div className="organizer-header">
        <h2>Event-Verwaltung</h2>
        <HintButton title="Scope-Information">
          {isAdmin ? (
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Als <strong>Administrator</strong> haben Sie Zugriff auf alle Organisationseinheiten.
            </p>
          ) : (
            <>
              <p>Sie sind Organisator für:</p>
              <ul className="hint-organizer-units">
                {organizerOrgUnitIds.map(orgId => {
                  const unit = getOrgUnitById(orgId);
                  if (!unit) return null;
                  return (
                    <li key={orgId}>
                      <span className="level-badge">{orgUnitLevels[unit.level]?.name}</span>
                      {unit.name}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          <div className="hint-scope-rules">
            <strong>Scope-Regeln:</strong>
            <ul>
              <li><strong>Hierarchie:</strong> Ihr Scope umfasst Ihre zugewiesene(n) Organisationseinheit(en) und alle darunterliegenden Einheiten.</li>
              <li><strong>Mehrfach-Scope:</strong> Sie können Organisator für mehrere Einheiten sein.</li>
              <li><strong>Event-Verwaltung:</strong> Sie können Events erstellen, deren Geltungsbereich in Ihrem Scope liegt.</li>
              <li><strong>Sichtbarkeit:</strong> Events außerhalb Ihres Scopes werden nicht angezeigt.</li>
            </ul>
          </div>
        </HintButton>
      </div>

      {/* Group Manager Modal */}
      {managingGroupsEventId && (
        <GroupManager
          eventId={managingGroupsEventId}
          onClose={() => setManagingGroupsEventId(null)}
        />
      )}

      {/* Role Manager Modal */}
      {managingRolesEventId && (
        <RoleManager
          eventId={managingRolesEventId}
          onClose={() => setManagingRolesEventId(null)}
        />
      )}

      {/* Event Creation Wizard */}
      {showEventWizard && (
        <EventWizard
          onSave={handleSaveEvent}
          onCancel={() => setShowEventWizard(false)}
        />
      )}

      {/* Edit Event Form (existing events) */}
      {showEventForm && editingEvent && (
        <div className="dialog-overlay" onClick={handleCancelEventForm}>
          <div className="dialog dialog--form" onClick={e => e.stopPropagation()}>
            <EventForm
              event={editingEvent}
              onSave={handleSaveEvent}
              onCancel={handleCancelEventForm}
            />
          </div>
        </div>
      )}

      {/* Event List */}
      <section className="event-management">
        <div className="section-header">
          <h3>Events ({managedEvents.length})</h3>
          <button className="btn btn-primary" onClick={handleCreateEvent}>
            + Neues Event
          </button>
        </div>

        {managedEvents.length === 0 ? (
          <div className="empty-state-box">
            <p>Keine Events in Ihrem Verwaltungsbereich.</p>
            <button className="btn btn-primary" onClick={handleCreateEvent}>
              Erstes Event erstellen
            </button>
          </div>
        ) : (
          <div className="event-management-list">
            {managedEvents.map(event => {
              const scopeOrg = getOrgUnitById(event.scopeOrgId);
              const registrationCount = getEventRegistrations(event.id).length;
              const hasGroups = eventHasGroups(event.id);

              return (
                <div key={event.id} className="event-management-card">
                  <div className="event-card-header">
                    <div className="event-card-title">
                      <h4>{event.name}</h4>
                      <div className="event-card-badges">
                        {scopeOrg && (
                          <span className="scope-tag">
                            {scopeOrg.name}
                          </span>
                        )}
                        {!event.isPublished && (
                          <span className="draft-badge">Entwurf</span>
                        )}
                        {hasGroups && (
                          <span className="groups-badge">Mit Gruppen</span>
                        )}
                      </div>
                    </div>
                    <Link to={`/events/${event.id}`} className="view-link">
                      Ansehen →
                    </Link>
                  </div>

                  <div className="event-card-details">
                    <div className="detail-item">
                      <span className="detail-label">Datum:</span>
                      <span className="detail-value">
                        {formatDate(event.startDate)}
                        {formatDate(event.startDate) !== formatDate(event.endDate) &&
                          ` – ${formatDate(event.endDate)}`}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Ort:</span>
                      <span className="detail-value">{event.location}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Anmeldungen:</span>
                      <span className="detail-value">{registrationCount}</span>
                    </div>
                  </div>

                  <div className="event-card-actions">
                    <button
                      className="action-btn edit"
                      onClick={() => handleEditEvent(event)}
                    >
                      Bearbeiten
                    </button>
                    <button
                      className="action-btn groups"
                      onClick={() => handleManageGroups(event.id)}
                    >
                      Gruppen
                    </button>
                    <button
                      className="action-btn roles"
                      onClick={() => handleManageRoles(event.id)}
                    >
                      Rollen
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => setDeleteConfirm(event)}
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {deleteConfirm && (
          <div className="dialog-overlay" onClick={() => setDeleteConfirm(null)}>
            <div className="dialog" onClick={e => e.stopPropagation()}>
              <h3>Event löschen?</h3>
              <p>
                Möchten Sie das Event "{deleteConfirm.name}" wirklich löschen?
                Alle Anmeldungen werden storniert.
              </p>
              <div className="dialog-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setDeleteConfirm(null)}
                >
                  Abbrechen
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDeleteEvent(deleteConfirm.id)}
                >
                  Löschen
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default OrganizerArea;
