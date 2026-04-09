import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { orgUnitLevels, buildTree, qualificationLabels } from '../../data/mockData';
import { useSupabaseProfile } from '../../hooks/useSupabaseProfile';
import HintButton from '../HintButton/HintButton';
import './Profile.css';

/**
 * Profile Component
 *
 * Displays user profile with:
 * - Personal data (view + edit), including J. Jagdscheinausstellung + J. Mitglied Jagdverband
 * - Qualifications (self-editable)
 * - Funktionen and Ehrungen (read-only, managed by organizer/admin)
 * - OrgUnit memberships with multi-selection
 */

const defaultQualifications = {
  jagdpaechter: false,
  begegnungsscheininhaber: false,
  hundefuehrer: false,
  hundpruefungsarten: [],
  bestaetigterJagdaufseher: false,
  fallenlehrgang: false,
  jagdhorn: false,
  drohnenfuehrerschein: false,
  schiessleistungsnadel: '',
};

function Profile() {
  const { user, isAdmin, isOrganizer, updateMemberships, updateProfile, orgUnits } = useAuth();
  const { loadProfile, saveProfile, loadDogs, saveDog, deleteDog, saving, error: supabaseError } = useSupabaseProfile();
  const [dogs, setDogs] = useState([]);
  const [newDog, setNewDog] = useState({ name: '', rasse: '', geburtsjahr: '' });
  const [dogDeleteConfirm, setDogDeleteConfirm] = useState(null);
  const [isEditingMemberships, setIsEditingMemberships] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingQualifications, setIsEditingQualifications] = useState(false);
  const [selectedOrgUnits, setSelectedOrgUnits] = useState(
    user.memberships.map(m => m.orgUnitId)
  );
  const mountedRef = useRef(true);

  const buildInitialForm = () => ({
    email: user.email,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
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
    huntingLicenseYear: user.profile.huntingLicenseDate
      ? String(new Date(user.profile.huntingLicenseDate).getFullYear())
      : '',
    mitgliedJagdverbandSeit: user.profile.mitgliedJagdverbandSeit
      ? String(user.profile.mitgliedJagdverbandSeit)
      : '',
  });

  const buildInitialQualifications = () => ({
    ...defaultQualifications,
    ...(user.profile.qualifications || {}),
  });

  const [profileForm, setProfileForm] = useState(buildInitialForm);
  const [qualificationsForm, setQualificationsForm] = useState(buildInitialQualifications);
  const [error, setError] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Load profile from Supabase on mount, merge into context
  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    async function fetchProfile() {
      const [result, userDogs] = await Promise.all([
        loadProfile(user.id),
        loadDogs(user.id),
      ]);
      if (cancelled || !mountedRef.current) return;
      if (userDogs) setDogs(userDogs);
      if (result && result.profile) {
        const merged = {};
        for (const [key, val] of Object.entries(result.profile)) {
          if (val !== null && val !== undefined) {
            merged[key] = val;
          }
        }
        if (Object.keys(merged).length > 0) {
          updateProfile({ profile: merged });

          // Update form fields, converting special fields
          const formUpdate = { ...merged };
          if (merged.huntingLicenseDate) {
            const year = new Date(merged.huntingLicenseDate).getFullYear();
            formUpdate.huntingLicenseYear = isNaN(year) ? '' : String(year);
          }
          if (merged.mitgliedJagdverbandSeit !== undefined) {
            formUpdate.mitgliedJagdverbandSeit = merged.mitgliedJagdverbandSeit
              ? String(merged.mitgliedJagdverbandSeit)
              : '';
          }
          setProfileForm(prev => ({ ...prev, ...formUpdate }));

          // Update qualifications separately
          if (merged.qualifications) {
            setQualificationsForm(prev => ({ ...defaultQualifications, ...prev, ...merged.qualifications }));
          }
        }
      }
    }

    fetchProfile();
    return () => { cancelled = true; mountedRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

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

  const handleQualificationChange = (key, value) => {
    setQualificationsForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveProfile = async () => {
    if (!profileForm.email.trim()) {
      setProfileError('E-Mail ist erforderlich');
      return;
    }

    const huntingLicenseDate = profileForm.huntingLicenseYear
      ? `${profileForm.huntingLicenseYear}-01-01`
      : null;

    const mitgliedJagdverbandSeit = profileForm.mitgliedJagdverbandSeit
      ? parseInt(profileForm.mitgliedJagdverbandSeit, 10)
      : null;

    const profileData = {
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
      postStrasse: profileForm.postStrasse,
      postPlz: profileForm.postPlz,
      postOrt: profileForm.postOrt,
      dateOfBirth: profileForm.dateOfBirth,
      gender: profileForm.gender,
      huntingLicenseDate,
      mitgliedJagdverbandSeit,
    };

    // Save to Supabase (non-blocking: local state updates even if DB fails)
    const result = await saveProfile(user.id, profileData);

    // Always update local context so UI stays consistent
    updateProfile({
      email: profileForm.email,
      profile: {
        ...profileData,
        bezirk: profileForm.bezirk,
        hasPostalAddress: profileForm.hasPostalAddress,
        postLand: profileForm.postLand,
      }
    });

    setIsEditingProfile(false);
    setProfileError(null);

    if (result.success) {
      setSuccessMessage('Profil erfolgreich gespeichert');
    } else if (result.error) {
      setSuccessMessage('Profil lokal aktualisiert (Datenbank nicht erreichbar)');
      console.warn('Supabase save failed:', result.error);
    } else {
      setSuccessMessage('Profil erfolgreich aktualisiert');
    }
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleCancelProfileEdit = () => {
    setProfileForm(buildInitialForm());
    setIsEditingProfile(false);
    setProfileError(null);
  };

  const handleSaveQualifications = async () => {
    const result = await saveProfile(user.id, { qualifications: qualificationsForm });
    updateProfile({ profile: { qualifications: qualificationsForm } });
    setIsEditingQualifications(false);
    if (result.success) {
      setSuccessMessage('Qualifikationen gespeichert');
    } else if (result.error) {
      setSuccessMessage('Qualifikationen lokal aktualisiert (Datenbank nicht erreichbar)');
    } else {
      setSuccessMessage('Qualifikationen erfolgreich aktualisiert');
    }
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleCancelQualificationsEdit = () => {
    setQualificationsForm(buildInitialQualifications());
    setIsEditingQualifications(false);
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

  const formatYear = (d) => {
    if (!d) return '—';
    try { return String(new Date(d).getFullYear()); } catch { return d; }
  };

  const formatFunktionDates = (f) => {
    const von = formatDate(f.vonDatum);
    const bis = f.bisDatum ? formatDate(f.bisDatum) : 'heute';
    return `${von} – ${bis}`;
  };

  // Build qualification display tags
  const getQualTags = (quals) => {
    const tags = [];
    const booleanKeys = ['jagdpaechter','begegnungsscheininhaber','hundefuehrer',
      'bestaetigterJagdaufseher','fallenlehrgang','jagdhorn','drohnenfuehrerschein'];
    for (const key of booleanKeys) {
      if (quals[key]) tags.push(qualificationLabels[key]);
    }
    if (quals.hundpruefungsarten?.length > 0) {
      tags.push(quals.hundpruefungsarten.join(', '));
    }
    if (quals.schiessleistungsnadel) {
      const level = quals.schiessleistungsnadel;
      tags.push(`Schießleistungsnadel (${level.charAt(0).toUpperCase() + level.slice(1)})`);
    }
    return tags;
  };

  const currentQualifications = user.profile?.qualifications || {};
  const qualTags = getQualTags(currentQualifications);

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
        {supabaseError && <div className="error-message">{supabaseError}</div>}

        {!isEditingProfile ? (
          <div className="profile-view">
            <div className="profile-subsection">
              <h4>Anrede & Identität</h4>
              <div className="profile-grid">
                <div className="profile-field">
                  <label>Vorname</label>
                  <span>{user.firstName || '—'}</span>
                </div>
                <div className="profile-field">
                  <label>Nachname</label>
                  <span>{user.lastName || '—'}</span>
                </div>
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
                  <label>J. Jagdscheinausstellung</label>
                  <span>{formatYear(user.profile.huntingLicenseDate)}</span>
                </div>
                <div className="profile-field">
                  <label>J. Mitglied Jagdverband</label>
                  <span>{user.profile.mitgliedJagdverbandSeit || '—'}</span>
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
                  <label htmlFor="firstName">Vorname</label>
                  <input type="text" id="firstName" name="firstName" value={profileForm.firstName} onChange={handleProfileChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">Nachname</label>
                  <input type="text" id="lastName" name="lastName" value={profileForm.lastName} onChange={handleProfileChange} />
                </div>
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
                <div className="form-group">
                  <label htmlFor="huntingLicenseYear">J. Jagdscheinausstellung</label>
                  <input
                    type="number"
                    id="huntingLicenseYear"
                    name="huntingLicenseYear"
                    value={profileForm.huntingLicenseYear}
                    onChange={handleProfileChange}
                    min="1900"
                    max="2099"
                    placeholder="z.B. 2010"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="mitgliedJagdverbandSeit">J. Mitglied Jagdverband</label>
                  <input
                    type="number"
                    id="mitgliedJagdverbandSeit"
                    name="mitgliedJagdverbandSeit"
                    value={profileForm.mitgliedJagdverbandSeit}
                    onChange={handleProfileChange}
                    min="1900"
                    max="2099"
                    placeholder="z.B. 2012"
                  />
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
              <button className="save-btn" onClick={handleSaveProfile} disabled={saving}>
                {saving ? 'Speichern...' : 'Speichern'}
              </button>
              <button className="cancel-btn" onClick={handleCancelProfileEdit} disabled={saving}>Abbrechen</button>
            </div>
          </div>
        )}
      </section>

      {/* Qualifikationen — editable by self */}
      <section className="profile-section">
        <div className="section-header">
          <h3>Qualifikationen</h3>
          {!isEditingQualifications && (
            <button className="edit-btn" onClick={() => setIsEditingQualifications(true)}>
              Bearbeiten
            </button>
          )}
        </div>

        {!isEditingQualifications ? (
          <div className="profile-view">
            {qualTags.length === 0 ? (
              <p className="profile-empty">Keine Qualifikationen eingetragen.</p>
            ) : (
              <div className="qual-tags-view">
                {qualTags.map((tag, i) => <span key={i} className="qual-tag">{tag}</span>)}
              </div>
            )}
          </div>
        ) : (
          <div className="qual-edit-form">
            <div className="form-subsection">
              <h4>Qualifikationen</h4>
              <div className="qual-checkboxes">
                {['jagdpaechter','begegnungsscheininhaber','hundefuehrer',
                  'bestaetigterJagdaufseher','fallenlehrgang','jagdhorn','drohnenfuehrerschein'].map(key => (
                  <label key={key} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={!!qualificationsForm[key]}
                      onChange={(e) => handleQualificationChange(key, e.target.checked)}
                    />
                    {qualificationLabels[key]}
                  </label>
                ))}
              </div>
            </div>

            <div className="editor-actions">
              <button className="save-btn" onClick={handleSaveQualifications} disabled={saving}>
                {saving ? 'Speichern...' : 'Speichern'}
              </button>
              <button className="cancel-btn" onClick={handleCancelQualificationsEdit} disabled={saving}>Abbrechen</button>
            </div>
          </div>
        )}
      </section>

      {/* Funktionen — read-only, managed by organizer/admin */}
      <section className="profile-section">
        <div className="section-header">
          <h3>Funktionen</h3>
        </div>
        <p className="profile-managed-hint">Wird durch Organisator oder Administrator verwaltet.</p>
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

      {/* Ehrungen — read-only, managed by organizer/admin */}
      <section className="profile-section">
        <div className="section-header">
          <h3>Ehrungen</h3>
        </div>
        <p className="profile-managed-hint">Wird durch Organisator oder Administrator verwaltet.</p>
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

      {/* Hunde — member can add/delete dogs; Prüfungen are read-only */}
      <section className="profile-section">
        <div className="section-header">
          <h3>Hunde</h3>
        </div>

        {dogs.length === 0 && !dogDeleteConfirm && (
          <p className="profile-empty">Keine Hunde eingetragen.</p>
        )}

        <div className="dogs-list">
          {dogs.map(dog => (
            <div key={dog.id} className="dog-card">
              <div className="dog-card-header">
                <div className="dog-card-title">
                  <strong>{dog.name}</strong>
                  {dog.rasse && <span className="dog-rasse"> · {dog.rasse}</span>}
                  {dog.geburtsjahr && <span className="dog-year"> · Jg. {dog.geburtsjahr}</span>}
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setDogDeleteConfirm(dog.id)}
                  title="Hund entfernen"
                >
                  Entfernen
                </button>
              </div>
              <div className="dog-pruefungen">
                {(dog.pruefungen || []).length === 0
                  ? <span className="no-tags">Keine Prüfungen</span>
                  : (dog.pruefungen || []).map(p => (
                    <span key={p.id} className="pruefung-tag">
                      {p.pruefungsart}{p.datum ? ` (${new Date(p.datum).getFullYear()})` : ''}
                    </span>
                  ))
                }
              </div>
              <p className="profile-managed-hint" style={{ marginTop: '4px', marginBottom: 0 }}>
                Prüfungen werden durch Organisator oder Administrator eingetragen.
              </p>
            </div>
          ))}
        </div>

        <div className="dog-add-form">
          <input
            type="text"
            className="form-input"
            placeholder="Name *"
            value={newDog.name}
            onChange={e => setNewDog(prev => ({ ...prev, name: e.target.value }))}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Rasse"
            value={newDog.rasse}
            onChange={e => setNewDog(prev => ({ ...prev, rasse: e.target.value }))}
          />
          <input
            type="number"
            className="form-input"
            placeholder="Jahrgang"
            min="2000" max="2099"
            value={newDog.geburtsjahr}
            onChange={e => setNewDog(prev => ({ ...prev, geburtsjahr: e.target.value }))}
          />
          <button
            className="btn btn-secondary btn-sm"
            disabled={!newDog.name.trim() || saving}
            onClick={async () => {
              const result = await saveDog(user.id, {
                name: newDog.name.trim(),
                rasse: newDog.rasse.trim() || null,
                geburtsjahr: newDog.geburtsjahr ? parseInt(newDog.geburtsjahr, 10) : null,
              });
              if (result.success) {
                setDogs(prev => [...prev, { ...result.dog, pruefungen: [] }]);
                setNewDog({ name: '', rasse: '', geburtsjahr: '' });
              }
            }}
          >
            + Hund hinzufügen
          </button>
        </div>

        {dogDeleteConfirm && (
          <div className="dialog-overlay" onClick={() => setDogDeleteConfirm(null)}>
            <div className="dialog" onClick={e => e.stopPropagation()}>
              <h3>Hund entfernen?</h3>
              <p>Möchten Sie <strong>{dogs.find(d => d.id === dogDeleteConfirm)?.name}</strong> und alle zugehörigen Prüfungen löschen?</p>
              <div className="dialog-actions">
                <button className="btn btn-secondary" onClick={() => setDogDeleteConfirm(null)}>Abbrechen</button>
                <button className="btn btn-danger" onClick={async () => {
                  const result = await deleteDog(dogDeleteConfirm);
                  if (result.success) {
                    setDogs(prev => prev.filter(d => d.id !== dogDeleteConfirm));
                  }
                  setDogDeleteConfirm(null);
                }}>Löschen</button>
              </div>
            </div>
          </div>
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
