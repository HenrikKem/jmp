import { useState } from 'react';
import { useEvents } from '../../context/EventContext';
import './GroupManager.css';

/**
 * GroupManager Component
 *
 * Modal for managing groups within an event.
 * - Add new groups with name, capacity, optional start time
 * - Edit existing groups
 * - Delete groups (only if no registrations)
 * - Shows current registration count for each group
 */
function GroupManager({ eventId, onClose }) {
  const {
    getEventByIdForManagement,
    getEventGroupsWithCapacity,
    createGroup,
    updateGroup,
    deleteGroup,
  } = useEvents();

  const [editingGroup, setEditingGroup] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    capacity: 10,
    startTime: '',
  });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const event = getEventByIdForManagement(eventId);
  const groupsWithCapacity = getEventGroupsWithCapacity(eventId);

  if (!event) {
    return null;
  }

  const handleAddGroup = () => {
    setEditingGroup(null);
    setFormData({
      name: '',
      capacity: 10,
      startTime: '',
    });
    setShowForm(true);
    setError(null);
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      capacity: group.capacity,
      startTime: group.startTime
        ? new Date(group.startTime).toTimeString().slice(0, 5)
        : '',
    });
    setShowForm(true);
    setError(null);
  };

  const handleDeleteGroup = async (groupId) => {
    try {
      await deleteGroup(groupId);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'capacity' ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Name ist erforderlich');
      return;
    }

    if (formData.capacity < 1) {
      setError('Kapazität muss mindestens 1 sein');
      return;
    }

    setIsSubmitting(true);

    try {
      const groupData = {
        name: formData.name.trim(),
        capacity: formData.capacity,
        startTime: formData.startTime
          ? `${event.startDate.split('T')[0]}T${formData.startTime}:00`
          : null,
      };

      if (editingGroup) {
        await updateGroup(editingGroup.id, groupData);
      } else {
        await createGroup(eventId, groupData);
      }

      setShowForm(false);
      setEditingGroup(null);
      setFormData({ name: '', capacity: 10, startTime: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingGroup(null);
    setError(null);
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="group-manager-dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>Gruppen verwalten</h3>
          <span className="event-name">{event.name}</span>
        </div>

        {error && (
          <div className="error-message">{error}</div>
        )}

        {showForm ? (
          <form className="group-form" onSubmit={handleFormSubmit}>
            <h4>{editingGroup ? 'Gruppe bearbeiten' : 'Neue Gruppe'}</h4>

            <div className="form-group">
              <label htmlFor="group-name">Name *</label>
              <input
                type="text"
                id="group-name"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                placeholder="z.B. Vormittag, Gruppe A"
              />
            </div>

            <div className="form-group">
              <label htmlFor="group-capacity">Kapazität *</label>
              <input
                type="number"
                id="group-capacity"
                name="capacity"
                value={formData.capacity}
                onChange={handleFormChange}
                min="1"
              />
              {editingGroup && editingGroup.currentCount > 0 && (
                <span className="field-hint">
                  Aktuell {editingGroup.currentCount} Anmeldungen
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="group-startTime">Startzeit (optional)</label>
              <input
                type="time"
                id="group-startTime"
                name="startTime"
                value={formData.startTime}
                onChange={handleFormChange}
              />
              <span className="field-hint">
                Abweichende Startzeit für diese Gruppe
              </span>
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
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Wird gespeichert...' : (editingGroup ? 'Speichern' : 'Hinzufügen')}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="groups-content">
              {groupsWithCapacity.length === 0 ? (
                <div className="no-groups">
                  <p>Dieses Event hat noch keine Gruppen.</p>
                  <p className="hint">
                    Ohne Gruppen können sich Teilnehmer direkt für das Event anmelden.
                    Mit Gruppen können Sie Kapazitäten und optionale Startzeiten definieren.
                  </p>
                </div>
              ) : (
                <div className="groups-list">
                  {groupsWithCapacity.map(group => (
                    <div key={group.id} className="group-item">
                      <div className="group-info">
                        <span className="group-name">{group.name}</span>
                        {group.startTime && (
                          <span className="group-time">
                            {new Date(group.startTime).toLocaleTimeString('de-DE', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })} Uhr
                          </span>
                        )}
                      </div>

                      <div className="group-capacity-info">
                        <div className="capacity-bar-small">
                          <div
                            className={`capacity-fill ${group.isFull ? 'full' : ''}`}
                            style={{ width: `${(group.currentCount / group.capacity) * 100}%` }}
                          />
                        </div>
                        <span className="capacity-text">
                          {group.currentCount} / {group.capacity}
                        </span>
                      </div>

                      <div className="group-actions">
                        <button
                          className="action-btn edit"
                          onClick={() => handleEditGroup(group)}
                        >
                          Bearbeiten
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => handleDeleteGroup(group.id)}
                          disabled={group.currentCount > 0}
                          title={group.currentCount > 0 ? 'Gruppe hat noch Anmeldungen' : ''}
                        >
                          Löschen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="dialog-footer">
              <button className="btn btn-secondary" onClick={onClose}>
                Schließen
              </button>
              <button className="btn btn-primary" onClick={handleAddGroup}>
                + Gruppe hinzufügen
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default GroupManager;
