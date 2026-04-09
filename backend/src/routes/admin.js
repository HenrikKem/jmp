const express = require('express');
const { param, query, validationResult } = require('express-validator');
const pool   = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes in this file require admin


// ── GET /api/admin/audit-logs ────────────────────────────────
router.get('/audit-logs', requireAuth, requireAdmin, [
  query('entity_type').optional().isString(),
  query('actor_id').optional().isUUID(),
  query('limit').optional().isInt({ min: 1, max: 500 }),
  query('offset').optional().isInt({ min: 0 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { entity_type, actor_id } = req.query;
    const limit  = parseInt(req.query.limit  || '100');
    const offset = parseInt(req.query.offset || '0');

    const conditions = [];
    const values     = [];

    if (entity_type) { conditions.push(`entity_type = $${values.length + 1}`); values.push(entity_type); }
    if (actor_id)    { conditions.push(`actor_id = $${values.length + 1}`);    values.push(actor_id);    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    values.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT al.*, u.name AS actor_name
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_id
       ${where}
       ORDER BY al.timestamp DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );
    return res.json(rows);
  } catch (err) { next(err); }
});


// ── GET /api/admin/users/:id/export (GDPR Art. 15) ───────────
router.get('/users/:id/export', requireAuth, requireAdmin, [param('id').isUUID()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { rows } = await pool.query('SELECT export_user_data($1) AS data', [req.params.id]);
    if (!rows.length || !rows[0].data) return res.status(404).json({ error: 'Not found' });
    return res.json(rows[0].data);
  } catch (err) { next(err); }
});


// ── POST /api/admin/users/:id/anonymize (GDPR Art. 17) ───────
router.post('/users/:id/anonymize', requireAuth, requireAdmin, [param('id').isUUID()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    await pool.query('SELECT anonymize_user($1)', [req.params.id]);
    return res.status(204).send();
  } catch (err) { next(err); }
});


// ── PATCH /api/admin/users/:id/role ──────────────────────────
// Assign or remove admin flag
router.patch('/users/:id/role', requireAuth, requireAdmin, [param('id').isUUID()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { is_admin } = req.body;
    if (typeof is_admin !== 'boolean') return res.status(400).json({ error: 'is_admin (boolean) is required' });

    const { rows } = await pool.query(
      'UPDATE users SET is_admin = $1 WHERE id = $2 RETURNING id, email, name, is_admin',
      [is_admin, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    return res.json(rows[0]);
  } catch (err) { next(err); }
});


// ── POST /api/admin/users/:id/memberships ────────────────────
// Add org unit membership
router.post('/users/:id/memberships', requireAuth, requireAdmin, [param('id').isUUID()], async (req, res, next) => {
  try {
    const { org_unit_id, role } = req.body;
    if (!org_unit_id || !['member','organizer'].includes(role)) {
      return res.status(400).json({ error: 'org_unit_id and role (member|organizer) are required' });
    }

    const { rows } = await pool.query(
      `INSERT INTO user_org_units (user_id, org_unit_id, role)
       VALUES ($1,$2,$3)
       ON CONFLICT (user_id, org_unit_id) DO UPDATE SET role = EXCLUDED.role
       RETURNING *`,
      [req.params.id, org_unit_id, role]
    );
    return res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});


// ── DELETE /api/admin/users/:id/memberships/:oid ─────────────
router.delete('/users/:id/memberships/:oid', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM user_org_units WHERE user_id = $1 AND org_unit_id = $2 RETURNING id',
      [req.params.id, req.params.oid]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    return res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
