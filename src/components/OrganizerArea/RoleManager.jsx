import { useState } from 'react';
import { useEvents } from '../../context/EventContext';
import './RoleManager.css';

/**
 * RoleManager Component
 *
 * Modal for managing event-specific roles.
 * - View current role assignments
 * - Assign roles to registered participants
 * - Remove role assignments
 */
function RoleManager({ eventId, onClose }) {
  const {
    getEventByIdForManagement,
    getEventRegistrations,
    getEventRoleTypes,
    getEventRolesWithDetails,
    assignEventRole,
    removeEventRole,
  } = useEvents();

  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRoleTypeId, setSelectedRoleTypeId] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const event = getEventByIdForManagement(eventId);
  const registrations = getEventRegistrations(eventId);
  const roleTypes = getEventRoleTypes();
  const roleAssignments = getEventRolesWithDetails(eventId);

  if (!event) {
    return null;
  }

  // Get unique users from registrations (for role assignment dropdown)
  const registeredUsers = registrations.map(reg => ({
    userId: reg.userId,
    // In a real app, we'd fetch user details. Using placeholder for mock.
    userName: `Benutzer ${reg.userId.replace('user-', '')}`,
  }));

  const handleAssignRole = () => {
    setShowAssignForm(true);
    setSelectedUserId('');
    setSelectedRoleTypeId('');
    setError(null);
  };

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    setError(null);

    if (!selectedUserId) {
      setError('Bitte wählen Sie einen Teilnehmer aus');
      return;
    }

    if (!selectedRoleTypeId) {
      setError('Bitte wählen Sie eine Rolle aus');
      return;
    }

    setIsSubmitting(true);

    try {
      await assignEventRole(eventId, selectedUserId, selectedRoleTypeId);
      setShowAssignForm(false);
      setSelectedUserId('');
      setSelectedRoleTypeId('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveRole = async (roleAssignmentId) => {
    try {
      await removeEventRole(roleAssignmentId);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelForm = () => {
    setShowAssignForm(false);
    setError(null);
  };

  // Group role assignments by role type for display
  const rolesByType = roleTypes.map(roleType => ({
    ...roleType,
    assignments: roleAssignments.filter(ra => ra.roleTypeId === roleType.id),
  }));

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="role-manager-dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>Rollen verwalten</h3>
          <span className="event-name">{event.name}</span>
        </div>

        {error && (
          <div className="error-message">{error}</div>
        )}

        {showAssignForm ? (
          <form className="role-form" onSubmit={handleSubmitAssignment}>
            <h4>Rolle zuweisen</h4>

            <div className="form-group">
              <label htmlFor="role-user">Teilnehmer *</label>
              <select
                id="role-user"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">-- Bitte wählen --</option>
                {registeredUsers.map(u => (
                  <option key={u.userId} value={u.userId}>
                    {u.userName}
                  </option>
                ))}
              </select>
              {registeredUsers.length === 0 && (
                <span className="field-hint warning">
                  Keine Teilnehmer angemeldet. Rollen können nur an angemeldete Teilnehmer vergeben werden.
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="role-type">Rolle *</label>
              <select
                id="role-type"
                value={selectedRoleTypeId}
                onChange={(e) => setSelectedRoleTypeId(e.target.value)}
              >
                <option value="">-- Bitte wählen --</option>
                {roleTypes.map(rt => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name}
                  </option>
                ))}
              </select>
              {selectedRoleTypeId && (
                <span className="field-hint">
                  {roleTypes.find(rt => rt.id === selectedRoleTypeId)?.description}
                </span>
              )}
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancelForm}
                disabled={isSubmitting}
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || registeredUsers.length === 0}
              >
                {isSubmitting ? 'Wird zugewiesen...' : 'Zuweisen'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="roles-content">
              {roleAssignments.length === 0 ? (
                <div className="no-roles">
                  <p>Keine Rollen zugewiesen.</p>
                  <p className="hint">
                    Weisen Sie Teilnehmern Rollen zu, um Verantwortlichkeiten für dieses Event festzulegen.
                  </p>
                </div>
              ) : (
                <div className="roles-by-type">
                  {rolesByType.filter(rt => rt.assignments.length > 0).map(roleType => (
                    <div key={roleType.id} className="role-type-section">
                      <div className="role-type-header">
                        <span className="role-type-name">{roleType.name}</span>
                        <span className="role-type-count">{roleType.assignments.length}</span>
                      </div>
                      <div className="role-assignments">
                        {roleType.assignments.map(assignment => (
                          <div key={assignment.id} className="role-assignment-item">
                            <span className="assigned-user">
                              Benutzer {assignment.userId.replace('user-', '')}
                            </span>
                            <span className="assigned-date">
                              seit {new Date(assignment.assignedAt).toLocaleDateString('de-DE')}
                            </span>
                            <button
                              className="remove-btn"
                              onClick={() => handleRemoveRole(assignment.id)}
                              title="Rolle entfernen"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="available-roles">
                <h4>Verfügbare Rollentypen</h4>
                <div className="role-types-list">
                  {roleTypes.map(rt => (
                    <div key={rt.id} className="role-type-info">
                      <span className="role-name">{rt.name}</span>
                      <span className="role-desc">{rt.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="dialog-footer">
              <button className="btn btn-secondary" onClick={onClose}>
                Schließen
              </button>
              <button className="btn btn-primary" onClick={handleAssignRole}>
                + Rolle zuweisen
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default RoleManager;
