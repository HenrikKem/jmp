const express = require('express');
const { body, validationResult } = require('express-validator');
const pool   = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();


// ── GET /api/registrations ───────────────────────────────────
// Returns current user's own registrations.
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, e.name AS event_name, e.start_date, g.name AS group_name
       FROM registrations r
       JOIN events e ON e.id = r.event_id
       LEFT JOIN groups g ON g.id = r.group_id
       WHERE r.user_id = $1
       ORDER BY e.start_date DESC`,
      [req.user.id]
    );
    return res.json(rows);
  } catch (err) { next(err); }
});


// ── POST /api/registrations ──────────────────────────────────
// Register current user for an event + group.
router.post('/', requireAuth, [
  body('event_id').isUUID(),
  body('group_id').isUUID(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { event_id, group_id } = req.body;

    // Scope check: user must have access to this event
    const { rows: access } = await pool.query(
      'SELECT user_can_access_event($1, $2) AS ok',
      [req.user.id, event_id]
    );
    if (!access[0].ok) {
      return res.status(403).json({ error: 'Forbidden', code: 'NO_PERMISSION' });
    }

    // Event must be published
    const { rows: eventRows } = await pool.query(
      'SELECT is_published FROM events WHERE id = $1',
      [event_id]
    );
    if (!eventRows.length) return res.status(404).json({ error: 'Event not found' });
    if (!eventRows[0].is_published) {
      return res.status(410).json({ error: 'Event is not open for registration', code: 'EVENT_CLOSED' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL app.current_user_id = $1", [req.user.id]);
      await client.query("SET LOCAL app.client_ip = $1", [req.ip]);

      const result = await client.query(
        'SELECT register_for_event($1, $2, $3) AS registration_id',
        [req.user.id, event_id, group_id]
      );
      await client.query('COMMIT');

      const regId = result.rows[0].registration_id;
      const { rows } = await pool.query(
        `SELECT r.*, e.name AS event_name, g.name AS group_name
         FROM registrations r
         JOIN events e ON e.id = r.event_id
         LEFT JOIN groups g ON g.id = r.group_id
         WHERE r.id = $1`,
        [regId]
      );
      return res.status(201).json(rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) { next(err); }
});


// ── DELETE /api/registrations/:id ────────────────────────────
// Cancel own registration (or organizer/admin cancels any).
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    // Fetch registration
    const { rows } = await pool.query('SELECT * FROM registrations WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    const reg = rows[0];
    const isSelf = reg.user_id === req.user.id;

    if (!isSelf && !req.user.is_admin) {
      // Organizer managing this event scope can also cancel
      const { rows: ok } = await pool.query(
        'SELECT user_can_manage_org($1, (SELECT scope_org_id FROM events WHERE id = $2)) AS ok',
        [req.user.id, reg.event_id]
      );
      if (!ok[0].ok) return res.status(403).json({ error: 'Forbidden', code: 'NO_PERMISSION' });
    }

    await pool.query(
      "UPDATE registrations SET status = 'cancelled' WHERE id = $1",
      [req.params.id]
    );
    return res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
