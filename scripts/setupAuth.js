/**
 * setupAuth.js
 *
 * Creates demo auth users in Supabase.
 * Run once: node scripts/setupAuth.js
 *
 * Reads from .env.local:
 *   REACT_APP_SUPABASE_URL
 *   REACT_APP_SUPABASE_ANON_KEY  (or SUPABASE_SERVICE_ROLE_KEY for admin API)
 */

const path = require('path');
const fs = require('fs');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('Error: REACT_APP_SUPABASE_URL is not set in .env.local');
  process.exit(1);
}

if (!serviceRoleKey && !anonKey) {
  console.error('Error: Neither SUPABASE_SERVICE_ROLE_KEY nor REACT_APP_SUPABASE_ANON_KEY is set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey || anonKey);

const DEMO_USERS = [
  { email: 'member@jmp.de', password: 'password123', label: 'Member' },
  { email: 'organizer@jmp.de', password: 'password123', label: 'Organizer' },
  { email: 'admin@jmp.de', password: 'password123', label: 'Admin' },
];

async function main() {
  console.log('Setting up demo auth users in Supabase...\n');

  if (serviceRoleKey) {
    console.log('Using service role key — users will be created pre-confirmed.\n');
    await setupWithAdminApi();
  } else {
    console.log('No service role key found — using signUp (requires "Confirm email" to be OFF).\n');
    await setupWithSignUp();
  }

  console.log('\nDone.');
}

async function setupWithAdminApi() {
  for (const user of DEMO_USERS) {
    try {
      // Try to create; if already exists, update password + confirm
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      });

      if (error) {
        if (error.message.includes('already been registered') || error.message.includes('already exists')) {
          // Find the user and confirm them
          const { data: list } = await supabase.auth.admin.listUsers();
          const existing = list?.users?.find(u => u.email === user.email);
          if (existing) {
            await supabase.auth.admin.updateUserById(existing.id, {
              password: user.password,
              email_confirm: true,
            });
            console.log(`[CONFIRMED] ${user.label} (${user.email})`);
          } else {
            console.error(`[ERROR] ${user.label}: ${error.message}`);
          }
        } else {
          console.error(`[ERROR] ${user.label} (${user.email}): ${error.message}`);
        }
      } else {
        console.log(`[OK] ${user.label} (${user.email}) — created (id: ${data.user?.id})`);
      }
    } catch (err) {
      console.error(`[ERROR] ${user.label}: ${err.message}`);
    }
  }
}

async function setupWithSignUp() {
  for (const user of DEMO_USERS) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
      });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          console.log(`[SKIP] ${user.label} (${user.email}) — already registered`);
        } else {
          console.error(`[ERROR] ${user.label} (${user.email}): ${error.message}`);
        }
      } else {
        console.log(`[OK]   ${user.label} (${user.email}) — created (id: ${data.user?.id})`);
      }
    } catch (err) {
      console.error(`[ERROR] ${user.label}: ${err.message}`);
    }
  }
}

main();
