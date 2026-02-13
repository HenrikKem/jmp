# Database & Backend Specification

This document is the **single source of truth** for all database and backend implementation decisions.
It follows the terminology and concepts defined in `Overview.md` and `Design.md`.

---

## 1. Data Model (ERD)

### Entities

```
┌─────────────────┐       ┌─────────────────┐
│     OrgUnit     │       │      User       │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ name            │       │ email           │
│ level           │       │ password_hash   │
│ parent_id (FK)  │◄──────│ is_admin        │
└─────────────────┘       │ created_at      │
         │                │ updated_at      │
         │                └─────────────────┘
         │                        │
         ▼                        │
┌─────────────────┐               │
│ UserOrgUnit     │◄──────────────┘
├─────────────────┤
│ user_id (FK)    │
│ org_unit_id (FK)│
│ role            │  ← 'member' | 'organizer'
└─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│     Event       │       │     Group       │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ name            │       │ event_id (FK)   │
│ location        │       │ name            │
│ start_date      │       │ capacity        │
│ end_date        │       │ start_time      │ ← optional (Decision Needed)
│ scope_org_id(FK)│       └─────────────────┘
│ created_by (FK) │               │
│ created_at      │               │
│ updated_at      │               ▼
└─────────────────┘       ┌─────────────────┐
         │                │  Registration   │
         │                ├─────────────────┤
         └───────────────►│ id (PK)         │
                          │ user_id (FK)    │
                          │ event_id (FK)   │
                          │ group_id (FK)   │
                          │ registered_at   │
                          │ status          │
                          └─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│   EventRole     │       │ UserEventRole   │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ user_id (FK)    │
│ event_id (FK)   │◄──────│ event_role_id   │
│ name            │       │ assigned_at     │
│ description     │       │ assigned_by(FK) │
└─────────────────┘       └─────────────────┘

┌─────────────────┐
│   UserProfile   │  ← PII data, separate table
├─────────────────┤
│ user_id (PK,FK) │
│ phone           │
│ street          │
│ city            │
│ postal_code     │
│ country         │
│ date_of_birth   │
│ gender          │
│ hunting_license │
│ updated_at      │
└─────────────────┘

┌─────────────────┐
│   AuditLog      │
├─────────────────┤
│ id (PK)         │
│ timestamp       │
│ actor_id (FK)   │
│ action          │
│ entity_type     │
│ entity_id       │
│ old_value       │
│ new_value       │
│ ip_address      │
└─────────────────┘
```

### Relationships

| Relationship | Cardinality | Description |
|--------------|-------------|-------------|
| OrgUnit → OrgUnit | 1:N | Self-referential hierarchy (parent_id) |
| User → UserOrgUnit | 1:N | User can belong to multiple OrgUnits |
| OrgUnit → UserOrgUnit | 1:N | OrgUnit has multiple members |
| Event → Group | 1:N | Event contains multiple groups |
| Event → Registration | 1:N | Event has multiple registrations |
| User → Registration | 1:N | User can register for multiple events |
| Group → Registration | 1:N | Group contains multiple registrations |
| Event → EventRole | 1:N | Event defines multiple roles |
| User → UserEventRole | 1:N | User can have roles in multiple events |
| User → UserProfile | 1:1 | Each user has one profile |

---

## 2. Table Definitions

### 2.1 org_units

```sql
CREATE TABLE org_units (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    level           VARCHAR(50) NOT NULL,  -- 'hegering', 'district', 'region', 'state', 'federal'
    parent_id       UUID REFERENCES org_units(id) ON DELETE RESTRICT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_level CHECK (level IN ('hegering', 'district', 'region', 'state', 'federal'))
);

CREATE INDEX idx_org_units_parent ON org_units(parent_id);
CREATE INDEX idx_org_units_level ON org_units(level);
```

**Decision Needed:** Are the level names fixed (hegering, district, region, state, federal) or configurable?
**Recommended Default:** Fixed levels as listed above.

