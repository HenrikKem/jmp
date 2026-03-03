import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { orgUnits, orgUnitLevels, buildTree } from '../../data/mockData';
import HintButton from '../HintButton/HintButton';
import './Profile.css';

/**
 * Profile Component
 *
 * Displays user profile with:
 * - Personal data (view + edit)
 * - OrgUnit memberships with multi-selection
 * - Funktionen and Ehrungen (read-only, managed by organizer/admin)
 * - Validation (no duplicates)
 */
function Profile() {
  const { user, isAdmin, isOrganizer, updateMemberships, updateProfile } = useAuth();
  const [isEditingMemberships, setIsEditingMemberships] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [selectedOrgUnits, setSelectedOrgUnits] = useState(
    user.memberships.map(m => m.orgUnitId)
  );

  const buildInitialForm = () => ({
    email: user.email,
    anrede: user.profile.anrede || '',
    titel: user.profile.titel || '',
    briefanrede: user.profile.briefanrede || '',
    berufsgruppe: user.profile.berufsgruppe || '',
    geburtsort: user.profile.geburtsort || '',
    nationalitaet: user.profile.nationalitaet || 'Deutschland',
    telefonPrivat: user.profile.telefonPrivat || '',
    telefonDienstlich: user.profile.telefonDienstlich || '',
    handy: user.profile.handy || '',
    street: user.profile.street || '',
    postalCode: user.profile.postalCode || '',
    city: user.profile.city || '',
    land: user.profile.land || 'Deutschland',
    bezirk: user.profile.bezirk || '',
    hasPostalAddress: user.profile.hasPostalAddress || false,
    postStrasse: user.profile.postStrasse || '',
    postPlz: user.profile.postPlz || '',
    postOrt: user.profile.postOrt || '',
    postLand: user.profile.postLand || 'Deutschland',
    dateOfBirth: user.profile.dateOfBirth || '',
    gender: user.profile.gender || '',
  });

  const [profileForm, setProfileForm] = useState(buildInitialForm);
  const [error, setError] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const tree = buildTree(orgUnits);

  const handleToggleOrgUnit = (orgUnitId) => {
    setError(null);
    if (selectedOrgUnits.includes(orgUnitId)) {
      setSelectedOrgUnits(selectedOrgUnits.filter(id => id !== orgUnitId));
    } else {
      setSelectedOrgUnits([...selectedOrgUnits, orgUnitId]);
    }
  };

  const handleSaveMemberships = () => {
    if (selectedOrgUnits.length === 0) {
      setError('Mindestens eine Organisationseinheit muss ausgewählt sein.');
      return;
    }
    const uniqueIds = new Set(selectedOrgUnits);
    if (uniqueIds.size !== selectedOrgUnits.length) {
      setError('Doppelte Einträge sind nicht erlaubt.');
      return;
    }
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

  const handleProfileChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setProfileError(null);
  };

  const handleSaveProfile = () => {
    if (!profileForm.email.trim()) {
      setProfileError('E-Mail ist erforderlich');
      return;
    }
    updateProfile({
      email: profileForm.email,
      profile: {
        anrede: profileForm.anrede,
        titel: profileForm.titel,
        briefanrede: profileForm.briefanrede,
        berufsgruppe: profileForm.berufsgruppe,
        geburtsort: profileForm.geburtsort,
        nationalitaet: profileForm.nationalitaet,
        telefonPrivat: profileForm.telefonPrivat,
        telefonDienstlich: profileForm.telefonDienstlich,
        handy: profileForm.handy,
        street: profileForm.street,
        postalCode: profileForm.postalCode,
        city: profileForm.city,
        land: profileForm.land,
        bezirk: profileForm.bezirk,
        hasPostalAddress: profileForm.hasPostalAddress,
        postStrasse: profileForm.postStrasse,
        postPlz: profileForm.postPlz,
        postOrt: profileForm.postOrt,
        postLand: profileForm.postLand,
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
    setProfileForm(buildInitialForm());
    setIsEditingProfile(false);
    setProfileError(null);
  };

  const genderLabel = (g) => {
    if (g === 'male') return 'Männlich';
    if (g === 'female') return 'Weiblich';
    if (g === 'other') return 'Divers';
    return '—';
  };

  const formatDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('de-DE'); } catch { return d; }
  };

  const formatFunktionDates = (f) => {
    const von = formatDate(f.vonDatum);
    const bis = f.bisDatum ? formatDate(f.bisDatum) : 'heute';
    return `${von} – ${bis}`;
  };

  const funktionen = user.funktionen || [];
  const ehrungen = user.ehrungen || [];
  const showAdminSection = isAdmin || isOrganizer;

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
            <button className="edit-btn" onClick={() => setIsEditingProfile(true)}>
              Bearbeiten
            </button>
          )}
        </div>

        {successMessage && <div className="success-message">{successMessage}</div>}
        {profileError && <div className="error-message">{profileError}</div>}

        {!isEditingProfile ? (
          <div className="profile-view">
            <div className="profile-subsection">
              <h4>Anrede & Identität</h4>
              <div className="profile-grid">
                <div className="profile-field">
                  <label>Anrede</label>
                  <span>{user.profile.anrede || '—'}</span>
                </div>
                <div className="profile-field">
                  <label>Titel</label>
                  <span>{user.profile.titel || '—'}</span>
                </div>
                <div className="profile-field">
                  <label>Briefanrede</label>
                  <span>{user.profile.briefanrede || '—'}</span>
                </div>
                <div className="profile-field">
                  <label>Berufsgruppe</label>
                  <span>{user.profile.berufsgruppe || '—'}</span>
                </div>
                <div className="profile-field">
                  <label>Geburtsort</label>
                  <span>{user.profile.geburtsort || '—'}</span>
                </div>
                <div className="profile-field">
                  <label>Nationalität</label>
                  <span>{user.profile.nationalitaet || '—'}</span>
                </div>
                <div className="profile-field">
                  <label>Geburtsdatum</label>
                  <span>{formatDate(user.profile.dateOfBirth)}</span>
                </div>
                <div className="profile-field">
                  <label>Geschlecht</label>
                  <span>{genderLabel(user.profile.gender)}</span>
                </div>
                <div className="profile-field">
                  <label>Jagdschein seit</label>
                  <span>{user.profile.huntingLicenseDate ? formatDate(user.profile.huntingLicenseDate) : '—'}</span>
                </div>
              </div>
            </div>

            <div className="profile-subsection">
              <h4>Kontakt</h4>
              <div className="profile-grid">
                <div className="profile-field">
                  <label>E-Mail</label>
                  <span>{user.email}</span>
                </div>
                <div className="profile-field">
                  <label>Telefon Privat</label>
                  <span>{user.profile.telefonPrivat || '—'}</span>
                </div>
                <div className="profile-field">
                  <label>Telefon Dienstlich</label>
                  <span>{user.profile.telefonDienstlich || '—'}</span>
                </div>
                <div className="profile-field">
                  <label>Handy</label>
                  <span>{user.profile.handy || '—'}</span>
                </div>
              </div>
            </div>

            <div className="profile-subsection">
              <h4>Adresse</h4>
              <div className="profile-grid">
                <div className="profile-field">
                  <label>Straße</label>
                  <span>{user.profile.street || '—'}</span>
                </div>
                <div className="profile-field">
                  <label>PLZ / Ort</label>
                  <span>{user.profile.postalCode} {user.profile.city}</span>
                </div>
                <div className="profile-field">
                  <label>Land</label>
                  <span>{user.profile.land || '—'}</span>
                </div>
                {user.profile.bezirk && (
                  <div className="profile-field">
                    <label>Bezirk</label>
                    <span>{user.profile.bezirk}</span>
                  </div>
                )}
                {user.profile.hasPostalAddress && (
                  <div className="profile-field profile-field--full">
                    <label>Postanschrift</label>
                    <span>
                      {user.profile.postStrasse}, {user.profile.postPlz} {user.profile.postOrt}, {user.profile.postLand}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="profile-edit-form">
            <div className="form-subsection">
              <h4>Anrede & Identität</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="anrede">Anrede</label>
                  <select id="anrede" name="anrede" value={profileForm.anrede} onChange={handleProfileChange}>
                    <option value="">—</option>
                    <option value="Herr">Herr</option>
                    <option value="Frau">Frau</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="titel">Titel</label>
                  <input type="text" id="titel" name="titel" value={profileForm.titel} onChange={handleProfileChange} placeholder="z.B. Dr." />
                </div>
                <div className="form-group form-group--wide">
                  <label htmlFor="briefanrede">Briefanrede</label>
                  <input type="text" id="briefanrede" name="briefanrede" value={profileForm.briefanrede} onChange={handleProfileChange} placeholder="z.B. Sehr geehrter Herr Mustermann" />
                </div>
                <div className="form-group">
                  <label htmlFor="berufsgruppe">Berufsgruppe</label>
                  <input type="text" id="berufsgruppe" name="berufsgruppe" value={profileForm.berufsgruppe} onChange={handleProfileChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="geburtsort">Geburtsort</label>
                  <input type="text" id="geburtsort" name="geburtsort" value={profileForm.geburtsort} onChange={handleProfileChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="nationalitaet">Nationalität</label>
                  <input type="text" id="nationalitaet" name="nationalitaet" value={profileForm.nationalitaet} onChange={handleProfileChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="dateOfBirth">Geburtsdatum</label>
                  <input type="date" id="dateOfBirth" name="dateOfBirth" value={profileForm.dateOfBirth} onChange={handleProfileChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="gender">Geschlecht</label>
                  <select id="gender" name="gender" value={profileForm.gender} onChange={handleProfileChange}>
                    <option value="">—</option>
                    <option value="male">Männlich</option>
                    <option value="female">Weiblich</option>
                    <option value="other">Divers</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-subsection">
              <h4>Kontakt</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="email">E-Mail *</label>
                  <input type="email" id="email" name="email" value={profileForm.email} onChange={handleProfileChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="telefonPrivat">Telefon Privat</label>
                  <input type="tel" id="telefonPrivat" name="telefonPrivat" value={profileForm.telefonPrivat} onChange={handleProfileChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="telefonDienstlich">Telefon Dienstlich</label>
                  <input type="tel" id="telefonDienstlich" name="telefonDienstlich" value={profileForm.telefonDienstlich} onChange={handleProfileChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="handy">Handy</label>
                  <input type="tel" id="handy" name="handy" value={profileForm.handy} onChange={handleProfileChange} />
                </div>
              </div>
            </div>

            <div className="form-subsection">
              <h4>Adresse</h4>
              <div className="form-grid">
                <div className="form-group form-group--wide">
                  <label htmlFor="street">Straße</label>
                  <input type="text" id="street" name="street" value={profileForm.street} onChange={handleProfileChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="postalCode">PLZ</label>
                  <input type="text" id="postalCode" name="postalCode" value={profileForm.postalCode} onChange={handleProfileChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="city">Ort</label>
                  <input type="text" id="city" name="city" value={profileForm.city} onChange={handleProfileChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="land">Land</label>
                  <input type="text" id="land" name="land" value={profileForm.land} onChange={handleProfileChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="bezirk">Bezirk</label>
                  <input type="text" id="bezirk" name="bezirk" value={profileForm.bezirk} onChange={handleProfileChange} placeholder="Optional" />
                </div>
                <div className="form-group form-group--full">
                  <label className="checkbox-label">
                    <input type="checkbox" name="hasPostalAddress" checked={profileForm.hasPostalAddress} onChange={handleProfileChange} />
                    Abweichende Postanschrift
                  </label>
                </div>
                {profileForm.hasPostalAddress && (
                  <>
                    <div className="form-group form-group--wide">
                      <label htmlFor="postStrasse">Post Straße</label>
                      <input type="text" id="postStrasse" name="postStrasse" value={profileForm.postStrasse} onChange={handleProfileChange} />
                    </div>
                    <div className="form-group">
                      <label htmlFor="postPlz">Post PLZ</label>
                      <input type="text" id="postPlz" name="postPlz" value={profileForm.postPlz} onChange={handleProfileChange} />
                    </div>
                    <div className="form-group">
                      <label htmlFor="postOrt">Post Ort</label>
                      <input type="text" id="postOrt" name="postOrt" value={profileForm.postOrt} onChange={handleProfileChange} />
                    </div>
                    <div className="form-group">
                      <label htmlFor="postLand">Post Land</label>
                      <input type="text" id="postLand" name="postLand" value={profileForm.postLand} onChange={handleProfileChange} />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="editor-actions">
              <button className="save-btn" onClick={handleSaveProfile}>Speichern</button>
              <button className="cancel-btn" onClick={handleCancelProfileEdit}>Abbrechen</button>
            </div>
          </div>
        )}
      </section>

      {/* Funktionen — read-only in self-edit, managed by organizer/admin */}
      <section className="profile-section">
        <div className="section-header">
          <h3>Funktionen</h3>
        </div>
        {funktionen.length === 0 ? (
          <p className="profile-empty">Keine Funktionen eingetragen.</p>
        ) : (
          <ul className="profile-list">
            {funktionen.map((f, i) => {
              const orgUnit = f.orgUnitId ? getOrgUnitById(f.orgUnitId) : null;
              return (
                <li key={i} className="profile-list-item">
                  <span className="list-item-name">{f.funktionsname}</span>
                  <span className="list-item-meta">{formatFunktionDates(f)}</span>
                  {orgUnit && <span className="list-item-org">{orgUnit.name}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Ehrungen — read-only in self-edit, managed by organizer/admin */}
      <section className="profile-section">
        <div className="section-header">
          <h3>Ehrungen</h3>
        </div>
        {ehrungen.length === 0 ? (
          <p className="profile-empty">Keine Ehrungen eingetragen.</p>
        ) : (
          <ul className="profile-list">
            {ehrungen.map((e, i) => (
              <li key={i} className="profile-list-item">
                <span className="list-item-name">{e.ehrungsname}</span>
                <span className="list-item-meta">{formatDate(e.datum)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Admin section — only visible to organizers/admins */}
      {showAdminSection && (
        <section className="profile-section profile-section--admin">
          <div className="section-header">
            <h3>Verwaltungsfelder</h3>
            <span className="admin-badge">Nur für Organisatoren</span>
          </div>
          <div className="profile-grid">
            <div className="profile-field">
              <label>Externe Mitgliedsnummer</label>
              <span className="monospace">{user.externeMitgliedsnummer || '—'}</span>
            </div>
            <div className="profile-field">
              <label>Externes Mitglied</label>
              <span>{user.istExternesMitglied ? 'Ja' : 'Nein'}</span>
            </div>
          </div>
        </section>
      )}

      <section className="profile-section">
        <div className="section-header">
          <h3>Organisationszugehörigkeiten</h3>
          {!isEditingMemberships && (
            <button className="edit-btn" onClick={() => setIsEditingMemberships(true)}>
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
              <button className="save-btn" onClick={handleSaveMemberships}>Speichern</button>
              <button className="cancel-btn" onClick={handleCancelEdit}>Abbrechen</button>
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
      <div className="selector-content" style={{ paddingLeft: `${level * 24}px` }}>
        <span className="expand-icon" onClick={() => hasChildren && setIsExpanded(!isExpanded)}>
          {hasChildren ? (isExpanded ? '▼' : '▶') : ''}
        </span>
        <label className="checkbox-label">
          <input type="checkbox" checked={isSelected} onChange={() => onToggle(node.id)} />
          <span className={`level-badge level-${node.level}`}>{levelInfo?.name}</span>
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
