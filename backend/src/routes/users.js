const express = require('express');
const bcrypt  = require('bcrypt');
const { body, param, validationResult } = require('express-validator');
const pool   = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const SALT_ROUNDS = 12;
const router = express.Router();

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Returns the list of org_unit_ids managed by req.user (as organizer + descendants). */
async function getManagedOrgUnitIds(userId) {
  const { rows } = await pool.query(
    `SELECT DISTINCT d.id
     FROM user_org_units uou
     CROSS JOIN LATERAL get_org_descendants(uou.org_unit_id) AS d
     WHERE uou.user_id = $1 AND uou.role = 'organizer'`,
    [userId]
  );
  return rows.map(r => r.id);
}


// ── GET /api/users ────────────────────────────────────────────
// Admin: all users. Organizer: users within managed scope.
router.get('/', requireAuth, async (req, res, next) => {
  try {
    let rows;
    if (req.user.is_admin) {
      ({ rows } = await pool.query(
        `SELECT u.id, u.email, u.name, u.is_admin, u.is_active, u.created_at,
                json_agg(json_build_object('org_unit_id', uou.org_unit_id, 'role', uou.role)) FILTER (WHERE uou.user_id IS NOT NULL) AS memberships
         FROM users u
         LEFT JOIN user_org_units uou ON uou.user_id = u.id
         GROUP BY u.id
         ORDER BY u.name`
      ));
    } else {
      const scopeIds = await getManagedOrgUnitIds(req.user.id);
      if (!scopeIds.length) return res.json([]);

      ({ rows } = await pool.query(
        `SELECT DISTINCT u.id, u.email, u.name, u.is_admin, u.is_active, u.created_at,
                json_agg(json_build_object('org_unit_id', uou.org_unit_id, 'role', uou.role)) AS memberships
         FROM users u
         JOIN user_org_units uou ON uou.user_id = u.id
         WHERE uou.org_unit_id = ANY($1::uuid[])
         GROUP BY u.id
         ORDER BY u.name`,
        [scopeIds]
      ));
    }
    return res.json(rows);
  } catch (err) { next(err); }
});


// ── GET /api/users/:id ────────────────────────────────────────
router.get('/:id', requireAuth, [param('id').isUUID()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const targetId = req.params.id;
    const isSelf   = req.user.id === targetId;

    if (!isSelf && !req.user.is_admin) {
      // Organizer scope check
      const scopeIds = await getManagedOrgUnitIds(req.user.id);
      const { rows: check } = await pool.query(
        'SELECT 1 FROM user_org_units WHERE user_id = $1 AND org_unit_id = ANY($2::uuid[]) LIMIT 1',
        [targetId, scopeIds]
      );
      if (!check.length) return res.status(403).json({ error: 'Forbidden', code: 'NO_PERMISSION' });
    }

    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.name, u.is_admin, u.is_active, u.created_at,
              json_agg(json_build_object('org_unit_id', uou.org_unit_id, 'role', uou.role, 'org_unit_name', ou.name))
                FILTER (WHERE uou.user_id IS NOT NULL) AS memberships
       FROM users u
       LEFT JOIN user_org_units uou ON uou.user_id = u.id
       LEFT JOIN org_units ou ON ou.id = uou.org_unit_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [targetId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    return res.json(rows[0]);
  } catch (err) { next(err); }
});


// ── POST /api/users (admin) ───────────────────────────────────
// Create a new user (admin-only; user sets own details later)
router.post('/', requireAuth, requireAdmin, [
  body('name').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password } = req.body;
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name, is_admin, is_active, created_at',
      [name, email, password_hash]
    );
    const user = rows[0];

    // Create an empty profile row
    await pool.query('INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id]);

    return res.status(201).json(user);
  } catch (err) { next(err); }
});


// ── GET /api/users/:id/profile ────────────────────────────────
router.get('/:id/profile', requireAuth, [param('id').isUUID()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const targetId = req.params.id;
    const isSelf   = req.user.id === targetId;

    if (!isSelf && !req.user.is_admin) {
      const scopeIds = await getManagedOrgUnitIds(req.user.id);
      const { rows: check } = await pool.query(
        'SELECT 1 FROM user_org_units WHERE user_id = $1 AND org_unit_id = ANY($2::uuid[]) LIMIT 1',
        [targetId, scopeIds]
      );
      if (!check.length) return res.status(403).json({ error: 'Forbidden', code: 'NO_PERMISSION' });
    }

    const { rows } = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [targetId]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    // Organizers / members (non-admin) can't see admin-only fields
    const profile = rows[0];
    if (!req.user.is_admin && !isSelf) {
      delete profile.externe_mitgliedsnummer;
      delete profile.bemerkungen;
    }

    return res.json(profile);
  } catch (err) { next(err); }
});


