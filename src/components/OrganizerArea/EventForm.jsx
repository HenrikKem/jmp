import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { orgUnitLevels } from '../../data/mockData';
import './EventForm.css';

/**
 * EventForm Component
 *
 * Form for creating and editing events.
 * - Scope validation: Only allows scopes within organizer's managed units
 * - Validates required fields and date logic
 */
function EventForm({ event, onSave, onCancel }) {
  const { getManagedScope, isAdmin } = useAuth();
  const managedUnits = getManagedScope();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    scopeOrgId: '',
    isPublished: false,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with event data if editing
  useEffect(() => {
    if (event) {
      const startDateTime = new Date(event.startDate);
      const endDateTime = new Date(event.endDate);

      setFormData({
        name: event.name || '',
        description: event.description || '',
        location: event.location || '',
        startDate: startDateTime.toISOString().split('T')[0],
        startTime: startDateTime.toTimeString().slice(0, 5),
        endDate: endDateTime.toISOString().split('T')[0],
        endTime: endDateTime.toTimeString().slice(0, 5),
        scopeOrgId: event.scopeOrgId || '',
        isPublished: event.isPublished || false,
      });
    }
  }, [event]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error when field is modified
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name ist erforderlich';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Ort ist erforderlich';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Startdatum ist erforderlich';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Startzeit ist erforderlich';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'Enddatum ist erforderlich';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'Endzeit ist erforderlich';
    }

    if (!formData.scopeOrgId) {
      newErrors.scopeOrgId = 'Geltungsbereich ist erforderlich';
    }

    // Validate end date/time is after start
    if (formData.startDate && formData.startTime && formData.endDate && formData.endTime) {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

      if (endDateTime <= startDateTime) {
        newErrors.endDate = 'Ende muss nach dem Start liegen';
      }
    }

    // Validate scope is within managed units (unless admin)
    if (formData.scopeOrgId && !isAdmin) {
      const isValidScope = managedUnits.some(u => u.id === formData.scopeOrgId);
      if (!isValidScope) {
        newErrors.scopeOrgId = 'Sie können nur Events in Ihrem Verwaltungsbereich erstellen';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const eventData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        location: formData.location.trim(),
        startDate: `${formData.startDate}T${formData.startTime}:00`,
        endDate: `${formData.endDate}T${formData.endTime}:00`,
        scopeOrgId: formData.scopeOrgId,
        isPublished: formData.isPublished,
      };

      if (event) {
        eventData.id = event.id;
      }

      await onSave(eventData);
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sort managed units by level for better UX
  const sortedManagedUnits = [...managedUnits].sort((a, b) => {
    const orderA = orgUnitLevels[a.level]?.order ?? 99;
    const orderB = orgUnitLevels[b.level]?.order ?? 99;
    return orderA - orderB;
  });

  return (
    <form className="event-form" onSubmit={handleSubmit}>
      <h3>{event ? 'Event bearbeiten' : 'Neues Event erstellen'}</h3>

      {errors.submit && (
        <div className="form-error-banner">{errors.submit}</div>
      )}

      <div className="form-group">
        <label htmlFor="name">Name *</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={errors.name ? 'error' : ''}
          placeholder="z.B. Übungsschießen Frühjahr"
        />
        {errors.name && <span className="field-error">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="description">Beschreibung</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          placeholder="Beschreibung des Events..."
        />
      </div>

      <div className="form-group">
        <label htmlFor="location">Ort *</label>
        <input
          type="text"
          id="location"
          name="location"
          value={formData.location}
          onChange={handleChange}
          className={errors.location ? 'error' : ''}
          placeholder="z.B. Schießstand Münster-Handorf"
        />
        {errors.location && <span className="field-error">{errors.location}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="startDate">Startdatum *</label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            className={errors.startDate ? 'error' : ''}
          />
          {errors.startDate && <span className="field-error">{errors.startDate}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="startTime">Startzeit *</label>
          <input
            type="time"
            id="startTime"
            name="startTime"
            value={formData.startTime}
            onChange={handleChange}
            className={errors.startTime ? 'error' : ''}
          />
          {errors.startTime && <span className="field-error">{errors.startTime}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="endDate">Enddatum *</label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            className={errors.endDate ? 'error' : ''}
          />
          {errors.endDate && <span className="field-error">{errors.endDate}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="endTime">Endzeit *</label>
          <input
            type="time"
            id="endTime"
            name="endTime"
            value={formData.endTime}
            onChange={handleChange}
            className={errors.endTime ? 'error' : ''}
          />
          {errors.endTime && <span className="field-error">{errors.endTime}</span>}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="scopeOrgId">Geltungsbereich *</label>
        <select
          id="scopeOrgId"
          name="scopeOrgId"
          value={formData.scopeOrgId}
          onChange={handleChange}
          className={errors.scopeOrgId ? 'error' : ''}
        >
          <option value="">-- Bitte wählen --</option>
          {sortedManagedUnits.map(unit => (
            <option key={unit.id} value={unit.id}>
              {orgUnitLevels[unit.level]?.name}: {unit.name}
            </option>
          ))}
        </select>
        {errors.scopeOrgId && <span className="field-error">{errors.scopeOrgId}</span>}
        <span className="field-hint">
          Das Event ist für alle Mitglieder dieser Einheit und deren Untereinheiten sichtbar.
        </span>
      </div>

      <div className="form-group checkbox-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="isPublished"
            checked={formData.isPublished}
            onChange={handleChange}
          />
          <span>Event veröffentlichen</span>
        </label>
        <span className="field-hint">
          Unveröffentlichte Events sind nur für Admins sichtbar.
        </span>
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Abbrechen
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Wird gespeichert...' : (event ? 'Speichern' : 'Erstellen')}
        </button>
      </div>
    </form>
  );
}

export default EventForm;
