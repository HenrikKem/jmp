/**
 * Simple migration runner.
 * Usage:
 *   node src/db/migrate.js up    – apply all pending migrations
 *   node src/db/migrate.js down  – print warning (manual rollback needed)
 */
require('dotenv').config();

const fs   = require('fs');
const path = require('path');
const pool = require('./pool');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getApplied(client) {
  const { rows } = await client.query('SELECT filename FROM schema_migrations ORDER BY filename');
  return new Set(rows.map(r => r.filename));
}

async function up() {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const applied = await getApplied(client);

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`  skip  ${file}`);
        continue;
      }

      console.log(`  apply ${file} …`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`  done  ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  FAIL  ${file}: ${err.message}`);
        throw err;
      }
    }

    console.log('\nAll migrations applied.');
  } finally {
    client.release();
    await pool.end();
  }
}

const cmd = process.argv[2];
if (cmd === 'up') {
  up().catch(err => { console.error(err); process.exit(1); });
} else {
  console.log('Usage: node migrate.js up');
  process.exit(1);
}
