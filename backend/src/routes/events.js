const express = require('express');
const { body, param, validationResult } = require('express-validator');
const pool   = require('../db/pool');
const { requireAuth, requireOrganizer } = require('../middleware/auth');

const router = express.Router();


// ── Helpers ───────────────────────────────────────────────────

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

async function canManageEvent(userId, isAdmin, eventId) {
  if (isAdmin) return true;
  const managed = await getManagedOrgUnitIds(userId);
  const { rows } = await pool.query(
    'SELECT scope_org_id FROM events WHERE id = $1',
    [eventId]
  );
  if (!rows.length) return false;
  return managed.includes(rows[0].scope_org_id);
}


// ── GET /api/events ──────────────────────────────────────────
// Returns events visible to the current user.
router.get('/', requireAuth, async (req, res, next) => {
  try {
    let rows;
    if (req.user.is_admin) {
      ({ rows } = await pool.query(
        `SELECT e.*, ou.name AS scope_org_name, ou.level AS scope_org_level
         FROM events e
         JOIN org_units ou ON ou.id = e.scope_org_id
         ORDER BY e.start_date DESC`
      ));
    } else {
      // User can see published events where they are a member of scope org or any descendant
      ({ rows } = await pool.query(
        `SELECT e.*, ou.name AS scope_org_name, ou.level AS scope_org_level
         FROM events e
         JOIN org_units ou ON ou.id = e.scope_org_id
         WHERE e.is_published = TRUE
           AND user_can_access_event($1, e.id)
         ORDER BY e.start_date DESC`,
        [req.user.id]
      ));
    }
    return res.json(rows);
  } catch (err) { next(err); }
});


// ── GET /api/events/manage ───────────────────────────────────
// Events the current user can manage (organizer scope).
router.get('/manage', requireAuth, requireOrganizer, async (req, res, next) => {
  try {
    let rows;
    if (req.user.is_admin) {
      ({ rows } = await pool.query(
        `SELECT e.*, ou.name AS scope_org_name, ou.level AS scope_org_level
         FROM events e
         JOIN org_units ou ON ou.id = e.scope_org_id
         ORDER BY e.start_date DESC`
      ));
    } else {
      const managed = await getManagedOrgUnitIds(req.user.id);
      if (!managed.length) return res.json([]);
      ({ rows } = await pool.query(
        `SELECT e.*, ou.name AS scope_org_name, ou.level AS scope_org_level
         FROM events e
         JOIN org_units ou ON ou.id = e.scope_org_id
         WHERE e.scope_org_id = ANY($1::uuid[])
         ORDER BY e.start_date DESC`,
        [managed]
      ));
    }
    return res.json(rows);
  } catch (err) { next(err); }
});


// ── GET /api/events/:id ──────────────────────────────────────
router.get('/:id', requireAuth, [param('id').isUUID()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { rows } = await pool.query(
      `SELECT e.*, ou.name AS scope_org_name, ou.level AS scope_org_level
       FROM events e
       JOIN org_units ou ON ou.id = e.scope_org_id
       WHERE e.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    const event = rows[0];
    // Visibility: must have access unless admin or organizer managing this scope
    if (!req.user.is_admin) {
      const canAccess = await pool.query(
        'SELECT user_can_access_event($1, $2) AS ok',
        [req.user.id, event.id]
      );
      const canManage = await canManageEvent(req.user.id, false, event.id);
      if (!canAccess.rows[0].ok && !canManage) {
        return res.status(403).json({ error: 'Forbidden', code: 'NO_PERMISSION' });
      }
    }

    // Attach groups and roles
    const [{ rows: groups }, { rows: roles }] = await Promise.all([
      pool.query(
        `SELECT g.*,
                COUNT(r.id) FILTER (WHERE r.status = 'confirmed') AS registered_count
         FROM groups g
         LEFT JOIN registrations r ON r.group_id = g.id
         WHERE g.event_id = $1
         GROUP BY g.id
         ORDER BY g.start_time, g.name`,
        [event.id]
      ),
      pool.query(
        `SELECT er.*, u.name AS assigned_user_name
         FROM event_roles er
         LEFT JOIN user_event_roles uer ON uer.event_role_id = er.id
         LEFT JOIN users u ON u.id = uer.user_id
         WHERE er.event_id = $1`,
        [event.id]
      ),
    ]);

    return res.json({ ...event, groups, roles });
  } catch (err) { next(err); }
});


// ── POST /api/events ─────────────────────────────────────────
router.post('/', requireAuth, requireOrganizer, [
  body('name').trim().notEmpty(),
  body('location').trim().notEmpty(),
  body('start_date').isISO8601(),
  body('end_date').isISO8601(),
  body('scope_org_id').isUUID(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, description, location, start_date, end_date, scope_org_id, is_published } = req.body;

    // Scope check: organizer must manage the scope org unit
    const canManage = await pool.query(
      'SELECT user_can_manage_org($1, $2) AS ok',
      [req.user.id, scope_org_id]
    );
    if (!canManage.rows[0].ok) {
      return res.status(403).json({ error: 'Forbidden', code: 'NO_PERMISSION' });
    }

    const { rows } = await pool.query(
      `INSERT INTO events (name, description, location, start_date, end_date, scope_org_id, created_by, is_published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, description || null, location, start_date, end_date, scope_org_id, req.user.id, is_published ?? false]
    );
    return res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});


