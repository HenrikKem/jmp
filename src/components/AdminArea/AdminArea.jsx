import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { orgUnitLevels } from '../../data/mockData';
import HintButton from '../HintButton/HintButton';
import './AdminArea.css';

/**
 * AdminArea Component
 *
 * Global administration area for admins.
 * Provides access to all users and organizational units without scope restrictions.
 */

const initialUsers = [
  { id: 'user-1', email: 'max.mustermann@example.com', name: 'Max Mustermann', isAdmin: false, roles: ['member', 'organizer'] },
  { id: 'user-2', email: 'anna.schmidt@example.com', name: 'Anna Schmidt', isAdmin: false, roles: ['member'] },
  { id: 'user-3', email: 'peter.mueller@example.com', name: 'Peter Müller', isAdmin: false, roles: ['member'] },
  { id: 'user-4', email: 'admin@example.com', name: 'System Admin', isAdmin: true, roles: ['admin'] },
  { id: 'user-5', email: 'lisa.weber@example.com', name: 'Lisa Weber', isAdmin: false, roles: ['member'] },
];

const LEVEL_ORDER = ['federal', 'state', 'region', 'district', 'hegering'];

const PARENT_LEVEL = {
  state: 'federal',
  region: 'state',
  district: 'region',
  hegering: 'district',
};

