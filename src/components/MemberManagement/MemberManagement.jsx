import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  orgUnitLevels,
  qualificationLabels,
} from '../../data/mockData';
import { supabase } from '../../lib/supabaseClient';
import { useSupabaseProfile } from '../../hooks/useSupabaseProfile';
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

// getOrgUnitById is defined inside MemberManagement using orgUnits from useAuth()

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

// ─── 3-step Member Add Wizard ───────────────────────────────────────────────

function MemberAddWizard({ allMembers, managedScope, managedOrgUnitIds, onAdd, onClose }) {
  const { orgUnits } = useAuth();
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [orgUnitId, setOrgUnitId] = useState(managedScope[0]?.id || '');
  const [role, setRole] = useState('member');

  const availableMembers = allMembers.filter(m =>
    !m.orgUnitIds.some(id => managedOrgUnitIds.includes(id)) &&
    (m.name.toLowerCase().includes(search.toLowerCase()) ||
     m.email.toLowerCase().includes(search.toLowerCase()))
  );

  const handleConfirm = () => {
    if (!selectedMember || !orgUnitId) return;
    onAdd(selectedMember, orgUnitId, role);
    onClose();
  };

  const getOrgUnitById = (id) => orgUnits.find(u => u.id === id);
  const selectedOrg = getOrgUnitById(orgUnitId);

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog dialog--wizard" onClick={e => e.stopPropagation()}>

        <div className="member-wizard-steps">
          {['Mitglied suchen', 'OrgUnit & Rolle', 'Bestätigen'].map((label, i) => (
            <div key={i} className={`mwiz-step ${step === i + 1 ? 'active' : ''} ${step > i + 1 ? 'done' : ''}`}>
              <div className="mwiz-dot">{step > i + 1 ? '✓' : i + 1}</div>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="dialog-step-body">
            <h3>Mitglied suchen</h3>
            <input
              className="form-input"
              type="search"
              placeholder="Name oder E-Mail..."
              value={search}
              onChange={e => { setSearch(e.target.value); setSelectedMember(null); }}
              autoFocus
            />
            <div className="mwiz-member-list">
              {availableMembers.length === 0 && (
                <p className="mwiz-empty">
                  {search ? 'Kein Mitglied gefunden.' : 'Alle Mitglieder sind bereits im Scope.'}
                </p>
              )}
              {availableMembers.map(m => (
                <button
                  key={m.id}
                  className={`mwiz-member-item ${selectedMember?.id === m.id ? 'selected' : ''}`}
                  onClick={() => setSelectedMember(m)}
                >
                  <span className="mwiz-member-name">{m.name}</span>
                  <span className="mwiz-member-email">{m.email}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="dialog-step-body">
            <h3>OrgUnit & Rolle</h3>
            <div className="form-group">
              <label className="form-label">Organisationseinheit *</label>
              <select
                className="form-select"
                value={orgUnitId}
                onChange={e => setOrgUnitId(e.target.value)}
              >
                <option value="">-- Bitte wählen --</option>
                {managedScope.map(unit => (
                  <option key={unit.id} value={unit.id}>
                    {orgUnitLevels[unit.level]?.name}: {unit.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Rolle</label>
              <select
                className="form-select"
                value={role}
                onChange={e => setRole(e.target.value)}
              >
                <option value="member">Mitglied</option>
                <option value="organizer">Organisator</option>
              </select>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="dialog-step-body">
            <h3>Bestätigen</h3>
            <div className="mwiz-confirm-card">
              <div className="mwiz-confirm-field">
                <label>Mitglied</label>
                <span className="mwiz-confirm-name">{selectedMember?.name}</span>
                <span className="mwiz-confirm-email">{selectedMember?.email}</span>
              </div>
              <div className="mwiz-confirm-field">
                <label>Organisationseinheit</label>
                <span>{selectedOrg ? `${orgUnitLevels[selectedOrg.level]?.name}: ${selectedOrg.name}` : '—'}</span>
              </div>
              <div className="mwiz-confirm-field">
                <label>Rolle</label>
                <span>{role === 'organizer' ? 'Organisator' : 'Mitglied'}</span>
              </div>
            </div>
          </div>
        )}

        <div className="dialog-actions dialog-actions--wizard">
          <div>
            {step > 1 && (
              <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>
                ← Zurück
              </button>
            )}
          </div>
          <div className="dialog-actions-right">
            <button className="btn btn-secondary" onClick={onClose}>Abbrechen</button>
            {step < 3 ? (
              <button
                className="btn btn-primary"
                onClick={() => setStep(s => s + 1)}
                disabled={step === 1 && !selectedMember}
              >
                Weiter →
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleConfirm}
                disabled={!orgUnitId}
              >
                Hinzufügen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MemberManagement ─────────────────────────────────────────────────────────

function MemberManagement() {
  const { getManagedScope, orgUnits } = useAuth();
  const getOrgUnitById = (id) => orgUnits.find(u => u.id === id);
  const {
    loadProfile,
    saveProfile,
    saveFunktionen,
    saveEhrungen,
    loadDogs,
    saveDog,
    deleteDog,
    savePruefung,
    deletePruefung,
    saving,
    loading: supabaseLoading,
    error: supabaseError,
    clearError,
  } = useSupabaseProfile();

  const [searchTerm, setSearchTerm] = useState('');
  const [orgUnitFilter, setOrgUnitFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [qualificationFilter, setQualificationFilter] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [exportMessage, setExportMessage] = useState(null);
  const [drawerSaveMessage, setDrawerSaveMessage] = useState(null);

  // Detail drawer state
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  // Local edits to member admin fields (keyed by member id)
  const [memberEdits, setMemberEdits] = useState({});
  // Dogs state keyed by memberId
  const [memberDogs, setMemberDogs] = useState({});
  const [dogDeleteConfirm, setDogDeleteConfirm] = useState(null);

  // Members loaded from Supabase
  const [dbMembers, setDbMembers] = useState([]);

  // All users (for MemberAddWizard search)
  const [allMembers, setAllMembers] = useState([]);
  const [showMemberWizard, setShowMemberWizard] = useState(false);
  const [removeMemberConfirm, setRemoveMemberConfirm] = useState(null);

  const managedScope = getManagedScope();
  const managedOrgUnitIds = useMemo(() => managedScope.map(u => u.id), [managedScope]);

  // Load members from Supabase
  useEffect(() => {
    if (!supabase || managedOrgUnitIds.length === 0) return;

    async function loadMembers() {
      // 1. Get user IDs in managed scope
      const { data: memberships, error: membError } = await supabase
        .from('UserOrgUnit')
        .select('userId, orgUnitId')
        .in('orgUnitId', managedOrgUnitIds);

      if (membError) {
        console.warn('[MemberManagement] memberships error:', membError.message);
        return;
      }

      const userIds = [...new Set((memberships || []).map(m => m.userId))];
      if (userIds.length === 0) return;

      // 2. Load users + profiles in parallel
      const [usersRes, profilesRes] = await Promise.all([
        supabase.from('User').select('id, firstName, lastName, email, isActive').in('id', userIds),
        supabase.from('UserProfile').select('*').in('userId', userIds),
      ]);

      const profileMap = {};
      for (const p of (profilesRes.data || [])) {
        profileMap[p.userId] = p;
      }

      const orgIdsByUser = {};
      for (const m of (memberships || [])) {
        if (!orgIdsByUser[m.userId]) orgIdsByUser[m.userId] = [];
        orgIdsByUser[m.userId].push(m.orgUnitId);
      }

      const mapped = (usersRes.data || []).map(u => {
        const p = profileMap[u.id] || {};
        const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email?.split('@')[0] || '';
        return {
          id: u.id,
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          name: fullName,
          email: u.email,
          orgUnitIds: orgIdsByUser[u.id] || [],
          membershipDates: {},
          firstHuntingLicenseDate: p.huntingLicenseDate || null,
          profile: {
            anrede: p.anrede || '',
            titel: p.titel || '',
            briefanrede: p.briefanrede || '',
            berufsgruppe: p.berufsgruppe || '',
            geburtsort: p.geburtsort || '',
            nationalitaet: p.nationalitaet || '',
            telefonPrivat: p.telefonPrivat || '',
            telefonDienstlich: p.telefonDienstlich || '',
            handy: p.telefonHandy || '',
            street: p.strasse || '',
            postalCode: p.plz || '',
            city: p.ort || '',
            land: p.land || '',
            bezirk: p.bezirk || '',
            hasPostalAddress: false,
            postStrasse: p.postfachStrasse || '',
            postPlz: p.postfachPlz || '',
            postOrt: p.postfachOrt || '',
            postLand: '',
            dateOfBirth: p.geburtsdatum || '',
            gender: p.geschlecht || '',
            huntingLicenseDate: p.huntingLicenseDate || null,
            mitgliedJagdverbandSeit: p.mitgliedJagdverbandSeit || null,
          },
          qualifications: {
            aktivMitglied: u.isActive,
            jagdpaechter: p.qualifications?.jagdpaechter || false,
            begegnungsscheininhaber: p.qualifications?.begegnungsscheininhaber || false,
            hundefuehrer: p.qualifications?.hundefuehrer || false,
            bestaetigterJagdaufseher: p.qualifications?.bestaetigterJagdaufseher || false,
            fallenlehrgang: p.qualifications?.fallenlehrgang || false,
            jagdhorn: p.qualifications?.jagdhorn || false,
            drohnenfuehrerschein: p.qualifications?.drohnenfuehrerschein || false,
            hundpruefungsarten: p.qualifications?.hundpruefungsarten || [],
            schiessleistungsnadel: p.qualifications?.schiessleistungsnadel || '',
          },
          funktionen: [],
          ehrungen: [],
          externeMitgliedsnummer: p.externeMitgliedsnummer || '',
          bemerkungen: p.bemerkungen || '',
          istExternesMitglied: p.istExternesMitglied || false,
        };
      });

      setDbMembers(mapped);
    }

    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managedOrgUnitIds.join(',')]);

  // Load all users (not just scope) for MemberAddWizard
  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('UserOrgUnit')
      .select('userId, orgUnitId, role, User(id, firstName, lastName, email)')
      .then(({ data, error }) => {
        if (error) {
          console.warn('[MemberManagement] allMembers load error:', error.message);
          return;
        }
        const byUser = {};
        for (const row of (data || [])) {
          if (!row.User) continue;
          const userId = row.userId;
          const u = row.User;
          const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email?.split('@')[0] || '';
          if (!byUser[userId]) {
            byUser[userId] = { id: u.id, name: fullName, email: u.email, orgUnitIds: [] };
          }
          byUser[userId].orgUnitIds.push(row.orgUnitId);
        }
        setAllMembers(Object.values(byUser));
      });
  }, []);

  const membersInScope = useMemo(() =>
    dbMembers.filter(member =>
      member.orgUnitIds.some(orgId => managedOrgUnitIds.includes(orgId))
    ),
    [dbMembers, managedOrgUnitIds]
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

  // Qualifications update
  const handleUpdateQualification = (memberId, key, value) => {
    const current = getEffectiveMember(membersInScope.find(m => m.id === memberId));
    updateMemberEdit(memberId, 'qualifications', { ...current.qualifications, [key]: value });
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

  // Load member profile from Supabase when drawer opens
  useEffect(() => {
    if (!selectedMemberId) return;
    let cancelled = false;
    clearError();
    setDrawerSaveMessage(null);

    async function fetchMember() {
      const [result, dogs] = await Promise.all([
        loadProfile(selectedMemberId),
        loadDogs(selectedMemberId),
      ]);
      if (cancelled) return;
      if (result) {
        const edits = {};
        if (result.profile) {
          const profileMerge = {};
          for (const [key, val] of Object.entries(result.profile)) {
            if (val !== null && val !== undefined) {
              profileMerge[key] = val;
            }
          }
          if (Object.keys(profileMerge).length > 0) {
            edits.profile = {
              ...(membersInScope.find(m => m.id === selectedMemberId)?.profile || {}),
              ...profileMerge,
            };
          }
        }
        if (result.funktionen && result.funktionen.length > 0) {
          edits.funktionen = result.funktionen;
        }
        if (result.ehrungen && result.ehrungen.length > 0) {
          edits.ehrungen = result.ehrungen;
        }
        if (Object.keys(edits).length > 0) {
          setMemberEdits(prev => ({
            ...prev,
            [selectedMemberId]: { ...prev[selectedMemberId], ...edits },
          }));
        }
      }
      setMemberDogs(prev => ({ ...prev, [selectedMemberId]: dogs || [] }));
    }

    fetchMember();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMemberId]);

  // Add member to a managed org unit
  const handleAddMemberConfirm = async (member, orgUnitId, role) => {
    if (supabase) {
      const { error } = await supabase
        .from('UserOrgUnit')
        .upsert(
          { userId: member.id, orgUnitId: orgUnitId, role },
          { onConflict: 'userId,orgUnitId' }
        );
      if (error) {
        console.warn('[MemberManagement] add member error:', error.message);
        return;
      }
    }
    setDbMembers(prev => {
      const existing = prev.find(m => m.id === member.id);
      if (existing) {
        if (!existing.orgUnitIds.includes(orgUnitId)) {
          return prev.map(m => m.id === member.id
            ? { ...m, orgUnitIds: [...m.orgUnitIds, orgUnitId] }
            : m
          );
        }
        return prev;
      }
      return [...prev, {
        id: member.id,
        firstName: member.firstName || '',
        lastName: member.lastName || '',
        name: member.name,
        email: member.email,
        orgUnitIds: [orgUnitId],
        membershipDates: {},
        firstHuntingLicenseDate: null,
        profile: {},
        qualifications: {
          aktivMitglied: true,
          jagdpaechter: false,
          begegnungsscheininhaber: false,
          hundefuehrer: false,
          bestaetigterJagdaufseher: false,
          fallenlehrgang: false,
          jagdhorn: false,
          drohnenfuehrerschein: false,
          hundpruefungsarten: [],
          schiessleistungsnadel: '',
        },
        funktionen: [],
        ehrungen: [],
        externeMitgliedsnummer: '',
        bemerkungen: '',
        istExternesMitglied: false,
      }];
    });
  };

  // Remove member from a managed org unit
  const handleRemoveMemberFromOrg = async (memberId, orgUnitId) => {
    if (supabase) {
      const { error } = await supabase
        .from('UserOrgUnit')
        .delete()
        .eq('userId', memberId)
        .eq('orgUnitId', orgUnitId);
      if (error) {
        console.warn('[MemberManagement] remove member error:', error.message);
        setRemoveMemberConfirm(null);
        return;
      }
    }
    setDbMembers(prev => prev.map(m =>
      m.id === memberId
        ? { ...m, orgUnitIds: m.orgUnitIds.filter(id => id !== orgUnitId) }
        : m
    ));
    setRemoveMemberConfirm(null);
  };

  // Dog handlers
  const handleAddDog = useCallback(async (memberId, dogData) => {
    const result = await saveDog(memberId, dogData);
    if (result.success) {
      setMemberDogs(prev => ({
        ...prev,
        [memberId]: [...(prev[memberId] || []), { ...result.dog, pruefungen: [] }],
      }));
    }
  }, [saveDog]);

  const handleDeleteDog = useCallback(async (memberId, dogId) => {
    const result = await deleteDog(dogId);
    if (result.success) {
      setMemberDogs(prev => ({
        ...prev,
        [memberId]: (prev[memberId] || []).filter(d => d.id !== dogId),
      }));
    }
    setDogDeleteConfirm(null);
  }, [deleteDog]);

  const handleAddPruefung = useCallback(async (memberId, dogId, pruefungData) => {
    const result = await savePruefung(dogId, pruefungData);
    if (result.success) {
      setMemberDogs(prev => ({
        ...prev,
        [memberId]: (prev[memberId] || []).map(d =>
          d.id === dogId
            ? { ...d, pruefungen: [...(d.pruefungen || []), result.pruefung] }
            : d
        ),
      }));
    }
  }, [savePruefung]);

  const handleDeletePruefung = useCallback(async (memberId, dogId, pruefungId) => {
    const result = await deletePruefung(pruefungId);
    if (result.success) {
      setMemberDogs(prev => ({
        ...prev,
        [memberId]: (prev[memberId] || []).map(d =>
          d.id === dogId
            ? { ...d, pruefungen: (d.pruefungen || []).filter(p => p.id !== pruefungId) }
            : d
        ),
      }));
    }
  }, [deletePruefung]);

  // Save all drawer changes for a member to Supabase
  const handleSaveMember = useCallback(async (memberId) => {
    const member = getEffectiveMember(membersInScope.find(m => m.id === memberId));
    if (!member) return;

    setDrawerSaveMessage(null);
    clearError();

    const profileData = member.profile || {};
    const results = await Promise.all([
      saveProfile(memberId, {
        ...profileData,
        qualifications: member.qualifications || {},
        bemerkungen: member.bemerkungen,
        externeMitgliedsnummer: member.externeMitgliedsnummer,
      }),
      saveFunktionen(memberId, member.funktionen || []),
      saveEhrungen(memberId, member.ehrungen || []),
    ]);

    const allSuccess = results.every(r => r.success);
    if (allSuccess) {
      setDrawerSaveMessage('Mitgliederdaten gespeichert');
    } else {
      const failedOps = results.filter(r => !r.success).map(r => r.error).join('; ');
      setDrawerSaveMessage(`Lokal aktualisiert (DB-Fehler: ${failedOps})`);
    }
    setTimeout(() => setDrawerSaveMessage(null), 4000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membersInScope, memberEdits]);

  return (
    <div className={`member-mgmt ${selectedMember ? 'has-drawer' : ''}`}>
      <div className="member-mgmt-main">
        <div className="member-mgmt-header">
          <h2>Mitgliederverwaltung</h2>
          <div className="member-mgmt-header-right">
            <div className="member-mgmt-scope-summary">
              <span className="scope-chip">{managedScope.length} Einheiten</span>
              <span className="scope-chip">{membersInScope.length} Mitglieder</span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowMemberWizard(true)}>
              + Mitglied hinzufügen
            </button>
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
                <th>Qualifikationen</th>
              </tr>
            </thead>
            <tbody>
              {sortedMembers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="member-mgmt-empty">Keine Mitglieder gefunden.</td>
                </tr>
              ) : (
                sortedMembers.map(member => {
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
                              <span key={orgId} className="org-badge-removable">
                                {unit.name}
                                <button
                                  className="org-badge-remove-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRemoveMemberConfirm({ member, orgUnitId: orgId, orgName: unit.name });
                                  }}
                                  title="Aus dieser Einheit entfernen"
                                >
                                  ×
                                </button>
                              </span>
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

      {/* Member Add Wizard */}
      {showMemberWizard && (
        <MemberAddWizard
          allMembers={allMembers}
          managedScope={managedScope}
          managedOrgUnitIds={managedOrgUnitIds}
          onAdd={handleAddMemberConfirm}
          onClose={() => setShowMemberWizard(false)}
        />
      )}

      {/* Remove Member Confirmation */}
      {removeMemberConfirm && (
        <div className="dialog-overlay" onClick={() => setRemoveMemberConfirm(null)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <h3>Mitglied entfernen?</h3>
            <p>
              Möchten Sie <strong>{removeMemberConfirm.member.name}</strong> aus{' '}
              <strong>{removeMemberConfirm.orgName}</strong> entfernen?
            </p>
            {removeMemberConfirm.member.orgUnitIds.filter(id => managedOrgUnitIds.includes(id)).length === 1 && (
              <p className="warning-text">
                Hinweis: Dies ist die einzige verwaltete Organisationseinheit des Mitglieds.
              </p>
            )}
            <div className="dialog-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setRemoveMemberConfirm(null)}
              >
                Abbrechen
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleRemoveMemberFromOrg(
                  removeMemberConfirm.member.id,
                  removeMemberConfirm.orgUnitId
                )}
              >
                Entfernen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dog Delete Confirmation */}
      {dogDeleteConfirm && (
        <div className="dialog-overlay" onClick={() => setDogDeleteConfirm(null)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <h3>Hund löschen?</h3>
            <p>Möchten Sie <strong>{dogDeleteConfirm.dogName}</strong> und alle zugehörigen Prüfungen löschen?</p>
            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={() => setDogDeleteConfirm(null)}>Abbrechen</button>
              <button className="btn btn-danger" onClick={() => handleDeleteDog(dogDeleteConfirm.memberId, dogDeleteConfirm.dogId)}>Löschen</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {selectedMember && (
        <MemberDrawer
          member={selectedMember}
          managedOrgUnitIds={managedOrgUnitIds}
          orgUnits={orgUnits}
          onClose={handleCloseDrawer}
          onUpdateAdmin={(field, value) => updateMemberEdit(selectedMember.id, field, value)}
          onAddFunktion={() => handleAddFunktion(selectedMember.id)}
          onUpdateFunktion={(index, field, value) => handleUpdateFunktion(selectedMember.id, index, field, value)}
          onRemoveFunktion={(index) => handleRemoveFunktion(selectedMember.id, index)}
          onAddEhrung={() => handleAddEhrung(selectedMember.id)}
          onUpdateEhrung={(index, field, value) => handleUpdateEhrung(selectedMember.id, index, field, value)}
          onRemoveEhrung={(index) => handleRemoveEhrung(selectedMember.id, index)}
          onUpdateQualification={(key, value) => handleUpdateQualification(selectedMember.id, key, value)}
          onSave={() => handleSaveMember(selectedMember.id)}
          saving={saving}
          loading={supabaseLoading}
          saveMessage={drawerSaveMessage}
          saveError={supabaseError}
          dogs={memberDogs[selectedMember.id] || []}
          onAddDog={(dogData) => handleAddDog(selectedMember.id, dogData)}
          onDeleteDog={(dogId) => setDogDeleteConfirm({ memberId: selectedMember.id, dogId, dogName: (memberDogs[selectedMember.id] || []).find(d => d.id === dogId)?.name || '' })}
          onAddPruefung={(dogId, pruefungData) => handleAddPruefung(selectedMember.id, dogId, pruefungData)}
          onDeletePruefung={(dogId, pruefungId) => handleDeletePruefung(selectedMember.id, dogId, pruefungId)}
        />
      )}
    </div>
  );
}

const PRUEFUNGSARTEN = ['VJP', 'HZP', 'VGP', 'VSwP', 'Btr', 'Sw/K', 'Spur/F'];

function MemberDrawer({
  member,
  managedOrgUnitIds,
  orgUnits,
  onClose,
  onUpdateAdmin,
  onAddFunktion,
  onUpdateFunktion,
  onRemoveFunktion,
  onAddEhrung,
  onUpdateEhrung,
  onRemoveEhrung,
  onUpdateQualification,
  onSave,
  saving,
  loading,
  saveMessage,
  saveError,
  dogs,
  onAddDog,
  onDeleteDog,
  onAddPruefung,
  onDeletePruefung,
}) {
  const p = member.profile || {};
  const jagdscheinYears = calcYears(member.firstHuntingLicenseDate);
  const qualTags = getQualificationTags(member.qualifications);

  const [newDog, setNewDog] = useState({ name: '', rasse: '', geburtsjahr: '' });
  const [newPruefungen, setNewPruefungen] = useState({});

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
              <span>{formatDate(member.profile?.huntingLicenseDate || member.firstHuntingLicenseDate)}{jagdscheinYears != null ? ` (${jagdscheinYears} J.)` : ''}</span>
            </div>
            <div className="drawer-field">
              <label>Jahre im Jagdverband</label>
              <span>{member.profile?.mitgliedJagdverbandSeit ? `seit ${member.profile.mitgliedJagdverbandSeit}` : '—'}</span>
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
            <div className="drawer-field">
              <label>J. Jagdscheinausstellung</label>
              <input
                type="number"
                className="drawer-inline-input"
                value={p.huntingLicenseDate ? String(new Date(p.huntingLicenseDate).getFullYear()) : ''}
                onChange={(e) => {
                  const year = e.target.value;
                  const dateVal = year ? `${year}-01-01` : null;
                  onUpdateAdmin('profile', { ...p, huntingLicenseDate: dateVal });
                }}
                min="1900" max="2099"
                placeholder="z.B. 2010"
              />
            </div>
            <div className="drawer-field">
              <label>J. Mitglied Jagdverband</label>
              <input
                type="number"
                className="drawer-inline-input"
                value={p.mitgliedJagdverbandSeit || ''}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value, 10) : null;
                  onUpdateAdmin('profile', { ...p, mitgliedJagdverbandSeit: val });
                }}
                min="1900" max="2099"
                placeholder="z.B. 2012"
              />
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

        {/* Qualifikationen Editor */}
        <div className="drawer-section">
          <h4 className="drawer-section-title">Qualifikationen bearbeiten</h4>
          <div className="drawer-qual-edit">
            <div className="drawer-qual-group">
              {['jagdpaechter','begegnungsscheininhaber','hundefuehrer',
                'bestaetigterJagdaufseher','fallenlehrgang','jagdhorn','drohnenfuehrerschein'].map(key => (
                <label key={key} className="drawer-qual-check">
                  <input
                    type="checkbox"
                    checked={!!member.qualifications?.[key]}
                    onChange={(e) => onUpdateQualification(key, e.target.checked)}
                  />
                  {qualificationLabels[key]}
                </label>
              ))}
            </div>
            <div className="drawer-qual-subgroup">
              <span className="drawer-qual-sublabel">Schießleistungsnadel:</span>
              <select
                className="drawer-inline-select"
                value={member.qualifications?.schiessleistungsnadel || ''}
                onChange={(e) => onUpdateQualification('schiessleistungsnadel', e.target.value)}
              >
                <option value="">— Keine —</option>
                <option value="bronze">Bronze</option>
                <option value="silber">Silber</option>
                <option value="gold">Gold</option>
              </select>
            </div>
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

        {/* Hunde */}
        <div className="drawer-section">
          <h4 className="drawer-section-title">Hunde</h4>

          {dogs.length === 0 && <p className="drawer-empty">Keine Hunde eingetragen.</p>}

          {dogs.map(dog => (
            <div key={dog.id} className="dog-card">
              <div className="dog-card-header">
                <div className="dog-card-title">
                  <strong>{dog.name}</strong>
                  {dog.rasse && <span className="dog-rasse"> · {dog.rasse}</span>}
                  {dog.geburtsjahr && <span className="dog-year"> · Jg. {dog.geburtsjahr}</span>}
                </div>
                <button className="btn-remove-entry" onClick={() => onDeleteDog(dog.id)} title="Hund löschen">✕</button>
              </div>

              <div className="dog-pruefungen">
                {(dog.pruefungen || []).length === 0
                  ? <span className="no-tags">Keine Prüfungen</span>
                  : (dog.pruefungen || []).map(p => (
                    <span key={p.id} className="pruefung-tag">
                      {p.pruefungsart}{p.datum ? ` (${new Date(p.datum).getFullYear()})` : ''}
                      <button
                        className="pruefung-remove"
                        onClick={() => onDeletePruefung(dog.id, p.id)}
                        title="Prüfung entfernen"
                      >×</button>
                    </span>
                  ))
                }
              </div>

              <div className="dog-add-pruefung">
                <select
                  className="form-select form-select--sm"
                  value={newPruefungen[dog.id]?.pruefungsart || ''}
                  onChange={e => setNewPruefungen(prev => ({ ...prev, [dog.id]: { ...prev[dog.id], pruefungsart: e.target.value } }))}
                >
                  <option value="">Prüfung wählen...</option>
                  {PRUEFUNGSARTEN.map(art => <option key={art} value={art}>{art}</option>)}
                </select>
                <input
                  type="number"
                  className="drawer-inline-input"
                  placeholder="Jahr"
                  min="1900" max="2099"
                  value={newPruefungen[dog.id]?.datumYear || ''}
                  onChange={e => setNewPruefungen(prev => ({ ...prev, [dog.id]: { ...prev[dog.id], datumYear: e.target.value } }))}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={!newPruefungen[dog.id]?.pruefungsart}
                  onClick={() => {
                    const entry = newPruefungen[dog.id] || {};
                    const datum = entry.datumYear ? `${entry.datumYear}-01-01` : null;
                    onAddPruefung(dog.id, { pruefungsart: entry.pruefungsart, datum });
                    setNewPruefungen(prev => ({ ...prev, [dog.id]: { pruefungsart: '', datumYear: '' } }));
                  }}
                >
                  + Prüfung
                </button>
              </div>
            </div>
          ))}

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
              className="drawer-inline-input"
              placeholder="Jg."
              min="2000" max="2099"
              value={newDog.geburtsjahr}
              onChange={e => setNewDog(prev => ({ ...prev, geburtsjahr: e.target.value }))}
            />
            <button
              className="btn btn-secondary btn-sm"
              disabled={!newDog.name.trim()}
              onClick={() => {
                onAddDog({
                  name: newDog.name.trim(),
                  rasse: newDog.rasse.trim() || null,
                  geburtsjahr: newDog.geburtsjahr ? parseInt(newDog.geburtsjahr, 10) : null,
                });
                setNewDog({ name: '', rasse: '', geburtsjahr: '' });
              }}
            >
              + Hund hinzufügen
            </button>
          </div>
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

        {/* Save button + status */}
        <div className="drawer-section drawer-save-section">
          {saveMessage && <div className="drawer-save-message">{saveMessage}</div>}
          {saveError && <div className="drawer-save-error">{saveError}</div>}
          <button
            className="btn-save-drawer"
            onClick={onSave}
            disabled={saving || loading}
          >
            {saving ? 'Speichern...' : 'Alle Änderungen speichern'}
          </button>
        </div>

      </div>
    </div>
  );
}

export default MemberManagement;
