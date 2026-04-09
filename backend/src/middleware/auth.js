const jwt  = require('jsonwebtoken');
const pool = require('../db/pool');

/**
 * Verifies the Bearer JWT and attaches req.user.
 * Fetches a fresh user row so is_admin / is_active changes take effect immediately.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', code: 'MISSING_TOKEN' });
  }

  const token = authHeader.slice(7);
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Unauthorized', code: 'INVALID_TOKEN' });
  }

  const { rows } = await pool.query(
    'SELECT id, email, name, is_admin, is_active FROM users WHERE id = $1',
    [payload.sub]
  );
  const user = rows[0];
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'Unauthorized', code: 'USER_INACTIVE' });
  }

  req.user = user;
  next();
}

/**
 * Requires the authenticated user to be an admin.
 * Must be used after requireAuth.
 */
function requireAdmin(req, res, next) {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Forbidden', code: 'ADMIN_REQUIRED' });
  }
  next();
}

/**
 * Requires organizer role for at least one org unit (or admin).
 * Must be used after requireAuth.
 */
async function requireOrganizer(req, res, next) {
  if (req.user?.is_admin) return next();

  const { rows } = await pool.query(
    "SELECT 1 FROM user_org_units WHERE user_id = $1 AND role = 'organizer' LIMIT 1",
    [req.user.id]
  );
  if (!rows.length) {
    return res.status(403).json({ error: 'Forbidden', code: 'ORGANIZER_REQUIRED' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, requireOrganizer };
