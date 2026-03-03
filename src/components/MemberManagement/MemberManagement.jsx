import { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  orgUnits,
  orgUnitLevels,
  mockMembers,
  qualificationLabels,
  getAncestors,
} from '../../data/mockData';
import './MemberManagement.css';

/**
 * MemberManagement Component
 *
 * Dedicated page (/manage) for organizers/admins to view all users
 * within their OrgUnit scope in one comprehensive table.
 *
 * Features:
 * - Search by name/email
 * - Filter by OrgUnit, active status, qualification
 * - Sortable columns
 * - Derived fields: years with hunting license, years in Hegering, years in LJV
 * - Qualification tags
 * - Click-through detail drawer with extended profile, Funktionen/Ehrungen editors, admin fields
 * - GDPR: sensitive fields only visible within scope
 */

const getOrgUnitById = (id) => orgUnits.find(u => u.id === id);

/** Calculate full years since a given date string */
function calcYears(dateStr) {
  if (!dateStr) return null;
  const start = new Date(dateStr);
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  const monthDiff = now.getMonth() - start.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < start.getDate())) {
    years--;
  }
  return years;
}

/** Get years in Hegering: earliest membership date where orgUnit level is 'hegering' */
function getHegeringYears(member) {
  let earliest = null;
  for (const [orgId, dateStr] of Object.entries(member.membershipDates)) {
    const unit = getOrgUnitById(orgId);
    if (unit && unit.level === 'hegering') {
      if (!earliest || dateStr < earliest) earliest = dateStr;
    }
  }
  return calcYears(earliest);
}

/** Get years in State association (Landesjagdverband) */
function getStateYears(member) {
  let earliest = null;
  for (const [orgId, dateStr] of Object.entries(member.membershipDates)) {
    const unit = getOrgUnitById(orgId);
    if (unit && unit.level === 'state') {
      if (!earliest || dateStr < earliest) earliest = dateStr;
    }
  }
  if (!earliest) {
    for (const orgId of member.orgUnitIds) {
      const ancestors = getAncestors(orgId, orgUnits);
      const stateAncestor = ancestors.find(a => a.level === 'state');
      if (stateAncestor && member.membershipDates[stateAncestor.id]) {
        const dateStr = member.membershipDates[stateAncestor.id];
        if (!earliest || dateStr < earliest) earliest = dateStr;
      }
    }
  }
  return calcYears(earliest);
}

/** Get compact qualification tags for display */
function getQualificationTags(qualifications) {
  const tags = [];
  if (qualifications.jagdpaechter) tags.push('Jagdpächter');
  if (qualifications.begegnungsscheininhaber) tags.push('Begegnungsschein');
  if (qualifications.hundefuehrer) tags.push('Hundeführer');
  if (qualifications.hundpruefungsarten?.length > 0) {
    tags.push(qualifications.hundpruefungsarten.join(', '));
  }
  if (qualifications.bestaetigterJagdaufseher) tags.push('Jagdaufseher');
  if (qualifications.fallenlehrgang) tags.push('Fallenlehrgang');
  if (qualifications.jagdhorn) tags.push('Jagdhorn');
  if (qualifications.drohnenfuehrerschein) tags.push('Drohne');
  if (qualifications.schiessleistungsnadel) {
    const level = qualifications.schiessleistungsnadel;
    tags.push(`Schießnadel (${level.charAt(0).toUpperCase() + level.slice(1)})`);
  }
  return tags;
}

// Qualification keys for filter dropdown (boolean ones only)
const filterableQualifications = [
  'jagdpaechter',
  'begegnungsscheininhaber',
  'hundefuehrer',
  'bestaetigterJagdaufseher',
  'fallenlehrgang',
  'jagdhorn',
  'drohnenfuehrerschein',
];

const formatDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('de-DE'); } catch { return d; }
};

