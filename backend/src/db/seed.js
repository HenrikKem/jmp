/**
 * Loads and executes all seed files in order.
 * Safe to run multiple times (uses ON CONFLICT DO NOTHING).
 * Usage: node src/db/seed.js
 */
require('dotenv').config();

const fs   = require('fs');
const path = require('path');
const pool = require('./pool');

const SEEDS_DIR = path.join(__dirname, 'seeds');

async function seed() {
  const client = await pool.connect();
  try {
    const files = fs.readdirSync(SEEDS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      console.log(`  seed  ${file} …`);
      const sql = fs.readFileSync(path.join(SEEDS_DIR, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`  done  ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  FAIL  ${file}: ${err.message}`);
        throw err;
      }
    }
    console.log('\nSeeding complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => { console.error(err); process.exit(1); });
