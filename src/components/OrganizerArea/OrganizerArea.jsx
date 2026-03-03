import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEvents } from '../../context/EventContext';
import { orgUnits, orgUnitLevels } from '../../data/mockData';
import EventForm from './EventForm';
import GroupManager from './GroupManager';
import RoleManager from './RoleManager';
import HintButton from '../HintButton/HintButton';
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

// Initial mock members for demonstration
const initialMockMembers = [
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

  // Member management state
  const [members, setMembers] = useState(initialMockMembers);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [removeMemberConfirm, setRemoveMemberConfirm] = useState(null);
  const [newMemberForm, setNewMemberForm] = useState({ name: '', email: '', orgUnitId: '' });
  const [memberError, setMemberError] = useState(null);

  const managedScope = getManagedScope();
  const managedOrgUnitIds = managedScope.map(u => u.id);

  // Get events for management
  const managedEvents = getEventsForManagement(managedOrgUnitIds);

  // Get members within scope
  const membersInScope = members.filter(member =>
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

  // Member management handlers
  const handleAddMember = () => {
    setNewMemberForm({ name: '', email: '', orgUnitId: managedScope[0]?.id || '' });
    setMemberError(null);
    setShowAddMemberDialog(true);
  };

  const handleNewMemberChange = (e) => {
    const { name, value } = e.target;
    setNewMemberForm(prev => ({ ...prev, [name]: value }));
    setMemberError(null);
  };

  const handleSaveNewMember = () => {
    // Validate
    if (!newMemberForm.name.trim()) {
      setMemberError('Name ist erforderlich');
      return;
    }
    if (!newMemberForm.email.trim()) {
      setMemberError('E-Mail ist erforderlich');
      return;
    }
    if (!newMemberForm.orgUnitId) {
      setMemberError('Organisationseinheit ist erforderlich');
      return;
    }

    // Check if email already exists
    const existingMember = members.find(m => m.email.toLowerCase() === newMemberForm.email.toLowerCase());
    if (existingMember) {
      // Add to existing member's orgUnits
      if (existingMember.orgUnitIds.includes(newMemberForm.orgUnitId)) {
        setMemberError('Mitglied ist bereits in dieser Organisationseinheit');
        return;
      }
      setMembers(prev => prev.map(m =>
        m.id === existingMember.id
          ? { ...m, orgUnitIds: [...m.orgUnitIds, newMemberForm.orgUnitId] }
          : m
      ));
    } else {
      // Create new member
      const newMember = {
        id: `user-${Date.now()}`,
        name: newMemberForm.name.trim(),
        email: newMemberForm.email.trim(),
        orgUnitIds: [newMemberForm.orgUnitId],
      };
      setMembers(prev => [...prev, newMember]);
    }

    setShowAddMemberDialog(false);
    setNewMemberForm({ name: '', email: '', orgUnitId: '' });
  };

  const handleRemoveMemberFromOrg = (memberId, orgUnitId) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    // If member only belongs to this org, remove them entirely
    if (member.orgUnitIds.length === 1) {
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } else {
      // Remove just this org from member
      setMembers(prev => prev.map(m =>
        m.id === memberId
          ? { ...m, orgUnitIds: m.orgUnitIds.filter(id => id !== orgUnitId) }
          : m
      ));
    }
    setRemoveMemberConfirm(null);
  };

  return (
    <div className="organizer-area">
      <div className="organizer-header">
        <h2>Organizer-Bereich</h2>
        <HintButton title="Scope-Information">
          {isAdmin ? (
            <p style={{ color: '#e74c3c' }}>
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
          <div className="hint-scope-rules">
            <strong>Scope-Regeln:</strong>
            <ul>
              <li><strong>Hierarchie:</strong> Ihr Scope umfasst Ihre zugewiesene(n) Organisationseinheit(en) und alle darunterliegenden Einheiten.</li>
              <li><strong>Mehrfach-Scope:</strong> Sie können Organisator für mehrere Einheiten sein.</li>
              <li><strong>Event-Verwaltung:</strong> Sie können Events erstellen, deren Geltungsbereich in Ihrem Scope liegt.</li>
              <li><strong>Sichtbarkeit:</strong> Events und Mitglieder außerhalb Ihres Scopes werden nicht angezeigt.</li>
            </ul>
          </div>
        </HintButton>
      </div>

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
            <div className="header-actions">
              <button className="btn btn-primary" onClick={handleAddMember}>
                + Mitglied hinzufügen
              </button>
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
                            <span key={orgId} className={`org-tag-with-remove level-${unit.level}`}>
                              {unit.name}
                              <button
                                className="remove-org-btn"
                                onClick={() => setRemoveMemberConfirm({ member, orgUnitId: orgId, orgName: unit.name })}
                                title="Aus dieser Einheit entfernen"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                    </td>
                    <td className="member-actions">
                      <button className="action-btn view">Anzeigen</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Add Member Dialog */}
          {showAddMemberDialog && (
            <div className="dialog-overlay" onClick={() => setShowAddMemberDialog(false)}>
              <div className="dialog" onClick={e => e.stopPropagation()}>
                <h3>Mitglied hinzufügen</h3>

                {memberError && (
                  <div className="dialog-error">{memberError}</div>
                )}

                <div className="dialog-form">
                  <div className="form-group">
                    <label htmlFor="member-name">Name *</label>
                    <input
                      type="text"
                      id="member-name"
                      name="name"
                      value={newMemberForm.name}
                      onChange={handleNewMemberChange}
                      placeholder="z.B. Hans Meyer"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="member-email">E-Mail *</label>
                    <input
                      type="email"
                      id="member-email"
                      name="email"
                      value={newMemberForm.email}
                      onChange={handleNewMemberChange}
                      placeholder="z.B. hans.meyer@example.com"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="member-org">Organisationseinheit *</label>
                    <select
                      id="member-org"
                      name="orgUnitId"
                      value={newMemberForm.orgUnitId}
                      onChange={handleNewMemberChange}
                    >
                      <option value="">-- Bitte wählen --</option>
                      {managedScope.map(unit => (
                        <option key={unit.id} value={unit.id}>
                          {orgUnitLevels[unit.level]?.name}: {unit.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="dialog-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowAddMemberDialog(false)}
                  >
                    Abbrechen
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveNewMember}
                  >
                    Hinzufügen
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Remove Member Confirmation */}
          {removeMemberConfirm && (
            <div className="dialog-overlay" onClick={() => setRemoveMemberConfirm(null)}>
              <div className="dialog" onClick={e => e.stopPropagation()}>
                <h3>Mitglied entfernen?</h3>
                <p>
                  Möchten Sie <strong>{removeMemberConfirm.member.name}</strong> aus{' '}
                  <strong>{removeMemberConfirm.orgName}</strong> entfernen?
                </p>
                {removeMemberConfirm.member.orgUnitIds.length === 1 && (
                  <p className="warning-text">
                    Hinweis: Dies ist die einzige Organisationseinheit des Mitglieds.
                    Das Mitglied wird vollständig entfernt.
                  </p>
                )}
                <div className="dialog-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setRemoveMemberConfirm(null)}
                  >
                    Abbrechen
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleRemoveMemberFromOrg(
                      removeMemberConfirm.member.id,
                      removeMemberConfirm.orgUnitId
                    )}
                  >
                    Entfernen
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

    </div>
  );
}

export default OrganizerArea;
