const express = require('express');
const { body, param, validationResult } = require('express-validator');
const pool   = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const VALID_LEVELS = ['federal', 'state', 'region', 'district', 'hegering'];


// ── GET /api/org-units ───────────────────────────────────────
// Returns all org units (any authenticated user – needed for dropdowns)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, level, parent_id, created_at FROM org_units ORDER BY level, name'
    );
    return res.json(rows);
  } catch (err) { next(err); }
});


// ── GET /api/org-units/:id/descendants ───────────────────────
router.get('/:id/descendants', requireAuth, [
  param('id').isUUID(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { rows } = await pool.query(
      'SELECT * FROM get_org_descendants($1)',
      [req.params.id]
    );
    return res.json(rows.map(r => r.id));
  } catch (err) { next(err); }
});


// ── POST /api/org-units (admin) ───────────────────────────────
router.post('/', requireAuth, requireAdmin, [
  body('name').trim().notEmpty(),
  body('level').isIn(VALID_LEVELS),
  body('parent_id').optional({ nullable: true }).isUUID(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, level, parent_id } = req.body;

    // Federal units have no parent; everything else must have one
    if (level !== 'federal' && !parent_id) {
      return res.status(400).json({ error: 'parent_id is required for non-federal units' });
    }

    const { rows } = await pool.query(
      'INSERT INTO org_units (name, level, parent_id) VALUES ($1, $2, $3) RETURNING *',
      [name, level, parent_id || null]
    );
    return res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});


// ── PUT /api/org-units/:id (admin) ────────────────────────────
router.put('/:id', requireAuth, requireAdmin, [
  param('id').isUUID(),
  body('name').trim().notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { rows } = await pool.query(
      'UPDATE org_units SET name = $1 WHERE id = $2 RETURNING *',
      [req.body.name, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    return res.json(rows[0]);
  } catch (err) { next(err); }
});


// ── DELETE /api/org-units/:id (admin) ────────────────────────
router.delete('/:id', requireAuth, requireAdmin, [
  param('id').isUUID(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { rows } = await pool.query(
      'DELETE FROM org_units WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    return res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
