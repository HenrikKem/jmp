import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { orgUnits as initialOrgUnits, orgUnitLevels } from '../../data/mockData';
import { supabase } from '../../lib/supabaseClient';
import HintButton from '../HintButton/HintButton';
import './AdminArea.css';

const LEVEL_ORDER = ['federal', 'state', 'region', 'district', 'hegering'];

const PARENT_LEVEL = {
  state: 'federal',
  region: 'state',
  district: 'region',
  hegering: 'district',
};

function OrganisationsstrukturPage() {
  const { isAdmin } = useAuth();
  const [units, setUnits] = useState(initialOrgUnits);
  // mode: 'create' | 'edit'
  const [dialogMode, setDialogMode] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', level: 'hegering', parentId: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load org units from Supabase
  useEffect(() => {
    if (!supabase) return;

    supabase
      .from('OrgUnit')
      .select('id, name, level, parentId')
      .then(({ data, error: loadError }) => {
        if (loadError) {
          console.warn('[OrganisationsstrukturPage] load error:', loadError.message);
          return;
        }
        if (data && data.length > 0) {
          setUnits(data.map(row => ({
            id: row.id,
            name: row.name,
            level: row.level ? row.level.toLowerCase() : row.level,
            parentId: row.parentId,
          })));
        }
      });
  }, []);

  if (!isAdmin) return null;

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

  function handleOpenCreate() {
    setForm({ name: '', level: 'hegering', parentId: '' });
    setError('');
    setEditingId(null);
    setDialogMode('create');
  }

  function handleOpenEdit(unit) {
    setForm({
      name: unit.name,
      level: unit.level,
      parentId: unit.parentId || '',
    });
    setError('');
    setEditingId(unit.id);
    setDialogMode('edit');
  }

  function handleCloseDialog() {
    setDialogMode(null);
    setEditingId(null);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) { setError('Name ist erforderlich.'); return; }
    if (dialogMode === 'create' && parentLevel && !form.parentId) {
      setError('Bitte eine übergeordnete Einheit wählen.');
      return;
    }

    setSubmitting(true);

    if (dialogMode === 'create') {
      if (supabase) {
        const { data, error: insertError } = await supabase
          .from('OrgUnit')
          .insert({ name, level: form.level.toUpperCase(), parentId: form.parentId || null })
          .select('id, name, level, parentId')
          .single();

        setSubmitting(false);
        if (insertError) { setError('Fehler: ' + insertError.message); return; }

        setUnits(prev => [...prev, {
          id: data.id,
          name: data.name,
          level: data.level.toLowerCase(),
          parentId: data.parentId,
        }]);
      } else {
        setUnits(prev => [...prev, {
          id: `unit-${Date.now()}`,
          name,
          level: form.level,
          parentId: form.parentId || null,
        }]);
        setSubmitting(false);
      }
    } else {
      // edit mode
      if (supabase) {
        const { error: updateError } = await supabase
          .from('OrgUnit')
          .update({ name })
          .eq('id', editingId);

        setSubmitting(false);
        if (updateError) { setError('Fehler: ' + updateError.message); return; }
      } else {
        setSubmitting(false);
      }

      setUnits(prev => prev.map(u =>
        u.id === editingId ? { ...u, name } : u
      ));
    }

    handleCloseDialog();
  }

  const showDialog = dialogMode !== null;

  return (
    <div className="admin-area">
      <div className="admin-header">
        <h2>Organisationsstruktur</h2>
        <HintButton title="Ebenen-Hierarchie">
          <p>Die Organisationsstruktur ist hierarchisch aufgebaut:</p>
          <ul>
            <li><strong>Bundesverband</strong> (oberste Ebene)</li>
            <li><strong>Landesverband</strong></li>
            <li><strong>Region</strong></li>
            <li><strong>Kreis</strong></li>
            <li><strong>Hegering</strong> (unterste Ebene)</li>
          </ul>
          <p>Jede Einheit (ausser Bundesverband) muss einer übergeordneten Einheit zugeordnet sein.</p>
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
            <h3>Organisationsstruktur</h3>
            <button className="btn btn-primary btn-sm" onClick={handleOpenCreate}>+ Neue Einheit</button>
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
                      <button
                        className="edit-icon"
                        title="Bearbeiten"
                        onClick={() => handleOpenEdit(unit)}
                      >
                        &#9999;&#65039;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {showDialog && (
            <div className="modal-backdrop" onClick={handleCloseDialog}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>{dialogMode === 'create' ? 'Neue Einheit' : 'Einheit bearbeiten'}</h3>
                  <button className="close-btn" onClick={handleCloseDialog}>&#10005;</button>
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
                    {dialogMode === 'create' && (
                      <>
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
                              <p className="field-hint">Keine Einheiten auf Ebene "{orgUnitLevels[parentLevel]?.name}" vorhanden.</p>
                            ) : (
                              <select
                                className="form-select"
                                value={form.parentId}
                                onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}
                              >
                                <option value="">Bitte wählen ...</option>
                                {parentOptions.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    {dialogMode === 'edit' && (
                      <p className="field-hint">
                        Ebene und übergeordnete Einheit können nach der Erstellung nicht geändert werden.
                      </p>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={handleCloseDialog} disabled={submitting}>
                      Abbrechen
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting ? 'Wird gespeichert...' : dialogMode === 'create' ? 'Einheit anlegen' : 'Speichern'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrganisationsstrukturPage;
