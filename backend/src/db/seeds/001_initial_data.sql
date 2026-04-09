-- ============================================================
-- JMP Seed Data – mirrors the frontend mockData.js
-- Uses fixed UUIDs so IDs are stable across re-seeds.
-- Passwords are bcrypt hash of 'password123' (cost 12)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- OrgUnits  (same hierarchy as mockData.js)
-- ─────────────────────────────────────────────────────────────
INSERT INTO org_units (id, name, level, parent_id) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Bundesverband Jagd', 'federal', NULL),

  ('20000000-0000-0000-0000-000000000001', 'Landesverband NRW',    'state', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', 'Landesverband Bayern', 'state', '10000000-0000-0000-0000-000000000001'),

  ('30000000-0000-0000-0000-000000000001', 'Regionalverband Westfalen',  'region', '20000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002', 'Regionalverband Rheinland',  'region', '20000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000003', 'Regionalverband Oberbayern', 'region', '20000000-0000-0000-0000-000000000002'),

  ('40000000-0000-0000-0000-000000000001', 'Kreisverband Münster',  'district', '30000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002', 'Kreisverband Dortmund', 'district', '30000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000003', 'Kreisverband Köln',     'district', '30000000-0000-0000-0000-000000000002'),
  ('40000000-0000-0000-0000-000000000004', 'Kreisverband München',  'district', '30000000-0000-0000-0000-000000000003'),

  ('50000000-0000-0000-0000-000000000001', 'Hegering Münster-Nord',    'hegering', '40000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000002', 'Hegering Münster-Süd',     'hegering', '40000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000003', 'Hegering Dortmund-Mitte',  'hegering', '40000000-0000-0000-0000-000000000002'),
  ('50000000-0000-0000-0000-000000000004', 'Hegering Köln-Ost',        'hegering', '40000000-0000-0000-0000-000000000003'),
  ('50000000-0000-0000-0000-000000000005', 'Hegering München-Zentrum', 'hegering', '40000000-0000-0000-0000-000000000004')
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- Demo users
-- password_hash = bcrypt('password123', 12)
-- ─────────────────────────────────────────────────────────────
INSERT INTO users (id, email, name, password_hash, is_admin, is_active) VALUES
  -- Regular member
  ('a0000000-0000-0000-0000-000000000001',
   'member@jmp.de',
   'Maria Mitglied',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5/M7uFiqR2KPy',
   FALSE, TRUE),

  -- Organizer for Hegering Münster-Süd
  ('a0000000-0000-0000-0000-000000000002',
   'organizer@jmp.de',
   'Otto Organisator',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5/M7uFiqR2KPy',
   FALSE, TRUE),

  -- Global admin
  ('a0000000-0000-0000-0000-000000000003',
   'admin@jmp.de',
   'System Admin',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5/M7uFiqR2KPy',
   TRUE, TRUE),

  -- Additional members for realistic data
  ('a0000000-0000-0000-0000-000000000004', 'max.mustermann@example.com',  'Max Mustermann',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5/M7uFiqR2KPy', FALSE, TRUE),
  ('a0000000-0000-0000-0000-000000000005', 'anna.schmidt@example.com',    'Anna Schmidt',     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5/M7uFiqR2KPy', FALSE, TRUE),
  ('a0000000-0000-0000-0000-000000000006', 'peter.mueller@example.com',   'Peter Müller',     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5/M7uFiqR2KPy', FALSE, TRUE),
  ('a0000000-0000-0000-0000-000000000007', 'lisa.weber@example.com',      'Lisa Weber',       '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5/M7uFiqR2KPy', FALSE, TRUE),
  ('a0000000-0000-0000-0000-000000000008', 'hans.bauer@example.com',      'Hans Bauer',       '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5/M7uFiqR2KPy', FALSE, TRUE),
  ('a0000000-0000-0000-0000-000000000009', 'sabine.klein@example.com',    'Sabine Klein',     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5/M7uFiqR2KPy', FALSE, TRUE),
  ('a0000000-0000-0000-0000-000000000010', 'thomas.wolf@example.com',     'Thomas Wolf',      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5/M7uFiqR2KPy', FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- User profiles (base data)
-- ─────────────────────────────────────────────────────────────
INSERT INTO user_profiles (user_id, anrede, telefon_privat, plz, ort, land, qualifications) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Frau', '+49 251 111111', '48143', 'Münster', 'Deutschland', '{"jagdschein":true}'),
  ('a0000000-0000-0000-0000-000000000002', 'Herr', '+49 251 222222', '48145', 'Münster', 'Deutschland', '{"jagdschein":true,"waffenbesitzkarte":true}'),
  ('a0000000-0000-0000-0000-000000000003', 'Herr', NULL,             NULL,    NULL,     'Deutschland', '{}'),
  ('a0000000-0000-0000-0000-000000000004', 'Herr', '+49 251 100200', '48143', 'Münster', 'Deutschland', '{"jagdschein":true,"waffenbesitzkarte":true}'),
  ('a0000000-0000-0000-0000-000000000005', 'Frau', '+49 251 300400', '48145', 'Münster', 'Deutschland', '{"jagdschein":true}'),
  ('a0000000-0000-0000-0000-000000000006', 'Herr', '+49 231 500600', '44135', 'Dortmund','Deutschland', '{"jagdschein":true,"waffenbesitzkarte":true}'),
  ('a0000000-0000-0000-0000-000000000007', 'Frau', '+49 221 700800', '50667', 'Köln',    'Deutschland', '{"jagdschein":true}'),
  ('a0000000-0000-0000-0000-000000000008', 'Herr', '+49 251 900100', '48149', 'Münster', 'Deutschland', '{"jagdschein":true,"waffenbesitzkarte":true}'),
  ('a0000000-0000-0000-0000-000000000009', 'Frau', '+49 231 110220', '44137', 'Dortmund','Deutschland', '{"jagdschein":true}'),
  ('a0000000-0000-0000-0000-000000000010', 'Herr', '+49 251 330440', '48151', 'Münster', 'Deutschland', '{"jagdschein":true,"waffenbesitzkarte":true}')
ON CONFLICT (user_id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- Org memberships
-- ─────────────────────────────────────────────────────────────
INSERT INTO user_org_units (user_id, org_unit_id, role) VALUES
  -- Maria Mitglied: member of Hegering Münster-Nord
  ('a0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'member'),

  -- Otto Organisator: member of MS-Nord + organizer of MS-Süd
  ('a0000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'member'),
  ('a0000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 'organizer'),

  -- Admin: organizer at federal level (catches everything)
  ('a0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'organizer'),

  -- Additional members
  ('a0000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000002', 'member'),
  ('a0000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000002', 'member'),
  ('a0000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000003', 'member'),
  ('a0000000-0000-0000-0000-000000000007', '50000000-0000-0000-0000-000000000004', 'member'),
  ('a0000000-0000-0000-0000-000000000008', '50000000-0000-0000-0000-000000000002', 'member'),
  ('a0000000-0000-0000-0000-000000000009', '50000000-0000-0000-0000-000000000003', 'member'),
  ('a0000000-0000-0000-0000-000000000010', '50000000-0000-0000-0000-000000000001', 'member')
ON CONFLICT (user_id, org_unit_id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- Events (scoped to Hegering Münster-Süd)
-- ─────────────────────────────────────────────────────────────
INSERT INTO events (id, name, description, location, start_date, end_date, scope_org_id, created_by, is_published) VALUES
  ('e0000000-0000-0000-0000-000000000001',
   'Frühjahrsschießen 2025',
   'Jährliches Pflichtschießen für alle Mitglieder des Hegerings.',
   'Schießstand Münster-Wolbeck',
   '2025-04-12 09:00:00+02', '2025-04-12 17:00:00+02',
   '50000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000002',
   TRUE),

  ('e0000000-0000-0000-0000-000000000002',
   'Jagdpraktisches Seminar',
   'Fortbildungsseminar für erfahrene Jäger.',
   'Jagdhaus Münsterland',
   '2025-05-20 10:00:00+02', '2025-05-21 17:00:00+02',
   '50000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000002',
   TRUE),

  ('e0000000-0000-0000-0000-000000000003',
   'Herbstjagd Gemeinschaftsjagd',
   'Gemeinsame Drückjagd im Revier.',
   'Revier Münster-Süd',
   '2025-10-18 07:00:00+02', '2025-10-18 18:00:00+02',
   '50000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000002',
   TRUE),

  ('e0000000-0000-0000-0000-000000000004',
   'Erste-Hilfe-Kurs für Jäger',
   'Zertifizierter Erste-Hilfe-Kurs mit jagdspezifischen Inhalten.',
   'DRK Münster',
   '2025-06-07 09:00:00+02', '2025-06-07 17:00:00+02',
   '50000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000002',
   TRUE),

  ('e0000000-0000-0000-0000-000000000005',
   'Brauchtumspflege Hegering',
   'Abendveranstaltung zur Pflege jagdlicher Traditionen.',
   'Gasthaus Zur Eiche',
   '2025-03-15 19:00:00+01', '2025-03-15 23:00:00+01',
   '50000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000002',
   FALSE)
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- Groups
-- ─────────────────────────────────────────────────────────────
INSERT INTO groups (id, event_id, name, capacity, start_time) VALUES
  -- Frühjahrsschießen – 3 Gruppen
  ('b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Gruppe A', 10, '2025-04-12 09:00:00+02'),
  ('b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'Gruppe B', 10, '2025-04-12 11:00:00+02'),
  ('b0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'Gruppe C', 10, '2025-04-12 14:00:00+02'),

  -- Seminar – 2 Gruppen
  ('b0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000002', 'Kurs Frühling A', 15, '2025-05-20 10:00:00+02'),
  ('b0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000002', 'Kurs Frühling B', 15, '2025-05-20 14:00:00+02'),

  -- Erste-Hilfe – 1 Gruppe (kein Zeitslot)
  ('b0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000004', 'Gesamtgruppe', 20, NULL)
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- Sample registrations
-- ─────────────────────────────────────────────────────────────
INSERT INTO registrations (user_id, event_id, group_id, status) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'confirmed'),
  ('a0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'confirmed'),
  ('a0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'confirmed'),
  ('a0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'confirmed'),
  ('a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004', 'confirmed'),
  ('a0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004', 'confirmed')
ON CONFLICT (user_id, event_id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- Event roles for Frühjahrsschießen
-- ─────────────────────────────────────────────────────────────
INSERT INTO event_roles (id, event_id, name, description) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Eventleiter',           'Gesamtverantwortung für die Veranstaltung'),
  ('c0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'Sicherheitsbeauftragter', 'Verantwortlich für Schießstandsicherheit'),
  ('c0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'Helfer',                'Unterstützende Tätigkeit')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_event_roles (user_id, event_role_id, assigned_by) VALUES
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002')
ON CONFLICT (user_id, event_role_id) DO NOTHING;
