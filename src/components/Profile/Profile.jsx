import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { orgUnits, orgUnitLevels, buildTree } from '../../data/mockData';
import PrivacyInfo from '../Privacy/PrivacyInfo';
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
  const { user, updateMemberships } = useAuth();
  const [isEditingMemberships, setIsEditingMemberships] = useState(false);
  const [selectedOrgUnits, setSelectedOrgUnits] = useState(
    user.memberships.map(m => m.orgUnitId)
  );
  const [error, setError] = useState(null);

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

  return (
    <div className="profile">
      <h2>Mein Profil</h2>

      <section className="profile-section">
        <h3>Persönliche Daten</h3>
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

      <section className="profile-section">
        <PrivacyInfo variant="full" />
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
