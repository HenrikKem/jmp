/**
 * seedDummyData.js
 *
 * Inserts realistic dummy data into Supabase:
 *   - 6 additional org units
 *   - 20 additional users with profiles and memberships
 *   - 8 additional events with groups
 *
 * Run: node scripts/seedDummyData.js
 */

const path = require('path');
const fs = require('fs');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
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
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !key) {
  console.error('Missing REACT_APP_SUPABASE_URL or key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, key);

// ─── Existing IDs (already seeded) ───────────────────────────────────────────

const KV_MUENSTER   = '40000000-0000-0000-0000-000000000001';
const KV_DORTMUND   = '40000000-0000-0000-0000-000000000002';
const KV_KOELN      = '40000000-0000-0000-0000-000000000003';
const REG_WESTFALEN = '30000000-0000-0000-0000-000000000001';

const HG_MS_NORD  = '50000000-0000-0000-0000-000000000001';
const HG_MS_SUED  = '50000000-0000-0000-0000-000000000002';
const HG_DO_MITTE = '50000000-0000-0000-0000-000000000003';
const HG_KN_OST   = '50000000-0000-0000-0000-000000000004';

const ADMIN_ID = 'a0000000-0000-0000-0000-000000000003';
const ORGANIZER_ID = 'a0000000-0000-0000-0000-000000000002';

// ─── New org units ────────────────────────────────────────────────────────────

const NEW_ORG_UNITS = [
  { id: '50000000-0000-0000-0000-000000000006', name: 'Hegering Münster-Ost',      level: 'hegering', parent_id: KV_MUENSTER },
  { id: '50000000-0000-0000-0000-000000000007', name: 'Hegering Münster-West',     level: 'hegering', parent_id: KV_MUENSTER },
  { id: '50000000-0000-0000-0000-000000000008', name: 'Hegering Dortmund-Nord',    level: 'hegering', parent_id: KV_DORTMUND },
  { id: '50000000-0000-0000-0000-000000000009', name: 'Hegering Dortmund-Süd',     level: 'hegering', parent_id: KV_DORTMUND },
  { id: '40000000-0000-0000-0000-000000000005', name: 'Kreisverband Bielefeld',    level: 'district', parent_id: REG_WESTFALEN },
  { id: '50000000-0000-0000-0000-000000000010', name: 'Hegering Bielefeld-Mitte',  level: 'hegering', parent_id: '40000000-0000-0000-0000-000000000005' },
];

const HG_MS_OST  = '50000000-0000-0000-0000-000000000006';
const HG_MS_WEST = '50000000-0000-0000-0000-000000000007';
const HG_DO_NORD = '50000000-0000-0000-0000-000000000008';
const HG_DO_SUED = '50000000-0000-0000-0000-000000000009';
const HG_BI_MITTE = '50000000-0000-0000-0000-000000000010';

// ─── New users ────────────────────────────────────────────────────────────────

const PW_HASH = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5/M7uFiqR2KPy';

const NEW_USERS = [
  { id: 'a0000000-0000-0000-0000-000000000011', email: 'heinrich.brauer@example.de',   name: 'Heinrich Brauer',   is_admin: false },
  { id: 'a0000000-0000-0000-0000-000000000012', email: 'monika.hoffmann@example.de',   name: 'Monika Hoffmann',   is_admin: false },
  { id: 'a0000000-0000-0000-0000-000000000013', email: 'gerhard.steinbach@example.de', name: 'Gerhard Steinbach', is_admin: false },
  { id: 'a0000000-0000-0000-0000-000000000014', email: 'ursula.kettner@example.de',    name: 'Ursula Kettner',    is_admin: false },
  { id: 'a0000000-0000-0000-0000-000000000015', email: 'dieter.hartmann@example.de',   name: 'Dieter Hartmann',   is_admin: false },
  { id: 'a0000000-0000-0000-0000-000000000016', email: 'brigitte.fuchs@example.de',    name: 'Brigitte Fuchs',    is_admin: false },
  { id: 'a0000000-0000-0000-0000-000000000017', email: 'werner.schubert@example.de',   name: 'Werner Schubert',   is_admin: false },
  { id: 'a0000000-0000-0000-0000-000000000018', email: 'elke.zimmermann@example.de',   name: 'Elke Zimmermann',   is_admin: false },
  { id: 'a0000000-0000-0000-0000-000000000019', email: 'karl.heinz.vogel@example.de',  name: 'Karl-Heinz Vogel',  is_admin: false },
  { id: 'a0000000-0000-0000-0000-000000000020', email: 'ingrid.lange@example.de',      name: 'Ingrid Lange',      is_admin: false },
  { id: 'a0000000-0000-0000-0000-000000000021', email: 'frank.meissner@example.de',    name: 'Frank Meißner',     is_admin: false },
  { id: 'a0000000-0000-0000-0000-000000000022', email: 'renate.ritter@example.de',     name: 'Renate Ritter',     is_admin: false },
  { id: 'a0000000-0000-0000-0000-000000000023', email: 'jochen.bergmann@example.de',   name: 'Jochen Bergmann',   is_admin: false },
  { id: 'a0000000-0000-0000-0000-000000000024', email: 'helga.wendel@example.de',      name: 'Helga Wendel',      is_admin: false },
  { id: 'a0000000-0000-0000-0000-000000000025', email: 'rolf.schreiber@example.de',    name: 'Rolf Schreiber',    is_admin: false },
  { id: 'a0000000-0000-0000-0000-000000000026', email: 'claudia.hofmann@example.de',   name: 'Claudia Hofmann',   is_admin: false },
  { id: 'a0000000-0000-0000-0000-000000000027', email: 'walter.busch@example.de',      name: 'Walter Busch',      is_admin: false },
  { id: 'a0000000-0000-0000-0000-000000000028', email: 'karin.sommer@example.de',      name: 'Karin Sommer',      is_admin: false },
  { id: 'a0000000-0000-0000-0000-000000000029', email: 'norbert.krause@example.de',    name: 'Norbert Krause',    is_admin: false },
  { id: 'a0000000-0000-0000-0000-000000000030', email: 'hildegard.bach@example.de',    name: 'Hildegard Bach',    is_admin: false },
];

const NEW_PROFILES = [
  { user_id: 'a0000000-0000-0000-0000-000000000011', anrede: 'Herr', telefon_privat: '+49 251 410101', plz: '48145', ort: 'Münster',    land: 'Deutschland', qualifications: { jagdpaechter: true, hundefuehrer: true } },
  { user_id: 'a0000000-0000-0000-0000-000000000012', anrede: 'Frau', telefon_privat: '+49 251 420202', plz: '48143', ort: 'Münster',    land: 'Deutschland', qualifications: { jagdhorn: true } },
  { user_id: 'a0000000-0000-0000-0000-000000000013', anrede: 'Herr', telefon_privat: '+49 231 430303', plz: '44135', ort: 'Dortmund',   land: 'Deutschland', qualifications: { bestaetigterJagdaufseher: true, fallenlehrgang: true } },
  { user_id: 'a0000000-0000-0000-0000-000000000014', anrede: 'Frau', telefon_privat: '+49 231 440404', plz: '44137', ort: 'Dortmund',   land: 'Deutschland', qualifications: { drohnenfuehrerschein: true } },
  { user_id: 'a0000000-0000-0000-0000-000000000015', anrede: 'Herr', telefon_privat: '+49 521 450505', plz: '33602', ort: 'Bielefeld',  land: 'Deutschland', qualifications: { jagdpaechter: true } },
  { user_id: 'a0000000-0000-0000-0000-000000000016', anrede: 'Frau', telefon_privat: '+49 521 460606', plz: '33604', ort: 'Bielefeld',  land: 'Deutschland', qualifications: { jagdhorn: true, hundefuehrer: true } },
  { user_id: 'a0000000-0000-0000-0000-000000000017', anrede: 'Herr', telefon_privat: '+49 251 470707', plz: '48149', ort: 'Münster',    land: 'Deutschland', qualifications: { fallenlehrgang: true } },
  { user_id: 'a0000000-0000-0000-0000-000000000018', anrede: 'Frau', telefon_privat: '+49 251 480808', plz: '48151', ort: 'Münster',    land: 'Deutschland', qualifications: {} },
  { user_id: 'a0000000-0000-0000-0000-000000000019', anrede: 'Herr', telefon_privat: '+49 221 490909', plz: '50667', ort: 'Köln',       land: 'Deutschland', qualifications: { jagdpaechter: true, bestaetigterJagdaufseher: true } },
  { user_id: 'a0000000-0000-0000-0000-000000000020', anrede: 'Frau', telefon_privat: '+49 221 491010', plz: '50678', ort: 'Köln',       land: 'Deutschland', qualifications: { drohnenfuehrerschein: true, jagdhorn: true } },
  { user_id: 'a0000000-0000-0000-0000-000000000021', anrede: 'Herr', telefon_privat: '+49 231 492020', plz: '44139', ort: 'Dortmund',   land: 'Deutschland', qualifications: { hundefuehrer: true } },
  { user_id: 'a0000000-0000-0000-0000-000000000022', anrede: 'Frau', telefon_privat: '+49 251 493030', plz: '48147', ort: 'Münster',    land: 'Deutschland', qualifications: {} },
  { user_id: 'a0000000-0000-0000-0000-000000000023', anrede: 'Herr', telefon_privat: '+49 521 494040', plz: '33611', ort: 'Bielefeld',  land: 'Deutschland', qualifications: { jagdpaechter: true, fallenlehrgang: true, jagdhorn: true } },
  { user_id: 'a0000000-0000-0000-0000-000000000024', anrede: 'Frau', telefon_privat: '+49 251 495050', plz: '48145', ort: 'Münster',    land: 'Deutschland', qualifications: { bestaetigterJagdaufseher: true } },
  { user_id: 'a0000000-0000-0000-0000-000000000025', anrede: 'Herr', telefon_privat: '+49 231 496060', plz: '44141', ort: 'Dortmund',   land: 'Deutschland', qualifications: { hundefuehrer: true, drohnenfuehrerschein: true } },
  { user_id: 'a0000000-0000-0000-0000-000000000026', anrede: 'Frau', telefon_privat: '+49 251 497070', plz: '48153', ort: 'Münster',    land: 'Deutschland', qualifications: {} },
  { user_id: 'a0000000-0000-0000-0000-000000000027', anrede: 'Herr', telefon_privat: '+49 521 498080', plz: '33615', ort: 'Bielefeld',  land: 'Deutschland', qualifications: { jagdpaechter: true } },
  { user_id: 'a0000000-0000-0000-0000-000000000028', anrede: 'Frau', telefon_privat: '+49 221 499090', plz: '50969', ort: 'Köln',       land: 'Deutschland', qualifications: { jagdhorn: true } },
  { user_id: 'a0000000-0000-0000-0000-000000000029', anrede: 'Herr', telefon_privat: '+49 251 491100', plz: '48155', ort: 'Münster',    land: 'Deutschland', qualifications: { fallenlehrgang: true, bestaetigterJagdaufseher: true } },
  { user_id: 'a0000000-0000-0000-0000-000000000030', anrede: 'Frau', telefon_privat: '+49 521 492200', plz: '33619', ort: 'Bielefeld',  land: 'Deutschland', qualifications: {} },
];

const NEW_MEMBERSHIPS = [
  // MS-Ost
  { user_id: 'a0000000-0000-0000-0000-000000000011', org_unit_id: HG_MS_OST,  role: 'organizer' },
  { user_id: 'a0000000-0000-0000-0000-000000000012', org_unit_id: HG_MS_OST,  role: 'member' },
  { user_id: 'a0000000-0000-0000-0000-000000000018', org_unit_id: HG_MS_OST,  role: 'member' },
  { user_id: 'a0000000-0000-0000-0000-000000000022', org_unit_id: HG_MS_OST,  role: 'member' },
  { user_id: 'a0000000-0000-0000-0000-000000000026', org_unit_id: HG_MS_OST,  role: 'member' },
  // MS-West
  { user_id: 'a0000000-0000-0000-0000-000000000017', org_unit_id: HG_MS_WEST, role: 'organizer' },
  { user_id: 'a0000000-0000-0000-0000-000000000024', org_unit_id: HG_MS_WEST, role: 'member' },
  { user_id: 'a0000000-0000-0000-0000-000000000029', org_unit_id: HG_MS_WEST, role: 'member' },
  // DO-Nord
  { user_id: 'a0000000-0000-0000-0000-000000000013', org_unit_id: HG_DO_NORD, role: 'organizer' },
  { user_id: 'a0000000-0000-0000-0000-000000000014', org_unit_id: HG_DO_NORD, role: 'member' },
  { user_id: 'a0000000-0000-0000-0000-000000000021', org_unit_id: HG_DO_NORD, role: 'member' },
  { user_id: 'a0000000-0000-0000-0000-000000000025', org_unit_id: HG_DO_NORD, role: 'member' },
  // DO-Süd
  { user_id: 'a0000000-0000-0000-0000-000000000013', org_unit_id: HG_DO_SUED, role: 'member' },
  // Bielefeld-Mitte
  { user_id: 'a0000000-0000-0000-0000-000000000015', org_unit_id: HG_BI_MITTE, role: 'organizer' },
  { user_id: 'a0000000-0000-0000-0000-000000000016', org_unit_id: HG_BI_MITTE, role: 'member' },
  { user_id: 'a0000000-0000-0000-0000-000000000023', org_unit_id: HG_BI_MITTE, role: 'member' },
  { user_id: 'a0000000-0000-0000-0000-000000000027', org_unit_id: HG_BI_MITTE, role: 'member' },
  { user_id: 'a0000000-0000-0000-0000-000000000030', org_unit_id: HG_BI_MITTE, role: 'member' },
  // Köln-Ost (existing hegering)
  { user_id: 'a0000000-0000-0000-0000-000000000019', org_unit_id: HG_KN_OST,  role: 'organizer' },
  { user_id: 'a0000000-0000-0000-0000-000000000020', org_unit_id: HG_KN_OST,  role: 'member' },
  { user_id: 'a0000000-0000-0000-0000-000000000028', org_unit_id: HG_KN_OST,  role: 'member' },
  // MS-Süd extra members
  { user_id: 'a0000000-0000-0000-0000-000000000012', org_unit_id: HG_MS_SUED, role: 'member' },
];

// ─── New events ───────────────────────────────────────────────────────────────

const NEW_EVENTS = [
  {
    id: 'e0000000-0000-0000-0000-000000000006',
    name: 'Jahreshauptversammlung 2026',
    description: 'Jährliche Mitgliederversammlung mit Berichten, Wahlen und Ausblick.',
    location: 'Gasthaus Zum Jäger, Münster',
    start_date: '2026-03-25 19:00:00+01',
    end_date:   '2026-03-25 22:00:00+01',
    scope_org_id: HG_MS_SUED,
    created_by: ORGANIZER_ID,
    is_published: true,
  },
  {
    id: 'e0000000-0000-0000-0000-000000000007',
    name: 'Frühjahrsschießen 2026',
    description: 'Pflichtschießen für alle Mitglieder des Hegerings Münster-Ost.',
    location: 'Schießstand Münster-Ost',
    start_date: '2026-04-18 09:00:00+02',
    end_date:   '2026-04-18 17:00:00+02',
    scope_org_id: HG_MS_OST,
    created_by: 'a0000000-0000-0000-0000-000000000011',
    is_published: true,
  },
  {
    id: 'e0000000-0000-0000-0000-000000000008',
    name: 'Bockjagd Revierbegehung',
    description: 'Gemeinsame Revierbegehung zur Vorbereitung der Bockjagdsaison.',
    location: 'Treffpunkt Parkplatz Aasee',
    start_date: '2026-04-05 06:00:00+02',
    end_date:   '2026-04-05 11:00:00+02',
    scope_org_id: HG_MS_WEST,
    created_by: 'a0000000-0000-0000-0000-000000000017',
    is_published: true,
  },
  {
    id: 'e0000000-0000-0000-0000-000000000009',
    name: 'Drohnenpilotenschulung',
    description: 'Einführungskurs in die Drohnennutzung zur Wildtiersuche.',
    location: 'Online / Videokonferenz',
    start_date: '2026-05-09 10:00:00+02',
    end_date:   '2026-05-09 16:00:00+02',
    scope_org_id: HG_DO_NORD,
    created_by: 'a0000000-0000-0000-0000-000000000013',
    is_published: true,
  },
  {
    id: 'e0000000-0000-0000-0000-000000000010',
    name: 'Hegeringabend mit Vortrag',
    description: 'Abendveranstaltung mit Vortrag über Schwarzwildmanagement.',
    location: 'Schützenhaus Bielefeld',
    start_date: '2026-05-14 19:30:00+02',
    end_date:   '2026-05-14 22:30:00+02',
    scope_org_id: HG_BI_MITTE,
    created_by: 'a0000000-0000-0000-0000-000000000015',
    is_published: true,
  },
  {
    id: 'e0000000-0000-0000-0000-000000000011',
    name: 'Wildkochkurs für Jäger',
    description: 'Praxiskurs Wildbretverwertung — von der Strecke bis zum Teller.',
    location: 'Jagdhaus Dortmund',
    start_date: '2026-06-13 10:00:00+02',
    end_date:   '2026-06-13 18:00:00+02',
    scope_org_id: HG_DO_MITTE,
    created_by: ORGANIZER_ID,
    is_published: true,
  },
  {
    id: 'e0000000-0000-0000-0000-000000000012',
    name: 'Naturkundeseminar Rheinland',
    description: 'Zweitägiges Seminar zu Wildbiologie und Biotopkunde.',
    location: 'Bildungszentrum Köln-Deutz',
    start_date: '2026-09-05 09:00:00+02',
    end_date:   '2026-09-06 17:00:00+02',
    scope_org_id: HG_KN_OST,
    created_by: 'a0000000-0000-0000-0000-000000000019',
    is_published: true,
  },
  {
    id: 'e0000000-0000-0000-0000-000000000013',
    name: 'Herbst-Drückjagd 2026',
    description: 'Große Gemeinschaftsjagd im Herbstrevier — alle Mitglieder herzlich eingeladen.',
    location: 'Revier Münster-Süd, Treffpunkt Forsthaus',
    start_date: '2026-10-24 07:00:00+02',
    end_date:   '2026-10-24 18:00:00+02',
    scope_org_id: HG_MS_SUED,
    created_by: ORGANIZER_ID,
    is_published: false,
  },
];

const NEW_GROUPS = [
  // Frühjahrsschießen 2026 — 3 Zeitslots
  { id: 'b0000000-0000-0000-0000-000000000007', event_id: 'e0000000-0000-0000-0000-000000000007', name: 'Gruppe 1 – 09:00 Uhr', capacity: 8,  start_time: '2026-04-18 09:00:00+02' },
  { id: 'b0000000-0000-0000-0000-000000000008', event_id: 'e0000000-0000-0000-0000-000000000007', name: 'Gruppe 2 – 12:00 Uhr', capacity: 8,  start_time: '2026-04-18 12:00:00+02' },
  { id: 'b0000000-0000-0000-0000-000000000009', event_id: 'e0000000-0000-0000-0000-000000000007', name: 'Gruppe 3 – 15:00 Uhr', capacity: 8,  start_time: '2026-04-18 15:00:00+02' },
  // Drohnenschulung — 2 Kurse
  { id: 'b0000000-0000-0000-0000-000000000010', event_id: 'e0000000-0000-0000-0000-000000000009', name: 'Anfänger',            capacity: 12, start_time: '2026-05-09 10:00:00+02' },
  { id: 'b0000000-0000-0000-0000-000000000011', event_id: 'e0000000-0000-0000-0000-000000000009', name: 'Fortgeschrittene',    capacity: 10, start_time: '2026-05-09 13:00:00+02' },
  // Wildkochkurs — 2 Gruppen
  { id: 'b0000000-0000-0000-0000-000000000012', event_id: 'e0000000-0000-0000-0000-000000000011', name: 'Gruppe A',            capacity: 10, start_time: '2026-06-13 10:00:00+02' },
  { id: 'b0000000-0000-0000-0000-000000000013', event_id: 'e0000000-0000-0000-0000-000000000011', name: 'Gruppe B',            capacity: 10, start_time: '2026-06-13 14:00:00+02' },
  // Naturkundeseminar — 2 Tage × 2 Gruppen
  { id: 'b0000000-0000-0000-0000-000000000014', event_id: 'e0000000-0000-0000-0000-000000000012', name: 'Kurs 1 (Sa+So)',      capacity: 15, start_time: '2026-09-05 09:00:00+02' },
  { id: 'b0000000-0000-0000-0000-000000000015', event_id: 'e0000000-0000-0000-0000-000000000012', name: 'Kurs 2 (Sa+So)',      capacity: 15, start_time: '2026-09-05 09:00:00+02' },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function insert(label, table, rows) {
  const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
  if (error) {
    console.error(`  [ERROR] ${label}: ${error.message}`);
  } else {
    console.log(`  [OK]   ${label} (${rows.length} rows)`);
  }
}

async function main() {
  console.log('Seeding dummy data into Supabase...\n');

  // Authenticate so RLS policies allow writes
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: 'admin@jmp.de',
      password: 'password123',
    });
    if (authErr) {
      console.error('Auth failed:', authErr.message);
      console.error('Make sure admin@jmp.de exists and email confirmation is off.');
      process.exit(1);
    }
    console.log('Signed in as admin@jmp.de\n');
  }

  // Org units
  await insert('org_units', 'org_units', NEW_ORG_UNITS);

  // Users
  const usersWithHash = NEW_USERS.map(u => ({
    ...u,
    password_hash: PW_HASH,
    is_active: true,
  }));
  await insert('users', 'users', usersWithHash);

  // Profiles (no 'id' PK — upsert on user_id)
  const { error: profileErr } = await supabase
    .from('user_profiles')
    .upsert(NEW_PROFILES, { onConflict: 'user_id', ignoreDuplicates: true });
  if (profileErr) {
    console.error(`  [ERROR] user_profiles: ${profileErr.message}`);
  } else {
    console.log(`  [OK]   user_profiles (${NEW_PROFILES.length} rows)`);
  }

  // Memberships (no 'id' PK — upsert on user_id + org_unit_id)
  const { error: membErr } = await supabase
    .from('user_org_units')
    .upsert(NEW_MEMBERSHIPS, { onConflict: 'user_id,org_unit_id', ignoreDuplicates: true });
  if (membErr) {
    console.error(`  [ERROR] user_org_units: ${membErr.message}`);
  } else {
    console.log(`  [OK]   user_org_units (${NEW_MEMBERSHIPS.length} rows)`);
  }

  // Events
  await insert('events', 'events', NEW_EVENTS);

  // Groups
  await insert('groups', 'groups', NEW_GROUPS);

  console.log('\nDone! Seeded:');
  console.log(`  ${NEW_ORG_UNITS.length} org units`);
  console.log(`  ${NEW_USERS.length} users`);
  console.log(`  ${NEW_MEMBERSHIPS.length} memberships`);
  console.log(`  ${NEW_EVENTS.length} events`);
  console.log(`  ${NEW_GROUPS.length} groups`);
}

main();
