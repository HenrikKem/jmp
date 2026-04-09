const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool    = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    const { rows } = await pool.query(
      'SELECT id, email, name, password_hash, is_admin, is_active FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    const user = rows[0];

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Load org unit memberships
    const { rows: memberships } = await pool.query(
      `SELECT uou.org_unit_id, uou.role, ou.name AS org_unit_name, ou.level
       FROM user_org_units uou
       JOIN org_units ou ON ou.id = uou.org_unit_id
       WHERE uou.user_id = $1`,
      [user.id]
    );

    // Audit: login
    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, ip_address, user_agent)
       VALUES ($1, 'login', 'session', $1, $2, $3)`,
      [user.id, req.ip, req.get('user-agent')]
    );

    return res.json({
      token,
      user: {
        id:          user.id,
        email:       user.email,
        name:        user.name,
        is_admin:    user.is_admin,
        memberships,
      },
    });
  } catch (err) { next(err); }
});


// ── GET /api/auth/me ─────────────────────────────────────────
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows: memberships } = await pool.query(
      `SELECT uou.org_unit_id, uou.role, ou.name AS org_unit_name, ou.level
       FROM user_org_units uou
       JOIN org_units ou ON ou.id = uou.org_unit_id
       WHERE uou.user_id = $1`,
      [req.user.id]
    );

    return res.json({
      id:          req.user.id,
      email:       req.user.email,
      name:        req.user.name,
      is_admin:    req.user.is_admin,
      memberships,
    });
  } catch (err) { next(err); }
});

module.exports = router;