function AdminArea() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('users');

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="admin-area">
      <div className="admin-header">
        <h2>Admin-Bereich</h2>
        <HintButton title="Rollenverwaltung">
          <div className="hint-admin-role">
            <div className="hint-admin-role-name member">Mitglied</div>
            <p>Basisrolle für alle Benutzer</p>
            <ul>
              <li>Eigenes Profil verwalten</li>
              <li>Berechtigte Events ansehen</li>
              <li>Für Events anmelden/abmelden</li>
              <li>Eigene Anmeldungen verwalten</li>
            </ul>
          </div>
          <div className="hint-admin-role">
            <div className="hint-admin-role-name organizer">Organisator</div>
            <p>Scope-basierte Verwaltungsrolle</p>
            <ul>
              <li>Alle Mitglied-Rechte</li>
              <li>Mitglieder im Scope verwalten</li>
              <li>Events im Scope erstellen/verwalten</li>
              <li>Event-Rollen zuweisen</li>
            </ul>
            <div className="hint-scope-note">
              <strong>Scope:</strong> Zugewiesene OrgUnit(s) + alle Nachfahren
            </div>
          </div>
          <div className="hint-admin-role">
            <div className="hint-admin-role-name admin">Administrator</div>
            <p>Globale Verwaltungsrolle</p>
            <ul>
              <li>Alle Organisator-Rechte</li>
              <li>Keine Scope-Einschränkungen</li>
              <li>Benutzer erstellen/deaktivieren</li>
              <li>Organisationsstruktur verwalten</li>
              <li>Rollen zuweisen</li>
            </ul>
          </div>
        </HintButton>
      </div>

      <div className="admin-warning">
        <span className="warning-icon">⚠️</span>
        <div>
          <strong>Administrator-Modus</strong>
          <p>Sie haben globalen Zugriff ohne Scope-Einschränkungen. Änderungen wirken sich systemweit aus.</p>
        </div>
      </div>

      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Benutzerverwaltung
        </button>
        <button
          className={`tab-btn ${activeTab === 'orgs' ? 'active' : ''}`}
          onClick={() => setActiveTab('orgs')}
        >
          Organisationsstruktur
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'orgs' && <OrgsTab />}
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState(initialUsers);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [error, setError] = useState('');

  function handleOpen() {
    setForm({ name: '', email: '' });
    setError('');
    setShowDialog(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();
    if (!name) { setError('Name ist erforderlich.'); return; }
    if (!email || !email.includes('@')) { setError('Gültige E-Mail-Adresse erforderlich.'); return; }
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      setError('Diese E-Mail-Adresse ist bereits vergeben.');
      return;
    }
    setUsers(prev => [...prev, {
      id: `user-${Date.now()}`,
      name,
      email,
      isAdmin: false,
      roles: ['member'],
    }]);
    setShowDialog(false);
  }

  return (
    <div className="admin-section">
      <div className="section-header">
        <h3>Alle Benutzer</h3>
        <button className="btn btn-primary btn-sm" onClick={handleOpen}>+ Neuer Benutzer</button>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>E-Mail</th>
            <th>Rollen</th>
            <th>Status</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td className="user-name">{user.name}</td>
              <td className="user-email">{user.email}</td>
              <td className="user-roles">
                {user.roles.map(role => (
                  <span key={role} className={`role-tag ${role}`}>
                    {role === 'admin' ? 'Admin' : role === 'organizer' ? 'Organisator' : 'Mitglied'}
                  </span>
                ))}
              </td>
              <td>
                <span className="status-badge active">Aktiv</span>
              </td>
              <td className="actions">
                <button className="action-btn">Bearbeiten</button>
                <button className="action-btn danger">Deaktivieren</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showDialog && (
        <div className="modal-backdrop" onClick={() => setShowDialog(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Neuer Benutzer</h3>
              <button className="close-btn" onClick={() => setShowDialog(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <p className="admin-dialog-hint">
                  Der Benutzer erhält zunächst die Mitglieder-Rolle. Er kann weitere Profildaten selbst ergänzen.
                </p>
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Vor- und Nachname"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">E-Mail *</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="email@example.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDialog(false)}>Abbrechen</button>
                <button type="submit" className="btn btn-primary">Benutzer anlegen</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function OrgsTab() {
  const { orgUnits } = useAuth();
  const [units, setUnits] = useState(orgUnits);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ name: '', level: 'hegering', parentId: '' });
  const [error, setError] = useState('');

  const levelGroups = {};
  units.forEach(unit => {
    if (!levelGroups[unit.level]) levelGroups[unit.level] = [];
    levelGroups[unit.level].push(unit);
  });

  const parentLevel = PARENT_LEVEL[form.level];
  const parentOptions = parentLevel ? (levelGroups[parentLevel] || []) : [];

  function handleLevelChange(level) {
    setForm(f => ({ ...f, level, parentId: '' }));
  }

  function handleOpen() {
    setForm({ name: '', level: 'hegering', parentId: '' });
    setError('');
    setShowDialog(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) { setError('Name ist erforderlich.'); return; }
    if (parentLevel && !form.parentId) { setError('Bitte eine übergeordnete Einheit wählen.'); return; }
    setUnits(prev => [...prev, {
      id: `unit-${Date.now()}`,
      name,
      level: form.level,
      parentId: form.parentId || null,
    }]);
    setShowDialog(false);
  }

  return (
    <div className="admin-section">
      <div className="section-header">
        <h3>Organisationsstruktur</h3>
        <button className="btn btn-primary btn-sm" onClick={handleOpen}>+ Neue Einheit</button>
      </div>

      <div className="org-levels">
        {LEVEL_ORDER.map(level => (
          <div key={level} className="level-section">
            <h4>
              <span className={`level-badge level-${level}`}>
                {orgUnitLevels[level]?.name}
              </span>
              <span className="count">({levelGroups[level]?.length || 0})</span>
            </h4>
            <div className="org-cards">
              {(levelGroups[level] || []).map(unit => (
                <div key={unit.id} className="org-card">
                  <span className="org-name">{unit.name}</span>
                  <button className="edit-icon" title="Bearbeiten">✏️</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showDialog && (
        <div className="modal-backdrop" onClick={() => setShowDialog(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Neue Einheit</h3>
              <button className="close-btn" onClick={() => setShowDialog(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="z.B. Hegering Mustertal"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Ebene *</label>
                  <select
                    className="form-select"
                    value={form.level}
                    onChange={e => handleLevelChange(e.target.value)}
                  >
                    {LEVEL_ORDER.map(l => (
                      <option key={l} value={l}>{orgUnitLevels[l]?.name}</option>
                    ))}
                  </select>
                </div>
                {parentLevel && (
                  <div className="form-group">
                    <label className="form-label">Übergeordnete Einheit *</label>
                    {parentOptions.length === 0 ? (
                      <p className="field-hint">Keine Einheiten auf Ebene „{orgUnitLevels[parentLevel]?.name}" vorhanden.</p>
                    ) : (
                      <select
                        className="form-select"
                        value={form.parentId}
                        onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}
                      >
                        <option value="">Bitte wählen …</option>
                        {parentOptions.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDialog(false)}>Abbrechen</button>
                <button type="submit" className="btn btn-primary">Einheit anlegen</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminArea;