### 2.2 users

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_users_email ON users(LOWER(email));
```

### 2.3 user_profiles (PII)

```sql
CREATE TABLE user_profiles (
    user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    phone               VARCHAR(50),
    street              VARCHAR(255),
    city                VARCHAR(100),
    postal_code         VARCHAR(20),
    country             VARCHAR(100) DEFAULT 'Germany',
    date_of_birth       DATE,
    gender              VARCHAR(20),
    hunting_license_date DATE,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.4 user_org_units

```sql
CREATE TABLE user_org_units (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_unit_id     UUID NOT NULL REFERENCES org_units(id) ON DELETE RESTRICT,
    role            VARCHAR(20) NOT NULL DEFAULT 'member',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_role CHECK (role IN ('member', 'organizer')),
    CONSTRAINT unique_user_org UNIQUE (user_id, org_unit_id)
);

CREATE INDEX idx_user_org_units_user ON user_org_units(user_id);
CREATE INDEX idx_user_org_units_org ON user_org_units(org_unit_id);
CREATE INDEX idx_user_org_units_role ON user_org_units(role);
```

**Decision Needed:** Can a user be organizer for multiple OrgUnits?
**Recommended Default:** Yes, a user can have organizer role in multiple OrgUnits.

### 2.5 events

```sql
CREATE TABLE events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    location        VARCHAR(255),
    start_date      TIMESTAMPTZ NOT NULL,
    end_date        TIMESTAMPTZ NOT NULL,
    scope_org_id    UUID NOT NULL REFERENCES org_units(id) ON DELETE RESTRICT,
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_published    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

CREATE INDEX idx_events_scope ON events(scope_org_id);
CREATE INDEX idx_events_dates ON events(start_date, end_date);
CREATE INDEX idx_events_published ON events(is_published) WHERE is_published = TRUE;
```

### 2.6 groups

```sql
CREATE TABLE groups (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    capacity        INTEGER NOT NULL CHECK (capacity > 0),
    start_time      TIMESTAMPTZ,  -- optional per Decision Needed
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_groups_event ON groups(event_id);
```

**Decision Needed:** Are group start times part of v1?
**Recommended Default:** Include as optional field (nullable).

### 2.7 registrations

```sql
CREATE TABLE registrations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
    status          VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    registered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_status CHECK (status IN ('confirmed', 'cancelled')),
    CONSTRAINT unique_user_event UNIQUE (user_id, event_id)
);

CREATE INDEX idx_registrations_user ON registrations(user_id);
CREATE INDEX idx_registrations_event ON registrations(event_id);
CREATE INDEX idx_registrations_group ON registrations(group_id);
CREATE INDEX idx_registrations_status ON registrations(status) WHERE status = 'confirmed';
```

### 2.8 event_roles

```sql
CREATE TABLE event_roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_roles_event ON event_roles(event_id);
```

**Decision Needed:** Are role types fixed (range officer, event lead, assistant) or configurable per event?
**Recommended Default:** Configurable per event (organizer defines roles).

### 2.9 user_event_roles

```sql
CREATE TABLE user_event_roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_role_id   UUID NOT NULL REFERENCES event_roles(id) ON DELETE CASCADE,
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    CONSTRAINT unique_user_event_role UNIQUE (user_id, event_role_id)
);

CREATE INDEX idx_user_event_roles_user ON user_event_roles(user_id);
CREATE INDEX idx_user_event_roles_role ON user_event_roles(event_role_id);
```

### 2.10 audit_logs

```sql
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    action          VARCHAR(50) NOT NULL,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID,
    old_value       JSONB,
    new_value       JSONB,
    ip_address      INET,
    user_agent      TEXT
);

CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Prevent updates and deletes
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_immutable
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_modification();
```

---

## 3. Organizational Hierarchy Modeling

### Hierarchy Levels

```
Federal (Bundesebene)
    └── State (Landesebene)
            └── Region (Regionalebene)
                    └── District (Kreis)
                            └── Hegering
```

### Descendant Query (Recursive CTE)

```sql
-- Get all descendants of an OrgUnit (including self)
WITH RECURSIVE org_tree AS (
    -- Base case: the starting OrgUnit
    SELECT id, name, level, parent_id, 0 AS depth
    FROM org_units
    WHERE id = :org_unit_id

    UNION ALL

    -- Recursive case: all children
    SELECT o.id, o.name, o.level, o.parent_id, t.depth + 1
    FROM org_units o
    INNER JOIN org_tree t ON o.parent_id = t.id
)
SELECT * FROM org_tree;
```

### Ancestor Query

```sql
-- Get all ancestors of an OrgUnit (including self)
WITH RECURSIVE org_ancestors AS (
    SELECT id, name, level, parent_id, 0 AS depth
    FROM org_units
    WHERE id = :org_unit_id

    UNION ALL

    SELECT o.id, o.name, o.level, o.parent_id, a.depth + 1
    FROM org_units o
    INNER JOIN org_ancestors a ON o.id = a.parent_id
)
SELECT * FROM org_ancestors;
```

### Materialized Path Alternative (Performance Optimization)

For large hierarchies, consider adding a materialized path:

```sql
ALTER TABLE org_units ADD COLUMN path LTREE;
CREATE INDEX idx_org_units_path ON org_units USING GIST(path);

-- Example path: 'federal.state_nrw.region_west.district_muenster.hegering_123'
-- Query descendants: SELECT * FROM org_units WHERE path <@ 'federal.state_nrw';
```

**Decision Needed:** Use recursive CTE or materialized path (ltree)?
**Recommended Default:** Recursive CTE for simplicity; switch to ltree if performance issues arise.

---

## 4. Role & Scope Enforcement (RBAC + ABAC)

### Role Definitions

| Role | Scope | Permissions |
|------|-------|-------------|
| Member | Own data only | Read own profile, view eligible events, manage own registrations |
| Organizer | Assigned OrgUnit + descendants | CRUD members, events, registrations within scope |
| Admin | Global | All permissions, no scope restrictions |

### Scope Validation Functions

```sql
-- Check if user has organizer role for given OrgUnit or its ancestors
CREATE OR REPLACE FUNCTION user_can_manage_org(p_user_id UUID, p_org_unit_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    -- Admins can manage everything
    SELECT is_admin INTO v_is_admin FROM users WHERE id = p_user_id;
    IF v_is_admin THEN RETURN TRUE; END IF;

    -- Check if user is organizer for this OrgUnit or any ancestor
    RETURN EXISTS (
        WITH RECURSIVE org_ancestors AS (
            SELECT id, parent_id FROM org_units WHERE id = p_org_unit_id
            UNION ALL
            SELECT o.id, o.parent_id FROM org_units o
            INNER JOIN org_ancestors a ON o.id = a.parent_id
        )
        SELECT 1 FROM user_org_units uou
        WHERE uou.user_id = p_user_id
          AND uou.role = 'organizer'
          AND uou.org_unit_id IN (SELECT id FROM org_ancestors)
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if user can view/register for event (based on membership)
CREATE OR REPLACE FUNCTION user_can_access_event(p_user_id UUID, p_event_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_scope_org_id UUID;
    v_is_admin BOOLEAN;
BEGIN
    -- Admins can access everything
    SELECT is_admin INTO v_is_admin FROM users WHERE id = p_user_id;
    IF v_is_admin THEN RETURN TRUE; END IF;

    -- Get event scope
    SELECT scope_org_id INTO v_scope_org_id FROM events WHERE id = p_event_id;

    -- User must be member of the scope OrgUnit or any of its descendants
    RETURN EXISTS (
        WITH RECURSIVE org_tree AS (
            SELECT id FROM org_units WHERE id = v_scope_org_id
            UNION ALL
            SELECT o.id FROM org_units o
            INNER JOIN org_tree t ON o.parent_id = t.id
        )
        SELECT 1 FROM user_org_units uou
        WHERE uou.user_id = p_user_id
          AND uou.org_unit_id IN (SELECT id FROM org_tree)
    );
END;
$$ LANGUAGE plpgsql STABLE;
```

### Row-Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile (organizers/admins handled in application layer)
CREATE POLICY user_profiles_own ON user_profiles
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::UUID);