// ── PUT /api/events/:id ──────────────────────────────────────
router.put('/:id', requireAuth, requireOrganizer, [param('id').isUUID()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const ok = await canManageEvent(req.user.id, req.user.is_admin, req.params.id);
    if (!ok) return res.status(403).json({ error: 'Forbidden', code: 'NO_PERMISSION' });

    const { name, description, location, start_date, end_date, is_published } = req.body;
    const { rows } = await pool.query(
      `UPDATE events SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         location = COALESCE($3, location),
         start_date = COALESCE($4, start_date),
         end_date = COALESCE($5, end_date),
         is_published = COALESCE($6, is_published)
       WHERE id = $7 RETURNING *`,
      [name, description, location, start_date, end_date, is_published, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    return res.json(rows[0]);
  } catch (err) { next(err); }
});


// ── DELETE /api/events/:id ───────────────────────────────────
router.delete('/:id', requireAuth, requireOrganizer, [param('id').isUUID()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const ok = await canManageEvent(req.user.id, req.user.is_admin, req.params.id);
    if (!ok) return res.status(403).json({ error: 'Forbidden', code: 'NO_PERMISSION' });

    // Cascade: registrations and event_roles are ON DELETE CASCADE
    const { rows } = await pool.query('DELETE FROM events WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    return res.status(204).send();
  } catch (err) { next(err); }
});


// ── GET /api/events/:id/groups ───────────────────────────────
router.get('/:id/groups', requireAuth, [param('id').isUUID()], async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT g.*,
              COUNT(r.id) FILTER (WHERE r.status = 'confirmed') AS registered_count
       FROM groups g
       LEFT JOIN registrations r ON r.group_id = g.id
       WHERE g.event_id = $1
       GROUP BY g.id
       ORDER BY g.start_time, g.name`,
      [req.params.id]
    );
    return res.json(rows);
  } catch (err) { next(err); }
});


// ── POST /api/events/:id/groups ──────────────────────────────
router.post('/:id/groups', requireAuth, requireOrganizer, [
  param('id').isUUID(),
  body('name').trim().notEmpty(),
  body('capacity').isInt({ min: 1 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const ok = await canManageEvent(req.user.id, req.user.is_admin, req.params.id);
    if (!ok) return res.status(403).json({ error: 'Forbidden', code: 'NO_PERMISSION' });

    const { name, capacity, start_time } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO groups (event_id, name, capacity, start_time) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.id, name, capacity, start_time || null]
    );
    return res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});


// ── PUT /api/events/:id/groups/:gid ─────────────────────────
router.put('/:id/groups/:gid', requireAuth, requireOrganizer, async (req, res, next) => {
  try {
    const ok = await canManageEvent(req.user.id, req.user.is_admin, req.params.id);
    if (!ok) return res.status(403).json({ error: 'Forbidden', code: 'NO_PERMISSION' });

    const { name, capacity, start_time } = req.body;

    // Capacity cannot go below current confirmed registrations
    if (capacity !== undefined) {
      const { rows: countRows } = await pool.query(
        "SELECT COUNT(*) AS cnt FROM registrations WHERE group_id = $1 AND status = 'confirmed'",
        [req.params.gid]
      );
      if (parseInt(countRows[0].cnt) > capacity) {
        return res.status(409).json({ error: 'Capacity cannot be less than current registrations', code: 'CAPACITY_TOO_LOW' });
      }
    }

    const { rows } = await pool.query(
      `UPDATE groups SET
         name = COALESCE($1, name),
         capacity = COALESCE($2, capacity),
         start_time = COALESCE($3, start_time)
       WHERE id = $4 AND event_id = $5 RETURNING *`,
      [name, capacity, start_time, req.params.gid, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    return res.json(rows[0]);
  } catch (err) { next(err); }
});


// ── DELETE /api/events/:id/groups/:gid ──────────────────────
router.delete('/:id/groups/:gid', requireAuth, requireOrganizer, async (req, res, next) => {
  try {
    const ok = await canManageEvent(req.user.id, req.user.is_admin, req.params.id);
    if (!ok) return res.status(403).json({ error: 'Forbidden', code: 'NO_PERMISSION' });

    // Reject if group has confirmed registrations
    const { rows: countRows } = await pool.query(
      "SELECT COUNT(*) AS cnt FROM registrations WHERE group_id = $1 AND status = 'confirmed'",
      [req.params.gid]
    );
    if (parseInt(countRows[0].cnt) > 0) {
      return res.status(409).json({ error: 'Cannot delete group with active registrations', code: 'HAS_REGISTRATIONS' });
    }

    const { rows } = await pool.query(
      'DELETE FROM groups WHERE id = $1 AND event_id = $2 RETURNING id',
      [req.params.gid, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    return res.status(204).send();
  } catch (err) { next(err); }
});


// ── GET /api/events/:id/roles ────────────────────────────────
router.get('/:id/roles', requireAuth, [param('id').isUUID()], async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT er.*,
              json_agg(json_build_object('user_id', uer.user_id, 'user_name', u.name, 'assignment_id', uer.id))
                FILTER (WHERE uer.user_id IS NOT NULL) AS assignments
       FROM event_roles er
       LEFT JOIN user_event_roles uer ON uer.event_role_id = er.id
       LEFT JOIN users u ON u.id = uer.user_id
       WHERE er.event_id = $1
       GROUP BY er.id
       ORDER BY er.name`,
      [req.params.id]
    );
    return res.json(rows);
  } catch (err) { next(err); }
});


