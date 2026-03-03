import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { orgUnits, orgUnitLevels, buildTree } from '../../data/mockData';
import HintButton from '../HintButton/HintButton';
import './Profile.css';

/**
 * Profile Component
 *
 * Displays user profile with:
 * - Personal data (read-only for demo)
 * - OrgUnit memberships with multi-selection
 * - Validation (no duplicates)
 */
function Profile() {
  const { user, updateMemberships, updateProfile } = useAuth();
  const [isEditingMemberships, setIsEditingMemberships] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [selectedOrgUnits, setSelectedOrgUnits] = useState(
    user.memberships.map(m => m.orgUnitId)
  );
  const [profileForm, setProfileForm] = useState({
    email: user.email,
    phone: user.profile.phone,
    street: user.profile.street,
    postalCode: user.profile.postalCode,
    city: user.profile.city,
    dateOfBirth: user.profile.dateOfBirth,
    gender: user.profile.gender,
  });
  const [error, setError] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const tree = buildTree(orgUnits);

  const handleToggleOrgUnit = (orgUnitId) => {
    setError(null);

    if (selectedOrgUnits.includes(orgUnitId)) {
      // Remove
      setSelectedOrgUnits(selectedOrgUnits.filter(id => id !== orgUnitId));
    } else {
      // Add - check for duplicates (already handled by toggle logic)
      setSelectedOrgUnits([...selectedOrgUnits, orgUnitId]);
    }
  };

  const handleSaveMemberships = () => {
    if (selectedOrgUnits.length === 0) {
      setError('Mindestens eine Organisationseinheit muss ausgewählt sein.');
      return;
    }

    // Check for duplicates (should not happen with toggle logic, but validate anyway)
    const uniqueIds = new Set(selectedOrgUnits);
    if (uniqueIds.size !== selectedOrgUnits.length) {
      setError('Doppelte Einträge sind nicht erlaubt.');
      return;
    }

    // Update user memberships (keep existing roles, default new ones to 'member')
    const newMemberships = selectedOrgUnits.map(orgUnitId => {
      const existing = user.memberships.find(m => m.orgUnitId === orgUnitId);
      return existing || { orgUnitId, role: 'member' };
    });

    updateMemberships(newMemberships);
    setIsEditingMemberships(false);
    setError(null);
  };

  const handleCancelEdit = () => {
    setSelectedOrgUnits(user.memberships.map(m => m.orgUnitId));
    setIsEditingMemberships(false);
    setError(null);
  };

  const getOrgUnitById = (id) => orgUnits.find(u => u.id === id);

  // Profile editing handlers
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
    setProfileError(null);
  };

  const handleSaveProfile = () => {
    // Validate required fields
    if (!profileForm.email.trim()) {
      setProfileError('E-Mail ist erforderlich');
      return;
    }
    if (!profileForm.phone.trim()) {
      setProfileError('Telefon ist erforderlich');
      return;
    }

    updateProfile({
      email: profileForm.email,
      profile: {
        phone: profileForm.phone,
        street: profileForm.street,
        postalCode: profileForm.postalCode,
        city: profileForm.city,
        dateOfBirth: profileForm.dateOfBirth,
        gender: profileForm.gender,
      }
    });

    setIsEditingProfile(false);
    setProfileError(null);
    setSuccessMessage('Profil erfolgreich aktualisiert');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleCancelProfileEdit = () => {
    setProfileForm({
      email: user.email,
      phone: user.profile.phone,
      street: user.profile.street,
      postalCode: user.profile.postalCode,
      city: user.profile.city,
      dateOfBirth: user.profile.dateOfBirth,
      gender: user.profile.gender,
    });
    setIsEditingProfile(false);
    setProfileError(null);
  };

  return (
    <div className="profile">
      <div className="profile-header">
        <h2>Mein Profil</h2>
        <HintButton title="Datenschutz & DSGVO" wide>
          <div className="hint-privacy">
            <h4>Ihre Rechte</h4>
            <ul>
              <li><strong>Auskunftsrecht (Art. 15):</strong> Sie können eine Kopie Ihrer gespeicherten Daten anfordern.</li>
              <li><strong>Recht auf Löschung (Art. 17):</strong> Sie können die Löschung Ihres Kontos und aller personenbezogenen Daten beantragen.</li>
              <li><strong>Berichtigung (Art. 16):</strong> Sie können Ihre Daten jederzeit im Profil bearbeiten.</li>
              <li><strong>Datenübertragbarkeit (Art. 20):</strong> Export Ihrer Daten in einem maschinenlesbaren Format möglich.</li>
            </ul>
            <h4>Datensichtbarkeit</h4>
            <table className="hint-visibility-table">
              <thead>
                <tr><th>Wer</th><th>Name</th><th>E-Mail</th><th>Telefon</th><th>Adresse</th></tr>
              </thead>
              <tbody>
                <tr><td>Sie selbst</td><td>✓</td><td>✓</td><td>✓</td><td>✓</td></tr>
                <tr><td>Organizer</td><td>✓</td><td>✓</td><td>✓</td><td>Ort</td></tr>
                <tr><td>Mitglieder</td><td>✓</td><td>✓</td><td>–</td><td>–</td></tr>
                <tr><td>Teilnehmer</td><td>✓</td><td>–</td><td>–</td><td>–</td></tr>
              </tbody>
            </table>
            <h4>Audit-Protokollierung</h4>
            <p>Protokolliert werden: Profil-Änderungen, Event-An/Abmeldungen, Rollenzuweisungen, Admin-Zugriffe, Datenexporte.</p>
            <p className="hint-audit-note">Audit-Logs werden 10 Jahre aufbewahrt (gesetzliche Aufbewahrungspflicht).</p>
          </div>
        </HintButton>
      </div>

      <section className="profile-section">
        <div className="section-header">
          <h3>Persönliche Daten</h3>
          {!isEditingProfile && (
            <button
              className="edit-btn"
              onClick={() => setIsEditingProfile(true)}
            >
              Bearbeiten
            </button>
          )}
        </div>

        {successMessage && (
          <div className="success-message">{successMessage}</div>
        )}

        {profileError && (
          <div className="error-message">{profileError}</div>
        )}

        {!isEditingProfile ? (
          <div className="profile-grid">
            <div className="profile-field">
              <label>E-Mail</label>
              <span>{user.email}</span>
            </div>
            <div className="profile-field">
              <label>Telefon</label>
              <span>{user.profile.phone}</span>
            </div>
            <div className="profile-field">
              <label>Adresse</label>
              <span>
                {user.profile.street}, {user.profile.postalCode} {user.profile.city}
              </span>
            </div>
            <div className="profile-field">
              <label>Geburtsdatum</label>
              <span>{new Date(user.profile.dateOfBirth).toLocaleDateString('de-DE')}</span>
            </div>
            <div className="profile-field">
              <label>Geschlecht</label>
              <span>{user.profile.gender === 'male' ? 'Männlich' : 'Weiblich'}</span>
            </div>
            <div className="profile-field">
              <label>Jagdschein seit</label>
              <span>{new Date(user.profile.huntingLicenseDate).toLocaleDateString('de-DE')}</span>
            </div>
          </div>
        ) : (
          <div className="profile-edit-form">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="email">E-Mail *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={profileForm.email}
                  onChange={handleProfileChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Telefon *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={profileForm.phone}
                  onChange={handleProfileChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="street">Straße</label>
                <input
                  type="text"
                  id="street"
                  name="street"
                  value={profileForm.street}
                  onChange={handleProfileChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="postalCode">PLZ</label>
                <input
                  type="text"
                  id="postalCode"
                  name="postalCode"
                  value={profileForm.postalCode}
                  onChange={handleProfileChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="city">Stadt</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={profileForm.city}
                  onChange={handleProfileChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="dateOfBirth">Geburtsdatum</label>
                <input
                  type="date"
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={profileForm.dateOfBirth}
                  onChange={handleProfileChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="gender">Geschlecht</label>
                <select
                  id="gender"
                  name="gender"
                  value={profileForm.gender}
                  onChange={handleProfileChange}
                >
                  <option value="male">Männlich</option>
                  <option value="female">Weiblich</option>
                  <option value="other">Divers</option>
                </select>
              </div>
            </div>
            <div className="editor-actions">
              <button className="save-btn" onClick={handleSaveProfile}>
                Speichern
              </button>
              <button className="cancel-btn" onClick={handleCancelProfileEdit}>
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="profile-section">
        <div className="section-header">
          <h3>Organisationszugehörigkeiten</h3>
          {!isEditingMemberships && (
            <button
              className="edit-btn"
              onClick={() => setIsEditingMemberships(true)}
            >
              Bearbeiten
            </button>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        {!isEditingMemberships ? (
          <div className="memberships-list">
            {user.memberships.length === 0 ? (
              <p className="no-memberships">Keine Mitgliedschaften vorhanden.</p>
            ) : (
              user.memberships.map(membership => {
                const orgUnit = getOrgUnitById(membership.orgUnitId);
                if (!orgUnit) return null;

                return (
                  <div key={membership.orgUnitId} className="membership-item">
                    <span className={`level-badge level-${orgUnit.level}`}>
                      {orgUnitLevels[orgUnit.level]?.name}
                    </span>
                    <span className="org-name">{orgUnit.name}</span>
                    <span className={`role-badge role-${membership.role}`}>
                      {membership.role === 'organizer' ? 'Organisator' : 'Mitglied'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="memberships-editor">
            <p className="editor-info">
              Wählen Sie Ihre Organisationszugehörigkeiten aus.
              Sie können mehreren Einheiten angehören.
            </p>

            <div className="org-selector">
              {tree.map(node => (
                <OrgUnitSelector
                  key={node.id}
                  node={node}
                  level={0}
                  selectedIds={selectedOrgUnits}
                  onToggle={handleToggleOrgUnit}
                />
              ))}
            </div>

            <div className="editor-actions">
              <button className="save-btn" onClick={handleSaveMemberships}>
                Speichern
              </button>
              <button className="cancel-btn" onClick={handleCancelEdit}>
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </section>

    </div>
  );
}

function OrgUnitSelector({ node, level, selectedIds, onToggle }) {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedIds.includes(node.id);
  const levelInfo = orgUnitLevels[node.level];

  return (
    <div className="selector-node">
      <div
        className="selector-content"
        style={{ paddingLeft: `${level * 24}px` }}
      >
        <span
          className="expand-icon"
          onClick={() => hasChildren && setIsExpanded(!isExpanded)}
        >
          {hasChildren ? (isExpanded ? '▼' : '▶') : ''}
        </span>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggle(node.id)}
          />
          <span className={`level-badge level-${node.level}`}>
            {levelInfo?.name}
          </span>
          <span className="org-name">{node.name}</span>
        </label>
      </div>

      {isExpanded && hasChildren && (
        <div className="selector-children">
          {node.children.map(child => (
            <OrgUnitSelector
              key={child.id}
              node={child}
              level={level + 1}
              selectedIds={selectedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Profile;
