/**
 * Central error handler.
 * Maps known PG error codes and custom error classes to HTTP responses.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Validation errors from express-validator are handled inline in routes.

  // PostgreSQL unique violation
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Conflict', code: 'DUPLICATE_ENTRY', detail: err.detail });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(409).json({ error: 'Conflict', code: 'FK_VIOLATION', detail: err.detail });
  }

  // Custom PL/pgSQL exceptions
  if (err.code === 'P0002') {
    return res.status(404).json({ error: 'Group not found', code: 'GROUP_NOT_FOUND' });
  }
  if (err.code === 'P0003') {
    return res.status(409).json({ error: 'Group is full', code: 'GROUP_FULL' });
  }

  // Default 500
  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }
  return res.status(500).json({ error: 'Internal Server Error' });
}

module.exports = errorHandler;