// ── PUT /api/users/:id/profile ────────────────────────────────
router.put('/:id/profile', requireAuth, [param('id').isUUID()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const targetId = req.params.id;
    const isSelf   = req.user.id === targetId;

    if (!isSelf && !req.user.is_admin) {
      const scopeIds = await getManagedOrgUnitIds(req.user.id);
      const { rows: check } = await pool.query(
        'SELECT 1 FROM user_org_units WHERE user_id = $1 AND org_unit_id = ANY($2::uuid[]) LIMIT 1',
        [targetId, scopeIds]
      );
      if (!check.length) return res.status(403).json({ error: 'Forbidden', code: 'NO_PERMISSION' });
    }

    // Allowed fields per role
    const allowedAll = [
      'anrede','titel','geschlecht','briefanrede','berufsgruppe',
      'geburtsort','geburtsdatum','nationalitaet',
      'telefon_privat','telefon_dienstlich','telefon_handy',
      'strasse','hausnummer','plz','ort','land',
      'postfach_strasse','postfach_plz','postfach_ort',
      'jaegereichennummer','erste_waffenbesitzkarte',
      'jaegerpruefung_datum','hunting_license_date',
      'qualifications',
    ];
    const adminOnly = ['externe_mitgliedsnummer', 'bemerkungen'];
    const fields = req.user.is_admin ? [...allowedAll, ...adminOnly] : allowedAll;

    const updates = {};
    for (const f of fields) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'No valid fields provided' });
    }

    const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values     = [targetId, ...Object.values(updates)];

    const { rows } = await pool.query(
      `INSERT INTO user_profiles (user_id, ${Object.keys(updates).join(', ')})
       VALUES ($1, ${Object.keys(updates).map((_, i) => `$${i + 2}`).join(', ')})
       ON CONFLICT (user_id) DO UPDATE SET ${setClauses}, updated_at = NOW()
       RETURNING *`,
      values
    );
    return res.json(rows[0]);
  } catch (err) { next(err); }
});


// ── GET /api/users/:id/functions ─────────────────────────────
router.get('/:id/functions', requireAuth, [param('id').isUUID()], async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM user_functions WHERE user_id = $1 ORDER BY von DESC',
      [req.params.id]
    );
    return res.json(rows);
  } catch (err) { next(err); }
});

// ── POST /api/users/:id/functions ────────────────────────────
router.post('/:id/functions', requireAuth, [param('id').isUUID()], async (req, res, next) => {
  try {
    const { funktion, org_unit_name, von, bis } = req.body;
    if (!funktion) return res.status(400).json({ error: 'funktion is required' });

    const { rows } = await pool.query(
      'INSERT INTO user_functions (user_id, funktion, org_unit_name, von, bis) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.params.id, funktion, org_unit_name || null, von || null, bis || null]
    );
    return res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// ── DELETE /api/users/:id/functions/:fid ─────────────────────
router.delete('/:id/functions/:fid', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM user_functions WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.fid, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    return res.status(204).send();
  } catch (err) { next(err); }
});


// ── GET /api/users/:id/awards ─────────────────────────────────
router.get('/:id/awards', requireAuth, [param('id').isUUID()], async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM user_awards WHERE user_id = $1 ORDER BY datum DESC',
      [req.params.id]
    );
    return res.json(rows);
  } catch (err) { next(err); }
});

// ── POST /api/users/:id/awards ────────────────────────────────
router.post('/:id/awards', requireAuth, [param('id').isUUID()], async (req, res, next) => {
  try {
    const { bezeichnung, datum } = req.body;
    if (!bezeichnung) return res.status(400).json({ error: 'bezeichnung is required' });

    const { rows } = await pool.query(
      'INSERT INTO user_awards (user_id, bezeichnung, datum) VALUES ($1,$2,$3) RETURNING *',
      [req.params.id, bezeichnung, datum || null]
    );
    return res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// ── DELETE /api/users/:id/awards/:aid ────────────────────────
router.delete('/:id/awards/:aid', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM user_awards WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.aid, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    return res.status(204).send();
  } catch (err) { next(err); }
});


// ── DELETE /api/users/:id  (GDPR anonymize – admin) ──────────
router.delete('/:id', requireAuth, requireAdmin, [param('id').isUUID()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    await pool.query('SELECT anonymize_user($1)', [req.params.id]);
    return res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
