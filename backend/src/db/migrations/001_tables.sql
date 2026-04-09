-- ============================================================
-- JMP Database Schema – Migration 001
-- Creates all tables in dependency order
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ─────────────────────────────────────────────────────────────
-- 1. org_units
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_units (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    level       VARCHAR(50)  NOT NULL,
    parent_id   UUID REFERENCES org_units(id) ON DELETE RESTRICT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_level CHECK (level IN ('hegering','district','region','state','federal'))
);

CREATE INDEX IF NOT EXISTS idx_org_units_parent ON org_units(parent_id);
CREATE INDEX IF NOT EXISTS idx_org_units_level  ON org_units(level);


-- ─────────────────────────────────────────────────────────────
-- 2. users
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    is_admin        BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));


-- ─────────────────────────────────────────────────────────────
-- 3. user_profiles  (PII – separate table)
-- Extended with all fields from task_userdata.md
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id                 UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

    -- Personal
    anrede                  VARCHAR(20),            -- Herr / Frau / Divers
    titel                   VARCHAR(100),
    geschlecht              VARCHAR(20),
    briefanrede             TEXT,
    berufsgruppe            VARCHAR(100),
    geburtsort              VARCHAR(100),
    geburtsdatum            DATE,
    nationalitaet           VARCHAR(100) DEFAULT 'Deutschland',

    -- Contact
    telefon_privat          VARCHAR(50),
    telefon_dienstlich      VARCHAR(50),
    telefon_handy           VARCHAR(50),

    -- Primary address
    strasse                 VARCHAR(255),
    hausnummer              VARCHAR(20),
    plz                     VARCHAR(20),
    ort                     VARCHAR(100),
    land                    VARCHAR(100) DEFAULT 'Deutschland',

    -- Optional postal address
    postfach_strasse        VARCHAR(255),
    postfach_plz            VARCHAR(20),
    postfach_ort            VARCHAR(100),

    -- Hunting / professional
    jaegereichennummer      VARCHAR(100),           -- hunting registry number
    erste_waffenbesitzkarte DATE,
    jaegerpruefung_datum    DATE,
    hunting_license_date    DATE,                   -- first hunting license

    -- Admin-only fields
    externe_mitgliedsnummer VARCHAR(100),
    bemerkungen             TEXT,

    -- Qualifications (boolean flags + dog tests as JSONB)
    -- e.g. {"jagdschein": true, "waffenbesitzkarte": true, "hundpruefungen": ["BGS", "VJP"]}
    qualifications          JSONB NOT NULL DEFAULT '{}',

    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────
-- 4. user_functions (Funktionen – repeatable)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_functions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    funktion        VARCHAR(255) NOT NULL,
    org_unit_name   VARCHAR(255),
    von             DATE,
    bis             DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_functions_user ON user_functions(user_id);


-- ─────────────────────────────────────────────────────────────
-- 5. user_awards (Ehrungen – repeatable)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_awards (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bezeichnung VARCHAR(255) NOT NULL,
    datum       DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_awards_user ON user_awards(user_id);


-- ─────────────────────────────────────────────────────────────
-- 6. user_org_units
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_org_units (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
    org_unit_id UUID NOT NULL REFERENCES org_units(id)  ON DELETE RESTRICT,
    role        VARCHAR(20) NOT NULL DEFAULT 'member',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_uou_role     CHECK (role IN ('member','organizer')),
    CONSTRAINT unique_user_org    UNIQUE (user_id, org_unit_id)
);

CREATE INDEX IF NOT EXISTS idx_user_org_units_user ON user_org_units(user_id);
CREATE INDEX IF NOT EXISTS idx_user_org_units_org  ON user_org_units(org_unit_id);
CREATE INDEX IF NOT EXISTS idx_user_org_units_role ON user_org_units(role);


-- ─────────────────────────────────────────────────────────────
-- 7. events
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    location        VARCHAR(255),
    start_date      TIMESTAMPTZ  NOT NULL,
    end_date        TIMESTAMPTZ  NOT NULL,
    scope_org_id    UUID NOT NULL REFERENCES org_units(id) ON DELETE RESTRICT,
    created_by      UUID NOT NULL REFERENCES users(id)     ON DELETE RESTRICT,
    is_published    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_events_scope     ON events(scope_org_id);
CREATE INDEX IF NOT EXISTS idx_events_dates     ON events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_events_published ON events(is_published) WHERE is_published = TRUE;


-- ─────────────────────────────────────────────────────────────
-- 8. groups
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS groups (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    capacity    INTEGER NOT NULL CHECK (capacity > 0),
    start_time  TIMESTAMPTZ,    -- optional
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_event ON groups(event_id);


-- ─────────────────────────────────────────────────────────────
-- 9. registrations
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS registrations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    event_id        UUID NOT NULL REFERENCES events(id)  ON DELETE CASCADE,
    group_id        UUID         REFERENCES groups(id)   ON DELETE RESTRICT,
    status          VARCHAR(20)  NOT NULL DEFAULT 'confirmed',
    registered_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_reg_status CHECK (status IN ('confirmed','cancelled')),
    CONSTRAINT unique_user_event UNIQUE (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_registrations_user   ON registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event  ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_group  ON registrations(group_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status) WHERE status = 'confirmed';


-- ─────────────────────────────────────────────────────────────
-- 10. event_roles
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_roles_event ON event_roles(event_id);


-- ─────────────────────────────────────────────────────────────
-- 11. user_event_roles
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_event_roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
    event_role_id   UUID NOT NULL REFERENCES event_roles(id) ON DELETE CASCADE,
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by     UUID NOT NULL REFERENCES users(id)       ON DELETE RESTRICT,

    CONSTRAINT unique_user_event_role UNIQUE (user_id, event_role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_event_roles_user ON user_event_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_event_roles_role ON user_event_roles(event_role_id);


-- ─────────────────────────────────────────────────────────────
-- 12. audit_logs  (append-only)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(50)  NOT NULL,
    entity_type VARCHAR(50)  NOT NULL,
    entity_id   UUID,
    old_value   JSONB,
    new_value   JSONB,
    ip_address  INET,
    user_agent  TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp  ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor      ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity     ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action     ON audit_logs(action);


-- ─────────────────────────────────────────────────────────────
-- 13. migrations tracking table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schema_migrations (
    filename    VARCHAR(255) PRIMARY KEY,
    applied_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
