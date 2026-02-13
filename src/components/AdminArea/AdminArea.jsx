import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { orgUnits, orgUnitLevels } from '../../data/mockData';
import './AdminArea.css';

/**
 * AdminArea Component
 *
 * Global administration area for admins.
 * Provides access to all users and organizational units without scope restrictions.
 */

// Mock all users for demonstration
const mockAllUsers = [
  { id: 'user-1', email: 'max.mustermann@example.com', name: 'Max Mustermann', isAdmin: false, roles: ['member', 'organizer'] },
  { id: 'user-2', email: 'anna.schmidt@example.com', name: 'Anna Schmidt', isAdmin: false, roles: ['member'] },
  { id: 'user-3', email: 'peter.mueller@example.com', name: 'Peter Müller', isAdmin: false, roles: ['member'] },
  { id: 'user-4', email: 'admin@example.com', name: 'System Admin', isAdmin: true, roles: ['admin'] },
  { id: 'user-5', email: 'lisa.weber@example.com', name: 'Lisa Weber', isAdmin: false, roles: ['member'] },
];

function AdminArea() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('users');

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="admin-area">
      <h2>Admin-Bereich</h2>

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
        <button
          className={`tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          Rollenverwaltung
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'orgs' && <OrgsTab />}
        {activeTab === 'roles' && <RolesTab />}
      </div>
    </div>
  );
}

function UsersTab() {
  return (
    <div className="admin-section">
      <div className="section-header">
        <h3>Alle Benutzer</h3>
        <button className="primary-btn">+ Neuer Benutzer</button>
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
          {mockAllUsers.map(user => (
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
    </div>
  );
}

function OrgsTab() {
  const levelGroups = {};
  orgUnits.forEach(unit => {
    if (!levelGroups[unit.level]) {
      levelGroups[unit.level] = [];
    }
    levelGroups[unit.level].push(unit);
  });

  const levelOrder = ['federal', 'state', 'region', 'district', 'hegering'];

  return (
    <div className="admin-section">
      <div className="section-header">
        <h3>Organisationsstruktur</h3>
        <button className="primary-btn">+ Neue Einheit</button>
      </div>

      <div className="org-levels">
        {levelOrder.map(level => (
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
    </div>
  );
}

function RolesTab() {
  return (
    <div className="admin-section">
      <h3>Rollenmodell</h3>

      <div className="role-cards">
        <div className="role-card">
          <div className="role-header member">
            <h4>Mitglied</h4>
          </div>
          <div className="role-body">
            <p>Basisrolle für alle Benutzer</p>
            <ul>
              <li>Eigenes Profil verwalten</li>
              <li>Berechtigte Events ansehen</li>
              <li>Für Events anmelden/abmelden</li>
              <li>Eigene Anmeldungen verwalten</li>
            </ul>
          </div>
        </div>

        <div className="role-card">
          <div className="role-header organizer">
            <h4>Organisator</h4>
          </div>
          <div className="role-body">
            <p>Scope-basierte Verwaltungsrolle</p>
            <ul>
              <li>Alle Mitglied-Rechte</li>
              <li>Mitglieder im Scope verwalten</li>
              <li>Events im Scope erstellen/verwalten</li>
              <li>Event-Rollen zuweisen</li>
            </ul>
            <div className="scope-note">
              <strong>Scope:</strong> Zugewiesene OrgUnit(s) + alle Nachfahren
            </div>
          </div>
        </div>

        <div className="role-card">
          <div className="role-header admin">
            <h4>Administrator</h4>
          </div>
          <div className="role-body">
            <p>Globale Verwaltungsrolle</p>
            <ul>
              <li>Alle Organisator-Rechte</li>
              <li>Keine Scope-Einschränkungen</li>
              <li>Benutzer erstellen/deaktivieren</li>
              <li>Organisationsstruktur verwalten</li>
              <li>Rollen zuweisen</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminArea;
