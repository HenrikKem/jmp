import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import HintButton from '../HintButton/HintButton';
import './AdminArea.css';

const ROLE_OPTIONS = [
  { value: 'member', label: 'Mitglied' },
  { value: 'organizer', label: 'Organisator' },
  { value: 'admin', label: 'Admin' },
];

function roleLabel(role) {
  return role === 'admin' ? 'Admin' : role === 'organizer' ? 'Organisator' : 'Mitglied';
}

function mapDbUser(dbUser, memberships) {
  const roles = [];
  if (dbUser.isAdmin) {
    roles.push('admin');
  }
  const hasOrganizer = memberships.some(m => m.userId === dbUser.id && m.role === 'ORGANIZER');
  if (hasOrganizer) roles.push('organizer');
  if (!roles.includes('admin')) roles.push('member');
  const fullName = [dbUser.firstName, dbUser.lastName].filter(Boolean).join(' ') || dbUser.email?.split('@')[0] || '';
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: fullName,
    firstName: dbUser.firstName || '',
    lastName: dbUser.lastName || '',
    isAdmin: dbUser.isAdmin,
    roles,
    active: dbUser.isActive,
  };
}

function SuccessToast({ message, onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return <div className="alert alert-success zugang-toast">{message}</div>;
}

function ZugangsverwaltungPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ firstName: '', lastName: '', email: '' });
  const [createError, setCreateError] = useState('');

  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', roles: [] });
  const [editError, setEditError] = useState('');

  const [confirmUser, setConfirmUser] = useState(null);
  const [confirmError, setConfirmError] = useState('');

  const [toast, setToast] = useState('');

  const clearToast = useCallback(() => setToast(''), []);

  // Load users from Supabase
  useEffect(() => {
    if (!supabase) return;

    async function loadUsers() {
      const [usersRes, membershipsRes] = await Promise.all([
        supabase.from('User').select('id, email, firstName, lastName, isAdmin, isActive').order('lastName'),
        supabase.from('UserOrgUnit').select('userId, role'),
      ]);

      if (usersRes.error) {
        setLoadError('Fehler beim Laden der Benutzer: ' + usersRes.error.message);
        return;
      }

      const memberships = membershipsRes.data || [];
      setUsers((usersRes.data || []).map(u => mapDbUser(u, memberships)));
    }

    loadUsers();
  }, []);

  if (!isAdmin) return null;

  async function handleCreateSubmit(e) {
    e.preventDefault();
    const firstName = createForm.firstName.trim();
    const lastName = createForm.lastName.trim();
    const email = createForm.email.trim();
    if (!firstName) { setCreateError('Vorname ist erforderlich.'); return; }
    if (!lastName) { setCreateError('Nachname ist erforderlich.'); return; }
    if (!email || !email.includes('@')) { setCreateError('Gültige E-Mail-Adresse erforderlich.'); return; }
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      setCreateError('Diese E-Mail-Adresse ist bereits vergeben.');
      return;
    }

    const fullName = `${firstName} ${lastName}`;

    if (supabase) {
      const { data, error } = await supabase
        .from('User')
        .insert({ email, firstName, lastName, passwordHash: 'PENDING_AUTH_SETUP', isAdmin: false, isActive: true })
        .select('id, email, firstName, lastName, isAdmin, isActive')
        .single();

      if (error) { setCreateError('Fehler: ' + error.message); return; }

      setUsers(prev => [...prev, mapDbUser(data, [])]);
    } else {
      setUsers(prev => [...prev, {
        id: `user-${Date.now()}`, name: fullName, firstName, lastName, email, isAdmin: false, roles: ['member'], active: true,
      }]);
    }

    setShowCreateDialog(false);
    setToast(`Benutzer "${fullName}" wurde erfolgreich angelegt.`);
  }

  function handleCreateOpen() {
    setCreateForm({ firstName: '', lastName: '', email: '' });
    setCreateError('');
    setShowCreateDialog(true);
  }

  function handleEditOpen(user) {
    setEditForm({ firstName: user.firstName || '', lastName: user.lastName || '', roles: [...user.roles] });
    setEditError('');
    setEditUser(user);
  }

  function handleEditToggleRole(role) {
    setEditForm(prev => {
      const has = prev.roles.includes(role);
      if (has && prev.roles.length === 1) return prev;
      const next = has
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role];
      return { ...prev, roles: next };
    });
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    const firstName = editForm.firstName.trim();
    const lastName = editForm.lastName.trim();
    if (!firstName) { setEditError('Vorname ist erforderlich.'); return; }
    if (!lastName) { setEditError('Nachname ist erforderlich.'); return; }
    if (editForm.roles.length === 0) { setEditError('Mindestens eine Rolle ist erforderlich.'); return; }

    const fullName = `${firstName} ${lastName}`;
    const nextIsAdmin = editForm.roles.includes('admin');

    if (supabase) {
      const { error } = await supabase
        .from('User')
        .update({ firstName, lastName, isAdmin: nextIsAdmin })
        .eq('id', editUser.id);

      if (error) { setEditError('Fehler: ' + error.message); return; }
    }

    setUsers(prev => prev.map(u =>
      u.id === editUser.id ? { ...u, name: fullName, firstName, lastName, roles: editForm.roles, isAdmin: nextIsAdmin } : u
    ));
    setEditUser(null);
    setToast(`Benutzer "${fullName}" wurde aktualisiert.`);
  }

  function handleToggleActiveOpen(user) {
    setConfirmError('');
    if (user.isAdmin && user.active) {
      setConfirmUser(user);
      setConfirmError('Der System-Administrator kann nicht deaktiviert werden.');
      return;
    }
    setConfirmUser(user);
  }

  async function handleToggleActiveConfirm() {
    const user = confirmUser;
    const nextActive = !user.active;

    if (supabase) {
      const { error } = await supabase
        .from('User')
        .update({ isActive: nextActive })
        .eq('id', user.id);

      if (error) {
        setConfirmError('Fehler: ' + error.message);
        return;
      }
    }

    setUsers(prev => prev.map(u =>
      u.id === user.id ? { ...u, active: nextActive } : u
    ));
    setConfirmUser(null);
    setToast(`${user.name} wurde ${nextActive ? 'aktiviert' : 'deaktiviert'}.`);
  }

  return (
    <div className="admin-area">
      {toast && <SuccessToast message={toast} onDone={clearToast} />}

      <div className="admin-header">
        <h2>Zugangsverwaltung</h2>
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
        <span className="warning-icon">&#9888;&#65039;</span>
        <div>
          <strong>Administrator-Modus</strong>
          <p>Sie haben globalen Zugriff ohne Scope-Einschränkungen. Änderungen wirken sich systemweit aus.</p>
        </div>
      </div>

      <div className="admin-content-card">
        <div className="admin-section">
          <div className="section-header">
            <h3>Alle Benutzer ({users.length})</h3>
            <button className="btn btn-primary btn-sm" onClick={handleCreateOpen}>+ Neuer Benutzer</button>
          </div>

          {loadError && <div className="alert alert-error">{loadError}</div>}

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
                <tr key={user.id} className={!user.active ? 'row-inactive' : ''}>
                  <td className="user-name">{user.name}</td>
                  <td className="user-email">{user.email}</td>
                  <td className="user-roles">
                    {user.roles.map(role => (
                      <span key={role} className={`role-tag ${role}`}>
                        {roleLabel(role)}
                      </span>
                    ))}
                  </td>
                  <td>
                    <span className={`status-badge ${user.active ? 'active' : 'inactive'}`}>
                      {user.active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="action-btn" onClick={() => handleEditOpen(user)}>Bearbeiten</button>
                    <button
                      className={`action-btn ${user.active ? 'danger' : ''}`}
                      onClick={() => handleToggleActiveOpen(user)}
                    >
                      {user.active ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Create User Dialog */}
          {showCreateDialog && (
            <div className="modal-backdrop" onClick={() => setShowCreateDialog(false)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Neuer Benutzer</h3>
                  <button className="close-btn" onClick={() => setShowCreateDialog(false)}>&#10005;</button>
                </div>
                <form onSubmit={handleCreateSubmit}>
                  <div className="modal-body">
                    <p className="admin-dialog-hint">
                      Der Benutzer erhält zunächst die Mitglieder-Rolle. Er kann weitere Profildaten selbst ergänzen.
                    </p>
                    {createError && <div className="alert alert-error">{createError}</div>}
                    <div className="form-group">
                      <label className="form-label">Vorname *</label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder="Vorname"
                        value={createForm.firstName}
                        onChange={e => setCreateForm(f => ({ ...f, firstName: e.target.value }))}
                        autoFocus
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Nachname *</label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder="Nachname"
                        value={createForm.lastName}
                        onChange={e => setCreateForm(f => ({ ...f, lastName: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">E-Mail *</label>
                      <input
                        className="form-input"
                        type="email"
                        placeholder="email@example.com"
                        value={createForm.email}
                        onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowCreateDialog(false)}>Abbrechen</button>
                    <button type="submit" className="btn btn-primary">Benutzer anlegen</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit User Dialog */}
          {editUser && (
            <div className="modal-backdrop" onClick={() => setEditUser(null)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Benutzer bearbeiten</h3>
                  <button className="close-btn" onClick={() => setEditUser(null)}>&#10005;</button>
                </div>
                <form onSubmit={handleEditSubmit}>
                  <div className="modal-body">
                    {editError && <div className="alert alert-error">{editError}</div>}
                    <div className="form-group">
                      <label className="form-label">Vorname *</label>
                      <input
                        className="form-input"
                        type="text"
                        value={editForm.firstName}
                        onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))}
                        autoFocus
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Nachname *</label>
                      <input
                        className="form-input"
                        type="text"
                        value={editForm.lastName}
                        onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Rollen *</label>
                      <div className="role-checkboxes">
                        {ROLE_OPTIONS.map(opt => (
                          <label key={opt.value} className="role-checkbox-label">
                            <input
                              type="checkbox"
                              checked={editForm.roles.includes(opt.value)}
                              onChange={() => handleEditToggleRole(opt.value)}
                            />
                            <span className={`role-tag ${opt.value}`}>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setEditUser(null)}>Abbrechen</button>
                    <button type="submit" className="btn btn-primary">Speichern</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Confirm Deactivate/Activate Dialog */}
          {confirmUser && (
            <div className="modal-backdrop" onClick={() => setConfirmUser(null)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>{confirmUser.active ? 'Benutzer deaktivieren' : 'Benutzer aktivieren'}</h3>
                  <button className="close-btn" onClick={() => setConfirmUser(null)}>&#10005;</button>
                </div>
                <div className="modal-body">
                  {confirmError ? (
                    <div className="alert alert-error">{confirmError}</div>
                  ) : (
                    <p style={{ margin: 0, fontSize: '14px' }}>
                      {confirmUser.active
                        ? `Möchten Sie ${confirmUser.name} deaktivieren? Der Benutzer verliert den Zugang zum System.`
                        : `Möchten Sie ${confirmUser.name} wieder aktivieren?`
                      }
                    </p>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setConfirmUser(null)}>
                    {confirmError ? 'Schließen' : 'Abbrechen'}
                  </button>
                  {!confirmError && (
                    <button
                      className={`btn ${confirmUser.active ? 'btn-danger' : 'btn-primary'}`}
                      onClick={handleToggleActiveConfirm}
                    >
                      {confirmUser.active ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ZugangsverwaltungPage;
