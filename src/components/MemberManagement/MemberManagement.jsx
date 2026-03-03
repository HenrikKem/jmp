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
      if (!earliest || dateStr < earliest) {
        earliest = dateStr;
      }
    }
  }
  return calcYears(earliest);
}

/** Get years in State association (Landesjagdverband): find state-level ancestor membership */
function getStateYears(member) {
  let earliest = null;
  // Check direct state membership dates
  for (const [orgId, dateStr] of Object.entries(member.membershipDates)) {
    const unit = getOrgUnitById(orgId);
    if (unit && unit.level === 'state') {
      if (!earliest || dateStr < earliest) {
        earliest = dateStr;
      }
    }
  }
  // Also check via ancestry of member's OrgUnits
  if (!earliest) {
    for (const orgId of member.orgUnitIds) {
      const ancestors = getAncestors(orgId, orgUnits);
      const stateAncestor = ancestors.find(a => a.level === 'state');
      if (stateAncestor && member.membershipDates[stateAncestor.id]) {
        const dateStr = member.membershipDates[stateAncestor.id];
        if (!earliest || dateStr < earliest) {
          earliest = dateStr;
        }
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

function MemberManagement() {
  const { getManagedScope } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [orgUnitFilter, setOrgUnitFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [qualificationFilter, setQualificationFilter] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [exportMessage, setExportMessage] = useState(null);

  const managedScope = getManagedScope();
  const managedOrgUnitIds = useMemo(() => managedScope.map(u => u.id), [managedScope]);

  // Members within scope
  const membersInScope = useMemo(() =>
    mockMembers.filter(member =>
      member.orgUnitIds.some(orgId => managedOrgUnitIds.includes(orgId))
    ),
    [managedOrgUnitIds]
  );

  // Apply filters
  const filteredMembers = useMemo(() => {
    let result = membersInScope;

    // Search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(term) ||
        m.email.toLowerCase().includes(term)
      );
    }

    // OrgUnit filter
    if (orgUnitFilter !== 'all') {
      result = result.filter(m => m.orgUnitIds.includes(orgUnitFilter));
    }

    // Active status filter
    if (activeFilter === 'active') {
      result = result.filter(m => m.qualifications.aktivMitglied);
    } else if (activeFilter === 'inactive') {
      result = result.filter(m => !m.qualifications.aktivMitglied);
    }

    // Qualification filter
    if (qualificationFilter !== 'all') {
      result = result.filter(m => m.qualifications[qualificationFilter]);
    }

    return result;
  }, [membersInScope, searchTerm, orgUnitFilter, activeFilter, qualificationFilter]);

  // Apply sorting
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
    return sortDir === 'asc' ? ' \u25B2' : ' \u25BC';
  };

  const handleExportEmails = async () => {
    const emails = sortedMembers.map(m => m.email).join('; ');
    try {
      await navigator.clipboard.writeText(emails);
      setExportMessage(`${sortedMembers.length} E-Mail-Adressen in die Zwischenablage kopiert`);
    } catch {
      // Fallback: download as text file
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

  return (
    <div className="member-mgmt">
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

        <select
          className="member-mgmt-filter"
          value={orgUnitFilter}
          onChange={(e) => setOrgUnitFilter(e.target.value)}
        >
          <option value="all">Alle Einheiten</option>
          {managedScope.map(unit => (
            <option key={unit.id} value={unit.id}>
              {orgUnitLevels[unit.level]?.name}: {unit.name}
            </option>
          ))}
        </select>

        <select
          className="member-mgmt-filter"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
        >
          <option value="all">Alle Status</option>
          <option value="active">Aktiv</option>
          <option value="inactive">Inaktiv</option>
        </select>

        <select
          className="member-mgmt-filter"
          value={qualificationFilter}
          onChange={(e) => setQualificationFilter(e.target.value)}
        >
          <option value="all">Alle Qualifikationen</option>
          {filterableQualifications.map(key => (
            <option key={key} value={key}>
              {qualificationLabels[key]}
            </option>
          ))}
        </select>
      </div>

      {/* Results count + Export */}
      <div className="member-mgmt-actions-row">
        <div className="member-mgmt-results">
          {filteredMembers.length} von {membersInScope.length} Mitgliedern
        </div>
        <button
          className="btn-export"
          onClick={handleExportEmails}
          disabled={sortedMembers.length === 0}
        >
          E-Mail-Adressen exportieren ({sortedMembers.length})
        </button>
      </div>
      {exportMessage && (
        <div className="export-message">{exportMessage}</div>
      )}

      {/* Table */}
      <div className="member-mgmt-table-wrapper">
        <table className="member-mgmt-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => handleSort('name')}>
                Name{sortIndicator('name')}
              </th>
              <th>OrgUnit(s)</th>
              <th>Telefon</th>
              <th>E-Mail</th>
              <th className="sortable" onClick={() => handleSort('aktiv')}>
                Aktiv{sortIndicator('aktiv')}
              </th>
              <th className="sortable num" onClick={() => handleSort('jagdschein')}>
                J. Jagdschein{sortIndicator('jagdschein')}
              </th>
              <th className="sortable num" onClick={() => handleSort('hegering')}>
                J. Hegering{sortIndicator('hegering')}
              </th>
              <th className="sortable num" onClick={() => handleSort('ljv')}>
                J. LJV{sortIndicator('ljv')}
              </th>
              <th>Qualifikationen</th>
            </tr>
          </thead>
          <tbody>
            {sortedMembers.length === 0 ? (
              <tr>
                <td colSpan="9" className="member-mgmt-empty">
                  Keine Mitglieder gefunden.
                </td>
              </tr>
            ) : (
              sortedMembers.map(member => {
                const jagdscheinYears = calcYears(member.firstHuntingLicenseDate);
                const hegeringYears = getHegeringYears(member);
                const stateYears = getStateYears(member);
                const tags = getQualificationTags(member.qualifications);

                return (
                  <tr key={member.id} className={!member.qualifications.aktivMitglied ? 'inactive-row' : ''}>
                    <td className="col-name">{member.name}</td>
                    <td className="col-orgs">
                      {member.orgUnitIds
                        .filter(orgId => managedOrgUnitIds.includes(orgId))
                        .map(orgId => {
                          const unit = getOrgUnitById(orgId);
                          if (!unit) return null;
                          return (
                            <span key={orgId} className={`org-badge level-${unit.level}`}>
                              {unit.name}
                            </span>
                          );
                        })}
                    </td>
                    <td className="col-phone">{member.phone}</td>
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
                        tags.map((tag, i) => (
                          <span key={i} className="qual-tag">{tag}</span>
                        ))
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
  );
}

export default MemberManagement;
