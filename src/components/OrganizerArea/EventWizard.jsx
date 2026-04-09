import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { orgUnitLevels } from '../../data/mockData';
import './EventWizard.css';

const STEPS = [
  { id: 1, label: 'Grunddaten' },
  { id: 2, label: 'Gruppen' },
  { id: 3, label: 'Rollen' },
  { id: 4, label: 'Vorschau' },
];

const EVENT_ROLES = [
  'Eventleiter',
  'Sicherheitsbeauftragter',
  'Helfer',
  'Schriftführer',
  'Kassierer',
];

function EventWizard({ onSave, onCancel }) {
  const { getManagedScope, isAdmin } = useAuth();
  const managedUnits = getManagedScope();

  const [step, setStep] = useState(1);

  // Step 1 — Grunddaten
  const [grunddaten, setGrunddaten] = useState({
    name: '',
    description: '',
    location: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    scopeOrgId: '',
  });
  const [step1Errors, setStep1Errors] = useState({});

  // Step 2 — Gruppen
  const [hasGroups, setHasGroups] = useState(false);
  const [groups, setGroups] = useState([]);

  // Step 3 — Rollen
  const [roles, setRoles] = useState([]);

  // Step 4 preview submit state
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sortedManagedUnits = [...managedUnits].sort((a, b) => {
    const orderA = orgUnitLevels[a.level]?.order ?? 99;
    const orderB = orgUnitLevels[b.level]?.order ?? 99;
    return orderA - orderB;
  });

  const getOrgUnitName = (id) => {
    const u = managedUnits.find(u => u.id === id);
    return u ? `${orgUnitLevels[u.level]?.name}: ${u.name}` : id;
  };

  // ── Step 1 validation ──
  const validateStep1 = () => {
    const errors = {};
    if (!grunddaten.name.trim()) errors.name = 'Name ist erforderlich';
    if (!grunddaten.location.trim()) errors.location = 'Ort ist erforderlich';
    if (!grunddaten.startDate) errors.startDate = 'Startdatum ist erforderlich';
    if (!grunddaten.startTime) errors.startTime = 'Startzeit ist erforderlich';
    if (!grunddaten.endDate) errors.endDate = 'Enddatum ist erforderlich';
    if (!grunddaten.endTime) errors.endTime = 'Endzeit ist erforderlich';
    if (!grunddaten.scopeOrgId) errors.scopeOrgId = 'Geltungsbereich ist erforderlich';

    if (grunddaten.startDate && grunddaten.startTime && grunddaten.endDate && grunddaten.endTime) {
      const start = new Date(`${grunddaten.startDate}T${grunddaten.startTime}`);
      const end = new Date(`${grunddaten.endDate}T${grunddaten.endTime}`);
      if (end <= start) errors.endDate = 'Ende muss nach dem Start liegen';
    }

    if (grunddaten.scopeOrgId && !isAdmin) {
      if (!managedUnits.some(u => u.id === grunddaten.scopeOrgId)) {
        errors.scopeOrgId = 'Sie können nur Events in Ihrem Verwaltungsbereich erstellen';
      }
    }

    setStep1Errors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Group management ──
  const addGroup = () => {
    setGroups(prev => [...prev, { id: Date.now(), name: '', capacity: '', startTime: '' }]);
  };

  const updateGroup = (id, field, value) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const removeGroup = (id) => {
    setGroups(prev => prev.filter(g => g.id !== id));
  };

  // ── Role management ──
  const addRole = () => {
    setRoles(prev => [...prev, { id: Date.now(), role: EVENT_ROLES[0], member: '' }]);
  };

  const updateRole = (id, field, value) => {
    setRoles(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeRole = (id) => {
    setRoles(prev => prev.filter(r => r.id !== id));
  };

  // ── Navigation ──
  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    setStep(s => Math.min(s + 1, 4));
  };

  const handleBack = () => {
    setStep(s => Math.max(s - 1, 1));
  };

  // ── Save ──
  const handleSave = async (publish) => {
    setIsSubmitting(true);
    try {
      const eventData = {
        name: grunddaten.name.trim(),
        description: grunddaten.description.trim(),
        location: grunddaten.location.trim(),
        startDate: `${grunddaten.startDate}T${grunddaten.startTime}:00`,
        endDate: `${grunddaten.endDate}T${grunddaten.endTime}:00`,
        scopeOrgId: grunddaten.scopeOrgId,
        isPublished: publish,
        // Include groups if enabled, mapping startTime correctly
        groups: hasGroups
          ? groups
              .filter(g => g.name.trim())
              .map(({ name, capacity, startTime }) => ({
                name: name.trim(),
                capacity: capacity ? Number(capacity) : null,
                startTime: startTime || null,
              }))
          : [],
        // Include roles that have both a role name and a member assigned
        roles: roles
          .filter(r => r.role)
          .map(({ role, member }) => ({
            role,
            description: member || null,
          })),
      };
      await onSave(eventData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date, time) => {
    if (!date) return '—';
    const d = new Date(`${date}T${time || '00:00'}`);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      (time ? ` ${time}` : '');
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal modal-lg event-wizard" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <h2>Neues Event erstellen</h2>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>

        {/* Step Progress */}
        <div className="wizard-steps">
          {STEPS.map((s, idx) => (
            <div
              key={s.id}
              className={`wizard-step ${step === s.id ? 'active' : ''} ${step > s.id ? 'done' : ''}`}
            >
              <div className="wizard-step-dot">
                {step > s.id ? '✓' : s.id}
              </div>
              <span className="wizard-step-label">{s.label}</span>
              {idx < STEPS.length - 1 && <div className="wizard-step-line" />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="modal-body wizard-body">

          {/* ── Step 1: Grunddaten ── */}
          {step === 1 && (
            <div className="wizard-step-content">
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input
                  className={`form-input ${step1Errors.name ? 'error' : ''}`}
                  type="text"
                  value={grunddaten.name}
                  onChange={e => setGrunddaten(p => ({ ...p, name: e.target.value }))}
                  placeholder="z.B. Übungsschießen Frühjahr"
                />
                {step1Errors.name && <span className="field-error">{step1Errors.name}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Beschreibung</label>
                <textarea
                  className="form-textarea"
                  value={grunddaten.description}
                  onChange={e => setGrunddaten(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                  placeholder="Beschreibung des Events..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Veranstaltungsort *</label>
                <input
                  className={`form-input ${step1Errors.location ? 'error' : ''}`}
                  type="text"
                  value={grunddaten.location}
                  onChange={e => setGrunddaten(p => ({ ...p, location: e.target.value }))}
                  placeholder="z.B. Schießstand Münster-Handorf"
                />
                {step1Errors.location && <span className="field-error">{step1Errors.location}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Startdatum *</label>
                  <input
                    className={`form-input ${step1Errors.startDate ? 'error' : ''}`}
                    type="date"
                    value={grunddaten.startDate}
                    onChange={e => setGrunddaten(p => ({ ...p, startDate: e.target.value }))}
                  />
                  {step1Errors.startDate && <span className="field-error">{step1Errors.startDate}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Startzeit *</label>
                  <input
                    className={`form-input ${step1Errors.startTime ? 'error' : ''}`}
                    type="time"
                    value={grunddaten.startTime}
                    onChange={e => setGrunddaten(p => ({ ...p, startTime: e.target.value }))}
                  />
                  {step1Errors.startTime && <span className="field-error">{step1Errors.startTime}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Enddatum *</label>
                  <input
                    className={`form-input ${step1Errors.endDate ? 'error' : ''}`}
                    type="date"
                    value={grunddaten.endDate}
                    onChange={e => setGrunddaten(p => ({ ...p, endDate: e.target.value }))}
                  />
                  {step1Errors.endDate && <span className="field-error">{step1Errors.endDate}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Endzeit *</label>
                  <input
                    className={`form-input ${step1Errors.endTime ? 'error' : ''}`}
                    type="time"
                    value={grunddaten.endTime}
                    onChange={e => setGrunddaten(p => ({ ...p, endTime: e.target.value }))}
                  />
                  {step1Errors.endTime && <span className="field-error">{step1Errors.endTime}</span>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Geltungsbereich *</label>
                <select
                  className={`form-select ${step1Errors.scopeOrgId ? 'error' : ''}`}
                  value={grunddaten.scopeOrgId}
                  onChange={e => setGrunddaten(p => ({ ...p, scopeOrgId: e.target.value }))}
                >
                  <option value="">-- Bitte wählen --</option>
                  {sortedManagedUnits.map(unit => (
                    <option key={unit.id} value={unit.id}>
                      {orgUnitLevels[unit.level]?.name}: {unit.name}
                    </option>
                  ))}
                </select>
                {step1Errors.scopeOrgId && <span className="field-error">{step1Errors.scopeOrgId}</span>}
                <span className="form-hint">Das Event ist für alle Mitglieder dieser Einheit und deren Untereinheiten sichtbar.</span>
              </div>
            </div>
          )}

          {/* ── Step 2: Gruppen ── */}
          {step === 2 && (
            <div className="wizard-step-content">
              <div className="wizard-toggle-row">
                <label className="wizard-toggle-label">
                  <input
                    type="checkbox"
                    checked={hasGroups}
                    onChange={e => {
                      setHasGroups(e.target.checked);
                      if (!e.target.checked) setGroups([]);
                    }}
                  />
                  Veranstaltung hat Gruppen
                </label>
                <p className="wizard-hint-text">
                  Gruppen ermöglichen eine bessere Aufteilung der Teilnehmer (z.B. Gruppen A/B, Schießstände).
                </p>
              </div>

              {hasGroups && (
                <div className="wizard-groups">
                  {groups.length === 0 && (
                    <p className="wizard-empty-hint">Noch keine Gruppen hinzugefügt.</p>
                  )}
                  {groups.map(group => (
                    <div key={group.id} className="wizard-group-row">
                      <div className="wizard-group-fields">
                        <div className="form-group">
                          <label className="form-label">Gruppenname</label>
                          <input
                            className="form-input"
                            type="text"
                            value={group.name}
                            onChange={e => updateGroup(group.id, 'name', e.target.value)}
                            placeholder="z.B. Gruppe A"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Kapazität</label>
                          <input
                            className="form-input"
                            type="number"
                            min="1"
                            value={group.capacity}
                            onChange={e => updateGroup(group.id, 'capacity', e.target.value)}
                            placeholder="z.B. 20"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Uhrzeit (optional)</label>
                          <input
                            className="form-input"
                            type="time"
                            value={group.startTime}
                            onChange={e => updateGroup(group.id, 'startTime', e.target.value)}
                          />
                        </div>
                      </div>
                      <button
                        className="wizard-remove-btn"
                        onClick={() => removeGroup(group.id)}
                        title="Gruppe entfernen"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button className="btn btn-secondary btn-sm" onClick={addGroup}>
                    + Gruppe hinzufügen
                  </button>
                </div>
              )}

              {!hasGroups && (
                <div className="wizard-skip-hint">
                  <p>Dieses Event hat keine Gruppen. Alle Teilnehmer werden gemeinsam erfasst.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Rollen ── */}
          {step === 3 && (
            <div className="wizard-step-content">
              <p className="wizard-hint-text">
                Weisen Sie optional Rollen für dieses Event zu. Rollen können auch später vergeben werden.
              </p>

              {roles.length === 0 && (
                <p className="wizard-empty-hint">Noch keine Rollen zugewiesen.</p>
              )}

              {roles.map(r => (
                <div key={r.id} className="wizard-role-row">
                  <div className="wizard-role-fields">
                    <div className="form-group">
                      <label className="form-label">Rolle</label>
                      <select
                        className="form-select"
                        value={r.role}
                        onChange={e => updateRole(r.id, 'role', e.target.value)}
                      >
                        {EVENT_ROLES.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mitglied (Name oder E-Mail)</label>
                      <input
                        className="form-input"
                        type="text"
                        value={r.member}
                        onChange={e => updateRole(r.id, 'member', e.target.value)}
                        placeholder="z.B. Max Mustermann"
                      />
                    </div>
                  </div>
                  <button
                    className="wizard-remove-btn"
                    onClick={() => removeRole(r.id)}
                    title="Rolle entfernen"
                  >
                    ✕
                  </button>
                </div>
              ))}

              <button className="btn btn-secondary btn-sm" onClick={addRole}>
                + Rolle hinzufügen
              </button>
            </div>
          )}

          {/* ── Step 4: Vorschau ── */}
          {step === 4 && (
            <div className="wizard-step-content">
              <div className="wizard-preview">
                <div className="preview-section">
                  <div className="preview-section-title">Grunddaten</div>
                  <div className="preview-grid">
                    <div className="preview-field">
                      <label>Name</label>
                      <span>{grunddaten.name || '—'}</span>
                    </div>
                    <div className="preview-field">
                      <label>Ort</label>
                      <span>{grunddaten.location || '—'}</span>
                    </div>
                    <div className="preview-field">
                      <label>Start</label>
                      <span>{formatDate(grunddaten.startDate, grunddaten.startTime)}</span>
                    </div>
                    <div className="preview-field">
                      <label>Ende</label>
                      <span>{formatDate(grunddaten.endDate, grunddaten.endTime)}</span>
                    </div>
                    <div className="preview-field preview-field--full">
                      <label>Geltungsbereich</label>
                      <span>{grunddaten.scopeOrgId ? getOrgUnitName(grunddaten.scopeOrgId) : '—'}</span>
                    </div>
                    {grunddaten.description && (
                      <div className="preview-field preview-field--full">
                        <label>Beschreibung</label>
                        <span>{grunddaten.description}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="preview-section">
                  <div className="preview-section-title">Gruppen</div>
                  {!hasGroups || groups.length === 0 ? (
                    <span className="preview-empty">Keine Gruppen</span>
                  ) : (
                    <div className="preview-tags">
                      {groups.map(g => (
                        <span key={g.id} className="preview-tag">
                          {g.name || 'Unbenannte Gruppe'}
                          {g.capacity ? ` (${g.capacity} Pl.)` : ''}
                          {g.startTime ? ` · ${g.startTime}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="preview-section">
                  <div className="preview-section-title">Rollen</div>
                  {roles.length === 0 ? (
                    <span className="preview-empty">Keine Rollen zugewiesen</span>
                  ) : (
                    <div className="preview-roles">
                      {roles.map(r => (
                        <div key={r.id} className="preview-role-item">
                          <span className="preview-role-name">{r.role}</span>
                          <span className="preview-role-member">{r.member || '—'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer wizard-footer">
          <div className="wizard-footer-left">
            {step > 1 && (
              <button className="btn btn-secondary" onClick={handleBack} disabled={isSubmitting}>
                ← Zurück
              </button>
            )}
          </div>
          <div className="wizard-footer-right">
            <button className="btn btn-secondary" onClick={onCancel} disabled={isSubmitting}>
              Abbrechen
            </button>
            {step < 4 ? (
              <button className="btn btn-primary" onClick={handleNext}>
                Weiter →
              </button>
            ) : (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleSave(false)}
                  disabled={isSubmitting}
                >
                  Als Entwurf speichern
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleSave(true)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Wird erstellt...' : 'Veranstaltung erstellen'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventWizard;