// ── POST /api/events/:id/roles ───────────────────────────────
router.post('/:id/roles', requireAuth, requireOrganizer, [
  param('id').isUUID(),
  body('name').trim().notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const ok = await canManageEvent(req.user.id, req.user.is_admin, req.params.id);
    if (!ok) return res.status(403).json({ error: 'Forbidden', code: 'NO_PERMISSION' });

    const { name, description } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO event_roles (event_id, name, description) VALUES ($1,$2,$3) RETURNING *',
      [req.params.id, name, description || null]
    );
    return res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});


// ── POST /api/events/:id/roles/:rid/assignments ───────────────
router.post('/:id/roles/:rid/assignments', requireAuth, requireOrganizer, async (req, res, next) => {
  try {
    const ok = await canManageEvent(req.user.id, req.user.is_admin, req.params.id);
    if (!ok) return res.status(403).json({ error: 'Forbidden', code: 'NO_PERMISSION' });

    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    const { rows } = await pool.query(
      `INSERT INTO user_event_roles (user_id, event_role_id, assigned_by)
       VALUES ($1,$2,$3)
       ON CONFLICT (user_id, event_role_id) DO NOTHING
       RETURNING *`,
      [user_id, req.params.rid, req.user.id]
    );
    return res.status(201).json(rows[0] || { message: 'Already assigned' });
  } catch (err) { next(err); }
});


// ── DELETE /api/events/:id/roles/:rid/assignments/:uid ────────
router.delete('/:id/roles/:rid/assignments/:uid', requireAuth, requireOrganizer, async (req, res, next) => {
  try {
    const ok = await canManageEvent(req.user.id, req.user.is_admin, req.params.id);
    if (!ok) return res.status(403).json({ error: 'Forbidden', code: 'NO_PERMISSION' });

    const { rows } = await pool.query(
      'DELETE FROM user_event_roles WHERE user_id = $1 AND event_role_id = $2 RETURNING id',
      [req.params.uid, req.params.rid]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    return res.status(204).send();
  } catch (err) { next(err); }
});


// ── DELETE /api/events/:id/roles/:rid ────────────────────────
router.delete('/:id/roles/:rid', requireAuth, requireOrganizer, async (req, res, next) => {
  try {
    const ok = await canManageEvent(req.user.id, req.user.is_admin, req.params.id);
    if (!ok) return res.status(403).json({ error: 'Forbidden', code: 'NO_PERMISSION' });

    const { rows } = await pool.query(
      'DELETE FROM event_roles WHERE id = $1 AND event_id = $2 RETURNING id',
      [req.params.rid, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    return res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
