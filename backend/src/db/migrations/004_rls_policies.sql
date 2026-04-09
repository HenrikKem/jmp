-- Migration 004: Enable Row Level Security for all tables
-- Run this in Supabase Dashboard SQL Editor.

-- ── org_units ──────────────────────────────────────────────────────────────
ALTER TABLE org_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_units_select" ON org_units
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "org_units_insert" ON org_units
  FOR INSERT TO authenticated WITH CHECK (true);

-- ── users ──────────────────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select" ON users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "users_insert" ON users
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "users_update" ON users
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ── user_org_units ─────────────────────────────────────────────────────────
ALTER TABLE user_org_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_org_units_select" ON user_org_units
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_org_units_insert" ON user_org_units
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "user_org_units_delete" ON user_org_units
  FOR DELETE TO authenticated USING (true);

-- ── user_profiles ──────────────────────────────────────────────────────────
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_all" ON user_profiles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── user_functions ─────────────────────────────────────────────────────────
ALTER TABLE user_functions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_functions_all" ON user_functions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── user_awards ────────────────────────────────────────────────────────────
ALTER TABLE user_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_awards_all" ON user_awards
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── events ─────────────────────────────────────────────────────────────────
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_all" ON events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── groups ─────────────────────────────────────────────────────────────────
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "groups_all" ON groups
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── registrations ──────────────────────────────────────────────────────────
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "registrations_all" ON registrations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── event_roles ────────────────────────────────────────────────────────────
ALTER TABLE event_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_roles_all" ON event_roles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── user_event_roles ───────────────────────────────────────────────────────
ALTER TABLE user_event_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_event_roles_all" ON user_event_roles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