-- Users can only manage their own registrations
CREATE POLICY registrations_own ON registrations
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::UUID);
```

**Note:** Complex scope logic is better enforced at the application layer for flexibility.

---

## 5. Event, Group, Registration & Event-Role Modeling

### Event Lifecycle

```
Draft → Published → Active → Completed → Archived
```

**Decision Needed:** Implement full lifecycle or just published/unpublished?
**Recommended Default:** Simple is_published flag for v1.

### Registration Flow

1. User selects event → System validates scope eligibility
2. User selects group → System validates capacity
3. User confirms → System creates registration (with transaction lock)
4. Confirmation displayed

### Capacity Check (Race-Condition Safe)

```sql
-- Atomic registration with capacity check
CREATE OR REPLACE FUNCTION register_for_event(
    p_user_id UUID,
    p_event_id UUID,
    p_group_id UUID
) RETURNS UUID AS $$
DECLARE
    v_registration_id UUID;
    v_current_count INTEGER;
    v_capacity INTEGER;
BEGIN
    -- Lock the group row to prevent race conditions
    SELECT capacity INTO v_capacity
    FROM groups
    WHERE id = p_group_id AND event_id = p_event_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Group not found or does not belong to event';
    END IF;

    -- Count current registrations
    SELECT COUNT(*) INTO v_current_count
    FROM registrations
    WHERE group_id = p_group_id AND status = 'confirmed';

    IF v_current_count >= v_capacity THEN
        RAISE EXCEPTION 'Group is full';
    END IF;

    -- Create registration
    INSERT INTO registrations (user_id, event_id, group_id, status)
    VALUES (p_user_id, p_event_id, p_group_id, 'confirmed')
    RETURNING id INTO v_registration_id;

    RETURN v_registration_id;
