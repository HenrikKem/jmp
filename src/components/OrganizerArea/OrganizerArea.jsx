import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEvents } from '../../context/EventContext';
import { orgUnits, orgUnitLevels } from '../../data/mockData';
import EventForm from './EventForm';
import GroupManager from './GroupManager';
import RoleManager from './RoleManager';
import './OrganizerArea.css';

/**
 * OrganizerArea Component
 *
 * Scope-based management area for organizers.
 *
 * Scope Rules (B2):
 * - Organizer manages exactly their assigned OrgUnit(s) + all descendants
 * - Multiple organizer scopes per user are supported (Decision D2)
 * - All displayed data is filtered by scope
 */

// Mock members for demonstration
const mockMembers = [
  { id: 'user-1', email: 'max.mustermann@example.com', name: 'Max Mustermann', orgUnitIds: ['hegering-ms-nord', 'hegering-ms-sued'] },
  { id: 'user-2', email: 'anna.schmidt@example.com', name: 'Anna Schmidt', orgUnitIds: ['hegering-ms-nord'] },
  { id: 'user-3', email: 'peter.mueller@example.com', name: 'Peter Müller', orgUnitIds: ['hegering-ms-sued'] },
  { id: 'user-4', email: 'lisa.weber@example.com', name: 'Lisa Weber', orgUnitIds: ['hegering-do-mitte'] },
  { id: 'user-5', email: 'thomas.braun@example.com', name: 'Thomas Braun', orgUnitIds: ['hegering-koeln-ost'] },
  { id: 'user-6', email: 'julia.klein@example.com', name: 'Julia Klein', orgUnitIds: ['district-muenster'] },
];