function MemberManagement() {
  const { getManagedScope } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [orgUnitFilter, setOrgUnitFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [qualificationFilter, setQualificationFilter] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [exportMessage, setExportMessage] = useState(null);

  // Detail drawer state
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  // Local edits to member admin fields (keyed by member id)
  const [memberEdits, setMemberEdits] = useState({});

  const managedScope = getManagedScope();
  const managedOrgUnitIds = useMemo(() => managedScope.map(u => u.id), [managedScope]);

  const membersInScope = useMemo(() =>
    mockMembers.filter(member =>
      member.orgUnitIds.some(orgId => managedOrgUnitIds.includes(orgId))
    ),
    [managedOrgUnitIds]
  );

  const filteredMembers = useMemo(() => {
    let result = membersInScope;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(term) ||
        m.email.toLowerCase().includes(term)
      );
    }
    if (orgUnitFilter !== 'all') {
      result = result.filter(m => m.orgUnitIds.includes(orgUnitFilter));
    }
    if (activeFilter === 'active') {
      result = result.filter(m => m.qualifications.aktivMitglied);
    } else if (activeFilter === 'inactive') {
      result = result.filter(m => !m.qualifications.aktivMitglied);
    }
    if (qualificationFilter !== 'all') {
      result = result.filter(m => m.qualifications[qualificationFilter]);
    }
    return result;
  }, [membersInScope, searchTerm, orgUnitFilter, activeFilter, qualificationFilter]);

  const sortedMembers = useMemo(() => {
    const sorted = [...filteredMembers].sort((a, b) => {
      let valA, valB;
      switch (sortField) {
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'jagdschein':
          valA = calcYears(a.firstHuntingLicenseDate) ?? -1;
          valB = calcYears(b.firstHuntingLicenseDate) ?? -1;
          break;
        case 'hegering':
          valA = getHegeringYears(a) ?? -1;
          valB = getHegeringYears(b) ?? -1;
          break;
        case 'ljv':
          valA = getStateYears(a) ?? -1;
          valB = getStateYears(b) ?? -1;
          break;
        case 'aktiv':
          valA = a.qualifications.aktivMitglied ? 1 : 0;
          valB = b.qualifications.aktivMitglied ? 1 : 0;
          break;
        default:
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredMembers, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortIndicator = (field) => {
    if (sortField !== field) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  };

  const handleExportEmails = async () => {
    const emails = sortedMembers.map(m => m.email).join('; ');
    try {
      await navigator.clipboard.writeText(emails);
      setExportMessage(`${sortedMembers.length} E-Mail-Adressen in die Zwischenablage kopiert`);
    } catch {
      const blob = new Blob([emails], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mitglieder-emails.txt';
      a.click();
      URL.revokeObjectURL(url);
      setExportMessage(`${sortedMembers.length} E-Mail-Adressen heruntergeladen`);
    }
    setTimeout(() => setExportMessage(null), 3000);
  };

  // Get effective member data (merge with local edits)
  const getEffectiveMember = (member) => {
    const edits = memberEdits[member.id] || {};
    return { ...member, ...edits };
  };

  const selectedMember = selectedMemberId
    ? getEffectiveMember(membersInScope.find(m => m.id === selectedMemberId))
    : null;

  const handleRowClick = (member) => {
    setSelectedMemberId(member.id);
  };

  const handleCloseDrawer = () => {
    setSelectedMemberId(null);
  };

  // Admin field updates
  const updateMemberEdit = (memberId, field, value) => {
    setMemberEdits(prev => ({
      ...prev,
      [memberId]: { ...prev[memberId], [field]: value },
    }));
  };

  // Funktionen CRUD
  const handleAddFunktion = (memberId) => {
    const current = getEffectiveMember(membersInScope.find(m => m.id === memberId));
    const updated = [...(current.funktionen || []), { funktionsname: '', vonDatum: '', bisDatum: '', orgUnitId: null }];
    updateMemberEdit(memberId, 'funktionen', updated);
  };

  const handleUpdateFunktion = (memberId, index, field, value) => {
    const current = getEffectiveMember(membersInScope.find(m => m.id === memberId));
    const updated = current.funktionen.map((f, i) => i === index ? { ...f, [field]: value } : f);
    updateMemberEdit(memberId, 'funktionen', updated);
  };

  const handleRemoveFunktion = (memberId, index) => {
    const current = getEffectiveMember(membersInScope.find(m => m.id === memberId));
    const updated = current.funktionen.filter((_, i) => i !== index);
    updateMemberEdit(memberId, 'funktionen', updated);
  };

  // Ehrungen CRUD
  const handleAddEhrung = (memberId) => {
    const current = getEffectiveMember(membersInScope.find(m => m.id === memberId));
    const updated = [...(current.ehrungen || []), { ehrungsname: '', datum: '' }];
    updateMemberEdit(memberId, 'ehrungen', updated);
  };

  const handleUpdateEhrung = (memberId, index, field, value) => {
    const current = getEffectiveMember(membersInScope.find(m => m.id === memberId));
    const updated = current.ehrungen.map((e, i) => i === index ? { ...e, [field]: value } : e);
    updateMemberEdit(memberId, 'ehrungen', updated);
  };

  const handleRemoveEhrung = (memberId, index) => {
    const current = getEffectiveMember(membersInScope.find(m => m.id === memberId));
    const updated = current.ehrungen.filter((_, i) => i !== index);
    updateMemberEdit(memberId, 'ehrungen', updated);
  };

  return (
    <div className={`member-mgmt ${selectedMember ? 'has-drawer' : ''}`}>
      <div className="member-mgmt-main">
        <div className="member-mgmt-header">
          <h2>Mitgliederverwaltung</h2>
          <div className="member-mgmt-scope-summary">
            <span className="scope-chip">{managedScope.length} Einheiten</span>
            <span className="scope-chip">{membersInScope.length} Mitglieder</span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="member-mgmt-toolbar">
          <input
            type="text"
            className="member-mgmt-search"
            placeholder="Name oder E-Mail suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select className="member-mgmt-filter" value={orgUnitFilter} onChange={(e) => setOrgUnitFilter(e.target.value)}>
            <option value="all">Alle Einheiten</option>
            {managedScope.map(unit => (
              <option key={unit.id} value={unit.id}>
                {orgUnitLevels[unit.level]?.name}: {unit.name}
              </option>
            ))}
          </select>
          <select className="member-mgmt-filter" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
            <option value="all">Alle Status</option>
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
          </select>
          <select className="member-mgmt-filter" value={qualificationFilter} onChange={(e) => setQualificationFilter(e.target.value)}>
            <option value="all">Alle Qualifikationen</option>
            {filterableQualifications.map(key => (
              <option key={key} value={key}>{qualificationLabels[key]}</option>
            ))}
          </select>
        </div>

        {/* Results count + Export */}
        <div className="member-mgmt-actions-row">
          <div className="member-mgmt-results">
            {filteredMembers.length} von {membersInScope.length} Mitgliedern
          </div>
          <button className="btn-export" onClick={handleExportEmails} disabled={sortedMembers.length === 0}>
            E-Mail-Adressen exportieren ({sortedMembers.length})
          </button>
        </div>
        {exportMessage && <div className="export-message">{exportMessage}</div>}

        {/* Table */}
        <div className="member-mgmt-table-wrapper">
          <table className="member-mgmt-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort('name')}>Name{sortIndicator('name')}</th>
                <th>OrgUnit(s)</th>
                <th>Telefon</th>
                <th>E-Mail</th>
                <th className="sortable" onClick={() => handleSort('aktiv')}>Aktiv{sortIndicator('aktiv')}</th>
                <th className="sortable num" onClick={() => handleSort('jagdschein')}>J. Jagdschein{sortIndicator('jagdschein')}</th>
                <th className="sortable num" onClick={() => handleSort('hegering')}>J. Hegering{sortIndicator('hegering')}</th>
                <th className="sortable num" onClick={() => handleSort('ljv')}>J. LJV{sortIndicator('ljv')}</th>
                <th>Qualifikationen</th>
              </tr>
            </thead>
            <tbody>
              {sortedMembers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="member-mgmt-empty">Keine Mitglieder gefunden.</td>
                </tr>
              ) : (
                sortedMembers.map(member => {
                  const jagdscheinYears = calcYears(member.firstHuntingLicenseDate);
                  const hegeringYears = getHegeringYears(member);
                  const stateYears = getStateYears(member);
                  const tags = getQualificationTags(member.qualifications);
                  const isSelected = selectedMemberId === member.id;

                  return (
                    <tr
                      key={member.id}
                      className={[
                        !member.qualifications.aktivMitglied ? 'inactive-row' : '',
                        isSelected ? 'selected-row' : '',
                        'clickable-row',
                      ].filter(Boolean).join(' ')}
                      onClick={() => handleRowClick(member)}
                    >
                      <td className="col-name">{member.name}</td>
                      <td className="col-orgs">
                        {member.orgUnitIds
                          .filter(orgId => managedOrgUnitIds.includes(orgId))
                          .map(orgId => {
                            const unit = getOrgUnitById(orgId);
                            if (!unit) return null;
                            return (
                              <span key={orgId} className={`org-badge level-${unit.level}`}>{unit.name}</span>
                            );
                          })}
                      </td>
                      <td className="col-phone">{member.profile?.telefonPrivat || '—'}</td>
                      <td className="col-email">{member.email}</td>
                      <td className="col-active">
                        <span className={`status-badge ${member.qualifications.aktivMitglied ? 'active' : 'inactive'}`}>
                          {member.qualifications.aktivMitglied ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </td>
                      <td className="col-num">{jagdscheinYears != null ? jagdscheinYears : '-'}</td>
                      <td className="col-num">{hegeringYears != null ? hegeringYears : '-'}</td>
                      <td className="col-num">{stateYears != null ? stateYears : '-'}</td>
                      <td className="col-tags">
                        {tags.length > 0 ? (
                          tags.map((tag, i) => <span key={i} className="qual-tag">{tag}</span>)
                        ) : (
                          <span className="no-tags">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer */}
      {selectedMember && (
        <MemberDrawer
          member={selectedMember}
          managedOrgUnitIds={managedOrgUnitIds}
          onClose={handleCloseDrawer}
          onUpdateAdmin={(field, value) => updateMemberEdit(selectedMember.id, field, value)}
          onAddFunktion={() => handleAddFunktion(selectedMember.id)}
          onUpdateFunktion={(index, field, value) => handleUpdateFunktion(selectedMember.id, index, field, value)}
          onRemoveFunktion={(index) => handleRemoveFunktion(selectedMember.id, index)}
          onAddEhrung={() => handleAddEhrung(selectedMember.id)}
          onUpdateEhrung={(index, field, value) => handleUpdateEhrung(selectedMember.id, index, field, value)}
          onRemoveEhrung={(index) => handleRemoveEhrung(selectedMember.id, index)}
        />
      )}
    </div>
  );
}

function MemberDrawer({
  member,
  managedOrgUnitIds,
  onClose,
  onUpdateAdmin,
  onAddFunktion,
  onUpdateFunktion,
  onRemoveFunktion,
  onAddEhrung,
  onUpdateEhrung,
  onRemoveEhrung,
}) {
  const p = member.profile || {};
  const jagdscheinYears = calcYears(member.firstHuntingLicenseDate);
  const hegeringYears = getHegeringYears(member);
  const stateYears = getStateYears(member);
  const qualTags = getQualificationTags(member.qualifications);

  const genderLabel = (g) => {
    if (g === 'male') return 'Männlich';
    if (g === 'female') return 'Weiblich';
    if (g === 'other') return 'Divers';
    return '—';
  };

  return (
    <div className="member-drawer">
      <div className="drawer-header">
        <div className="drawer-title">
          <h3>{member.name}</h3>
          {p.anrede && <span className="drawer-subtitle">{p.anrede}{p.titel ? ` ${p.titel}` : ''}</span>}
        </div>
        <button className="drawer-close" onClick={onClose}>✕</button>
      </div>

      <div className="drawer-body">

        {/* Qualifications & Years (pinned at top) */}
        <div className="drawer-section">
          <h4 className="drawer-section-title">Mitgliedschaft & Qualifikationen</h4>
          <div className="drawer-field-grid">
            <div className="drawer-field">
              <label>Jagdschein seit</label>
              <span>{formatDate(member.firstHuntingLicenseDate)}{jagdscheinYears != null ? ` (${jagdscheinYears} J.)` : ''}</span>
            </div>
            <div className="drawer-field">
              <label>Jahre im Hegering</label>
              <span>{hegeringYears != null ? `${hegeringYears} J.` : '—'}</span>
            </div>
            <div className="drawer-field">
              <label>Jahre im LJV</label>
              <span>{stateYears != null ? `${stateYears} J.` : '—'}</span>
            </div>
            <div className="drawer-field">
              <label>Status</label>
              <span className={`status-badge ${member.qualifications.aktivMitglied ? 'active' : 'inactive'}`}>
                {member.qualifications.aktivMitglied ? 'Aktiv' : 'Inaktiv'}
              </span>
            </div>
          </div>
          <div className="drawer-qual-tags">
            {qualTags.length > 0
              ? qualTags.map((tag, i) => <span key={i} className="qual-tag">{tag}</span>)
              : <span className="no-tags">Keine Qualifikationen</span>}
          </div>
        </div>

        {/* Identity */}
        <div className="drawer-section">
          <h4 className="drawer-section-title">Identität</h4>
          <div className="drawer-field-grid">
            <div className="drawer-field">
              <label>Anrede</label><span>{p.anrede || '—'}</span>
            </div>
            <div className="drawer-field">
              <label>Titel</label><span>{p.titel || '—'}</span>
            </div>
            <div className="drawer-field drawer-field--wide">
              <label>Briefanrede</label><span>{p.briefanrede || '—'}</span>
            </div>
            <div className="drawer-field">
              <label>Berufsgruppe</label><span>{p.berufsgruppe || '—'}</span>
            </div>
            <div className="drawer-field">
              <label>Geburtsort</label><span>{p.geburtsort || '—'}</span>
            </div>
            <div className="drawer-field">
              <label>Nationalität</label><span>{p.nationalitaet || '—'}</span>
            </div>
            <div className="drawer-field">
              <label>Geburtsdatum</label><span>{formatDate(p.dateOfBirth)}</span>
            </div>
            <div className="drawer-field">
              <label>Geschlecht</label><span>{genderLabel(p.gender)}</span>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="drawer-section">
          <h4 className="drawer-section-title">Kontakt</h4>
          <div className="drawer-field-grid">
            <div className="drawer-field drawer-field--wide">
              <label>E-Mail</label><span>{member.email}</span>
            </div>
            <div className="drawer-field">
              <label>Telefon Privat</label><span>{p.telefonPrivat || '—'}</span>
            </div>
            <div className="drawer-field">
              <label>Telefon Dienstlich</label><span>{p.telefonDienstlich || '—'}</span>
            </div>
            <div className="drawer-field">
              <label>Handy</label><span>{p.handy || '—'}</span>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="drawer-section">
          <h4 className="drawer-section-title">Adresse</h4>
          <div className="drawer-field-grid">
            <div className="drawer-field drawer-field--wide">
              <label>Straße</label><span>{p.street || '—'}</span>
            </div>
            <div className="drawer-field">
              <label>PLZ / Ort</label><span>{p.postalCode} {p.city}</span>
            </div>
            <div className="drawer-field">
              <label>Land</label><span>{p.land || '—'}</span>
            </div>
            {p.bezirk && (
              <div className="drawer-field">
                <label>Bezirk</label><span>{p.bezirk}</span>
              </div>
            )}
            {p.hasPostalAddress && (
              <div className="drawer-field drawer-field--wide">
                <label>Postanschrift</label>
                <span>{p.postStrasse}, {p.postPlz} {p.postOrt}, {p.postLand}</span>
              </div>
            )}
          </div>
        </div>

        {/* Funktionen Editor */}
        <div className="drawer-section">
          <div className="drawer-section-header">
            <h4 className="drawer-section-title">Funktionen</h4>
            <button className="btn-add-entry" onClick={onAddFunktion}>+ Hinzufügen</button>
          </div>
          {(member.funktionen || []).length === 0 ? (
            <p className="drawer-empty">Keine Funktionen eingetragen.</p>
          ) : (
            <div className="entry-list">
              {(member.funktionen || []).map((f, i) => (
                <div key={i} className="entry-item">
                  <div className="entry-fields">
                    <div className="entry-field">
                      <label>Funktion</label>
                      <input
                        type="text"
                        value={f.funktionsname}
                        onChange={(e) => onUpdateFunktion(i, 'funktionsname', e.target.value)}
                        placeholder="z.B. Hegeringleiter"
                      />
                    </div>
                    <div className="entry-field">
                      <label>Von</label>
                      <input
                        type="date"
                        value={f.vonDatum}
                        onChange={(e) => onUpdateFunktion(i, 'vonDatum', e.target.value)}
                      />
                    </div>
                    <div className="entry-field">
                      <label>Bis (leer = aktuell)</label>
                      <input
                        type="date"
                        value={f.bisDatum}
                        onChange={(e) => onUpdateFunktion(i, 'bisDatum', e.target.value)}
                      />
                    </div>
                    <div className="entry-field">
                      <label>OrgUnit</label>
                      <select
                        value={f.orgUnitId || ''}
                        onChange={(e) => onUpdateFunktion(i, 'orgUnitId', e.target.value || null)}
                      >
                        <option value="">—</option>
                        {orgUnits
                          .filter(u => managedOrgUnitIds.includes(u.id))
                          .map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <button className="btn-remove-entry" onClick={() => onRemoveFunktion(i)} title="Entfernen">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ehrungen Editor */}
        <div className="drawer-section">
          <div className="drawer-section-header">
            <h4 className="drawer-section-title">Ehrungen</h4>
            <button className="btn-add-entry" onClick={onAddEhrung}>+ Hinzufügen</button>
          </div>
          {(member.ehrungen || []).length === 0 ? (
            <p className="drawer-empty">Keine Ehrungen eingetragen.</p>
          ) : (
            <div className="entry-list">
              {(member.ehrungen || []).map((e, i) => (
                <div key={i} className="entry-item">
                  <div className="entry-fields">
                    <div className="entry-field">
                      <label>Ehrung</label>
                      <input
                        type="text"
                        value={e.ehrungsname}
                        onChange={(ev) => onUpdateEhrung(i, 'ehrungsname', ev.target.value)}
                        placeholder="z.B. Goldene Ehrennadel"
                      />
                    </div>
                    <div className="entry-field">
                      <label>Datum</label>
                      <input
                        type="date"
                        value={e.datum}
                        onChange={(ev) => onUpdateEhrung(i, 'datum', ev.target.value)}
                      />
                    </div>
                  </div>
                  <button className="btn-remove-entry" onClick={() => onRemoveEhrung(i)} title="Entfernen">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admin Fields */}
        <div className="drawer-section drawer-section--admin">
          <h4 className="drawer-section-title">Verwaltungsfelder <span className="admin-badge">Admin</span></h4>
          <div className="drawer-field-grid">
            <div className="drawer-field">
              <label>Externe Mitgliedsnummer</label>
              <span className="monospace">{member.externeMitgliedsnummer || '—'}</span>
            </div>
            <div className="drawer-field">
              <label>Externes Mitglied</label>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={member.istExternesMitglied || false}
                  onChange={(e) => onUpdateAdmin('istExternesMitglied', e.target.checked)}
                />
                <span>{member.istExternesMitglied ? 'Ja' : 'Nein'}</span>
              </label>
            </div>
          </div>
          <div className="admin-notes-field">
            <label>Bemerkungen (intern)</label>
            <textarea
              value={member.bemerkungen || ''}
              onChange={(e) => onUpdateAdmin('bemerkungen', e.target.value)}
              placeholder="Interne Notizen (nur für Organisatoren sichtbar)..."
              rows={3}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

export default MemberManagement;