END;
$$ LANGUAGE plpgsql;
```

### Event Role Assignment

```sql
-- Assign role to user for specific event
CREATE OR REPLACE FUNCTION assign_event_role(
    p_user_id UUID,
    p_event_role_id UUID,
    p_assigned_by UUID
) RETURNS UUID AS $$
DECLARE
    v_assignment_id UUID;
BEGIN
    INSERT INTO user_event_roles (user_id, event_role_id, assigned_by)
    VALUES (p_user_id, p_event_role_id, p_assigned_by)
    ON CONFLICT (user_id, event_role_id) DO NOTHING
    RETURNING id INTO v_assignment_id;

    RETURN v_assignment_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 6. Audit Log Design

### Auditable Actions

| Action | Entity | Logged Fields |
|--------|--------|---------------|
| create | user, event, registration | New values |
| update | user_profile, event, group | Old + new values (diff) |
| delete | registration, event_role | Old values |
| login | session | IP, user agent |
| role_change | user_org_units | Old + new role |

### Audit Log Entry Example

```json
{
    "id": "uuid",
    "timestamp": "2024-01-15T10:30:00Z",
    "actor_id": "user-uuid",
    "action": "update",
    "entity_type": "user_profile",
    "entity_id": "profile-uuid",
    "old_value": {"phone": "+49123456789"},
    "new_value": {"phone": "+49987654321"},
    "ip_address": "192.168.1.1"
}
```

### Audit Trigger (Automatic)