function OrganizerArea() {
  const { isAdmin, getManagedScope, organizerOrgUnitIds, canManageOrgUnit } = useAuth();
  const {
    getEventsForManagement,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventRegistrations,
    eventHasGroups,
  } = useEvents();

  const [activeTab, setActiveTab] = useState('events');
  const [selectedOrgUnit, setSelectedOrgUnit] = useState('all');
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [managingGroupsEventId, setManagingGroupsEventId] = useState(null);
  const [managingRolesEventId, setManagingRolesEventId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const managedScope = getManagedScope();
  const managedOrgUnitIds = managedScope.map(u => u.id);

  // Get events for management
  const managedEvents = getEventsForManagement(managedOrgUnitIds);

  // Get members within scope
  const membersInScope = mockMembers.filter(member =>
    member.orgUnitIds.some(orgId => managedOrgUnitIds.includes(orgId))
  );

  // Filter by selected OrgUnit
  const filteredMembers = selectedOrgUnit === 'all'
    ? membersInScope
    : membersInScope.filter(member =>
        member.orgUnitIds.includes(selectedOrgUnit)
      );

  const getOrgUnitById = (id) => orgUnits.find(u => u.id === id);

  // Event handlers
  const handleCreateEvent = () => {
    setEditingEvent(null);
    setShowEventForm(true);
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setShowEventForm(true);
  };

  const handleSaveEvent = async (eventData) => {
    if (editingEvent) {
      await updateEvent(editingEvent.id, eventData);
    } else {
      await createEvent(eventData);
    }
    setShowEventForm(false);
    setEditingEvent(null);
  };

  const handleCancelEventForm = () => {
    setShowEventForm(false);
    setEditingEvent(null);
  };

  const handleDeleteEvent = async (eventId) => {
    await deleteEvent(eventId);
    setDeleteConfirm(null);
  };

  const handleManageGroups = (eventId) => {
    setManagingGroupsEventId(eventId);
  };

  const handleManageRoles = (eventId) => {
    setManagingRolesEventId(eventId);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="organizer-area">
      <h2>Organizer-Bereich</h2>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          Events ({managedEvents.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          Mitglieder ({membersInScope.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'scope' ? 'active' : ''}`}
          onClick={() => setActiveTab('scope')}
        >
          Scope-Info
        </button>
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

      {/* Events Tab */}
      {activeTab === 'events' && (
        <section className="event-management">
          {showEventForm ? (
            <EventForm
              event={editingEvent}
              onSave={handleSaveEvent}
              onCancel={handleCancelEventForm}
            />
          ) : (
            <>
              <div className="section-header">
                <h3>Event-Verwaltung</h3>
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
                                <span className={`scope-tag level-${scopeOrg.level}`}>
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
                                ` - ${formatDate(event.endDate)}`}
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
            </>
          )}
        </section>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <section className="member-management">
          <div className="section-header">
            <h3>Mitgliederverwaltung</h3>
            <div className="filter-controls">
              <label htmlFor="org-filter">Filtern nach:</label>
              <select
                id="org-filter"
                value={selectedOrgUnit}
                onChange={(e) => setSelectedOrgUnit(e.target.value)}
              >
                <option value="all">Alle ({membersInScope.length})</option>
                {managedScope.map(unit => {
                  const memberCount = membersInScope.filter(m =>
                    m.orgUnitIds.includes(unit.id)
                  ).length;
                  return (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({memberCount})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <table className="members-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>E-Mail</th>
                <th>Organisationseinheiten</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-state">
                    Keine Mitglieder gefunden.
                  </td>
                </tr>
              ) : (
                filteredMembers.map(member => (
                  <tr key={member.id}>
                    <td className="member-name">{member.name}</td>
                    <td className="member-email">{member.email}</td>
                    <td className="member-orgs">
                      {member.orgUnitIds
                        .filter(orgId => canManageOrgUnit(orgId))
                        .map(orgId => {
                          const unit = getOrgUnitById(orgId);
                          if (!unit) return null;
                          return (
                            <span key={orgId} className={`org-tag level-${unit.level}`}>
                              {unit.name}
                            </span>
                          );
                        })}
                    </td>
                    <td className="member-actions">
                      <button className="action-btn view">Anzeigen</button>
                      <button className="action-btn edit">Bearbeiten</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      )}

      {/* Scope Info Tab */}
      {activeTab === 'scope' && (
        <>
          <section className="scope-info-section">
            <h3>Ihr Verwaltungsbereich</h3>
            <div className="scope-details">
              {isAdmin ? (
                <p className="admin-notice">
                  Als <strong>Administrator</strong> haben Sie Zugriff auf alle Organisationseinheiten.
                </p>
              ) : (
                <>
                  <p>Sie sind Organisator für:</p>
                  <ul className="organizer-units">
                    {organizerOrgUnitIds.map(orgId => {
                      const unit = getOrgUnitById(orgId);
                      if (!unit) return null;
                      return (
                        <li key={orgId}>
                          <span className={`level-badge level-${unit.level}`}>
                            {orgUnitLevels[unit.level]?.name}
                          </span>
                          {unit.name}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>

            <div className="scope-summary">
              <div className="scope-stat">
                <span className="stat-value">{managedScope.length}</span>
                <span className="stat-label">Einheiten im Scope</span>
              </div>
              <div className="scope-stat">
                <span className="stat-value">{membersInScope.length}</span>
                <span className="stat-label">Mitglieder</span>
              </div>
              <div className="scope-stat">
                <span className="stat-value">{managedEvents.length}</span>
                <span className="stat-label">Events</span>
              </div>
            </div>
          </section>

          <section className="scope-rules">
            <h3>Scope-Regeln</h3>
            <div className="rules-content">
              <ul>
                <li>
                  <strong>Hierarchie:</strong> Ihr Scope umfasst Ihre zugewiesene(n)
                  Organisationseinheit(en) und alle darunterliegenden Einheiten.
                </li>
                <li>
                  <strong>Mehrfach-Scope:</strong> Sie können Organisator für mehrere
                  Einheiten sein (z.B. mehrere Hegeringe).
                </li>
                <li>
                  <strong>Event-Verwaltung:</strong> Sie können Events erstellen,
                  deren Geltungsbereich in Ihrem Scope liegt.
                </li>
                <li>
                  <strong>Sichtbarkeit:</strong> Events und Mitglieder außerhalb
                  Ihres Scopes werden nicht angezeigt.
                </li>
              </ul>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default OrganizerArea;