```sql
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_value, ip_address)
        VALUES (
            current_setting('app.current_user_id', TRUE)::UUID,
            'create',
            TG_TABLE_NAME,
            NEW.id,
            to_jsonb(NEW),
            current_setting('app.client_ip', TRUE)::INET
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value, ip_address)
        VALUES (
            current_setting('app.current_user_id', TRUE)::UUID,
            'update',
            TG_TABLE_NAME,
            NEW.id,
            to_jsonb(OLD),
            to_jsonb(NEW),
            current_setting('app.client_ip', TRUE)::INET
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_value, ip_address)
        VALUES (
            current_setting('app.current_user_id', TRUE)::UUID,
            'delete',
            TG_TABLE_NAME,
            OLD.id,
            to_jsonb(OLD),
            current_setting('app.client_ip', TRUE)::INET
        );
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables requiring audit
CREATE TRIGGER audit_user_profiles
    AFTER INSERT OR UPDATE OR DELETE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_registrations
    AFTER INSERT OR UPDATE OR DELETE ON registrations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

**Decision Needed:** Audit log granularity (full snapshot vs diff)?
**Recommended Default:** Store both old and new values (diff is derived at read time).

---

## 7. Data Classification

### PII (Personal Identifiable Information)

| Table | Field | Classification | Notes |
|-------|-------|----------------|-------|
| users | email | PII | Login identifier |
| user_profiles | phone | PII | Contact data |
| user_profiles | street, city, postal_code | PII | Address |
| user_profiles | date_of_birth | PII | Age information |
| user_profiles | gender | PII | Personal characteristic |
| user_profiles | hunting_license_date | PII | Professional data |
| audit_logs | ip_address | PII | Network identifier |

### Non-PII

| Table | Field | Classification |
|-------|-------|----------------|
| org_units | all fields | Non-PII |
| events | all fields | Non-PII |
| groups | all fields | Non-PII |
| event_roles | all fields | Non-PII |

### Access Rules

- PII fields are only returned when explicitly requested
- List views never include PII (except user's own data)
- Export functions must respect data classification
- Logs must never contain raw PII

---

## 8. Retention, Deletion & Anonymization

### Retention Periods

| Data Type | Retention | Justification |
|-----------|-----------|---------------|
| User account | Until deletion request | User consent |
| User profile | Until deletion request | User consent |
| Registrations | 3 years after event | Legal requirements |
| Audit logs | 10 years | Compliance |
| Session data | 30 days | Operational |

### Deletion Process (GDPR Art. 17)

```sql
-- Anonymize user data (soft delete)
CREATE OR REPLACE FUNCTION anonymize_user(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Anonymize profile
    UPDATE user_profiles SET
        phone = NULL,
        street = NULL,
        city = NULL,
        postal_code = NULL,
        date_of_birth = NULL,
        gender = NULL,
        hunting_license_date = NULL,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Anonymize user account
    UPDATE users SET
        email = 'deleted_' || id::TEXT || '@anonymous.local',
        password_hash = 'DELETED',
        is_active = FALSE,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Remove org memberships
    DELETE FROM user_org_units WHERE user_id = p_user_id;

    -- Keep registrations for statistics (anonymized via user reference)
    -- Audit logs are retained with actor_id reference
END;
$$ LANGUAGE plpgsql;
```

### Data Export (GDPR Art. 15)

```sql
-- Export all user data for GDPR request
CREATE OR REPLACE FUNCTION export_user_data(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'user', (SELECT to_jsonb(u) FROM users u WHERE id = p_user_id),
        'profile', (SELECT to_jsonb(p) FROM user_profiles p WHERE user_id = p_user_id),
        'memberships', (SELECT jsonb_agg(to_jsonb(m)) FROM user_org_units m WHERE user_id = p_user_id),
        'registrations', (SELECT jsonb_agg(to_jsonb(r)) FROM registrations r WHERE user_id = p_user_id),
        'event_roles', (SELECT jsonb_agg(to_jsonb(er)) FROM user_event_roles er WHERE user_id = p_user_id),
        'audit_entries', (SELECT jsonb_agg(to_jsonb(a)) FROM audit_logs a WHERE actor_id = p_user_id)
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
```

---

## 9. Security Considerations

### Password Handling

- Use bcrypt or Argon2id for password hashing
- Minimum cost factor: 12 (bcrypt) or memory 64MB (Argon2id)
- Never store plaintext passwords
- Never log passwords (even hashed)

```javascript
// Backend example (Node.js)
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

async function hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}
```

### Encryption at Rest

- Enable PostgreSQL TDE (Transparent Data Encryption) or use encrypted storage
- Encrypt database backups
- Consider column-level encryption for highly sensitive PII

```sql
-- Example: Encrypted column using pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Store encrypted
UPDATE user_profiles SET
    phone = pgp_sym_encrypt(phone_plaintext, current_setting('app.encryption_key'))
WHERE user_id = :user_id;

-- Read decrypted
SELECT pgp_sym_decrypt(phone::bytea, current_setting('app.encryption_key')) AS phone
FROM user_profiles WHERE user_id = :user_id;
```

**Decision Needed:** Column-level encryption for PII?
**Recommended Default:** Not required for v1; implement encryption at rest via storage layer.

### Access Separation

- Database user for application (limited permissions)
- Separate admin user for migrations
- No direct database access from frontend

```sql
-- Application database user
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
REVOKE DELETE ON audit_logs FROM app_user;

-- Migration user
CREATE USER migration_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO migration_user;
```

### Session Security

- Use secure, httpOnly cookies for session tokens
- Implement CSRF protection
- Session timeout: 24 hours (configurable)
- Force logout on password change

---

## 10. Backend Hints

### API Boundaries

| Endpoint | Auth Required | Scope Check | Notes |
|----------|---------------|-------------|-------|
| GET /api/events | Yes | Filter by user scope | List eligible events |
| GET /api/events/:id | Yes | Validate access | Event detail |
| POST /api/registrations | Yes | Validate event access + capacity | Atomic transaction |
| DELETE /api/registrations/:id | Yes | Own registration only | |
| GET /api/users (organizer) | Yes | Filter by managed scope | |
| POST /api/events (organizer) | Yes | Scope must be within managed scope | |

### Transaction Handling

```javascript
// Registration example with transaction
async function registerForEvent(userId, eventId, groupId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Set session context for RLS/audit
        await client.query("SET LOCAL app.current_user_id = $1", [userId]);

        // Atomic registration with capacity check
        const result = await client.query(
            'SELECT register_for_event($1, $2, $3) AS registration_id',
            [userId, eventId, groupId]
        );

        await client.query('COMMIT');
        return result.rows[0].registration_id;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
```

### Race Condition Prevention

1. **Registration capacity:** Use `SELECT ... FOR UPDATE` on group row
2. **Unique constraints:** Database-level UNIQUE constraints
3. **Idempotency:** Use idempotency keys for critical operations

```javascript
// Idempotent registration
async function registerIdempotent(userId, eventId, groupId, idempotencyKey) {
    const existing = await findByIdempotencyKey(idempotencyKey);
    if (existing) return existing;

    return registerForEvent(userId, eventId, groupId);
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| GROUP_FULL | 409 | Group capacity reached |
| EVENT_CLOSED | 410 | Event registration closed |
| NO_PERMISSION | 403 | Scope violation |
| ALREADY_REGISTERED | 409 | Duplicate registration |
| INVALID_SCOPE | 400 | Invalid OrgUnit reference |

### Caching Strategy

- Cache OrgUnit hierarchy (invalidate on change)
- Cache event list (short TTL: 1 minute)
- Never cache PII
- Use ETags for conditional requests

---

## Open Decisions Summary

| ID | Topic | Options | Recommended Default |
|----|-------|---------|---------------------|
| D1 | OrgUnit level names | Fixed vs configurable | Fixed levels |
| D2 | Multiple organizer scopes per user | Yes/No | Yes |
| D3 | Group start times in v1 | Yes/No | Yes (optional field) |
| D4 | Event role types | Fixed vs configurable | Configurable per event |
| D5 | Hierarchy query method | Recursive CTE vs ltree | Recursive CTE |
| D6 | Audit log granularity | Snapshot vs diff | Store both (old + new) |
| D7 | Column-level encryption | Yes/No | No (use storage encryption) |
| D8 | Can organizers edit all profile fields | All vs subset | Subset (no password, email) |
