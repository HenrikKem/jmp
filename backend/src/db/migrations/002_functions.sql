-- ============================================================
-- JMP Database Schema – Migration 002
-- PL/pgSQL functions for scope, capacity, GDPR
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- Scope: check if user can manage an org unit (admin or organizer
-- for that unit or any ancestor of it)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION user_can_manage_org(p_user_id UUID, p_org_unit_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    SELECT is_admin INTO v_is_admin FROM users WHERE id = p_user_id;
    IF v_is_admin THEN RETURN TRUE; END IF;

    RETURN EXISTS (
        WITH RECURSIVE org_ancestors AS (
            SELECT id, parent_id FROM org_units WHERE id = p_org_unit_id
            UNION ALL
            SELECT o.id, o.parent_id
            FROM org_units o
            INNER JOIN org_ancestors a ON o.id = a.parent_id
        )
        SELECT 1 FROM user_org_units uou
        WHERE uou.user_id  = p_user_id
          AND uou.role      = 'organizer'
          AND uou.org_unit_id IN (SELECT id FROM org_ancestors)
    );
END;
$$ LANGUAGE plpgsql STABLE;


-- ─────────────────────────────────────────────────────────────
-- Scope: check if user can access/register for an event
-- (must be member of scope org unit or any descendant)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION user_can_access_event(p_user_id UUID, p_event_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_scope_org_id UUID;
    v_is_admin     BOOLEAN;
BEGIN
    SELECT is_admin INTO v_is_admin FROM users WHERE id = p_user_id;
    IF v_is_admin THEN RETURN TRUE; END IF;

    SELECT scope_org_id INTO v_scope_org_id FROM events WHERE id = p_event_id;

    RETURN EXISTS (
        WITH RECURSIVE org_tree AS (
            SELECT id FROM org_units WHERE id = v_scope_org_id
            UNION ALL
            SELECT o.id FROM org_units o
            INNER JOIN org_tree t ON o.parent_id = t.id
        )
        SELECT 1 FROM user_org_units uou
        WHERE uou.user_id     = p_user_id
          AND uou.org_unit_id IN (SELECT id FROM org_tree)
    );
END;
$$ LANGUAGE plpgsql STABLE;


-- ─────────────────────────────────────────────────────────────
-- Get all descendant org unit IDs for a given org unit
-- (including the org unit itself)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_org_descendants(p_org_unit_id UUID)
RETURNS TABLE(id UUID) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE org_tree AS (
        SELECT o.id FROM org_units o WHERE o.id = p_org_unit_id
        UNION ALL
        SELECT o.id FROM org_units o
        INNER JOIN org_tree t ON o.parent_id = t.id
    )
    SELECT org_tree.id FROM org_tree;
END;
$$ LANGUAGE plpgsql STABLE;


-- ─────────────────────────────────────────────────────────────
-- Atomic registration with capacity check (race-condition safe)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION register_for_event(
    p_user_id  UUID,
    p_event_id UUID,
    p_group_id UUID
) RETURNS UUID AS $$
DECLARE
    v_registration_id UUID;
    v_current_count   INTEGER;
    v_capacity        INTEGER;
BEGIN
    -- Lock the group row to prevent race conditions
    SELECT capacity INTO v_capacity
    FROM groups
    WHERE id = p_group_id AND event_id = p_event_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Group not found or does not belong to event'
            USING ERRCODE = 'P0002';
    END IF;

    SELECT COUNT(*) INTO v_current_count
    FROM registrations
    WHERE group_id = p_group_id AND status = 'confirmed';

    IF v_current_count >= v_capacity THEN
        RAISE EXCEPTION 'Group is full'
            USING ERRCODE = 'P0003';
    END IF;

    INSERT INTO registrations (user_id, event_id, group_id, status)
    VALUES (p_user_id, p_event_id, p_group_id, 'confirmed')
    RETURNING id INTO v_registration_id;

    RETURN v_registration_id;
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────────────────────
-- GDPR: anonymize a user (Art. 17 right to erasure)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION anonymize_user(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE user_profiles SET
        anrede                  = NULL,
        titel                   = NULL,
        geschlecht              = NULL,
        briefanrede             = NULL,
        berufsgruppe            = NULL,
        geburtsort              = NULL,
        geburtsdatum            = NULL,
        nationalitaet           = NULL,
        telefon_privat          = NULL,
        telefon_dienstlich      = NULL,
        telefon_handy           = NULL,
        strasse                 = NULL,
        hausnummer              = NULL,
        plz                     = NULL,
        ort                     = NULL,
        land                    = NULL,
        postfach_strasse        = NULL,
        postfach_plz            = NULL,
        postfach_ort            = NULL,
        jaegereichennummer      = NULL,
        erste_waffenbesitzkarte = NULL,
        jaegerpruefung_datum    = NULL,
        hunting_license_date    = NULL,
        externe_mitgliedsnummer = NULL,
        bemerkungen             = NULL,
        qualifications          = '{}',
        updated_at              = NOW()
    WHERE user_id = p_user_id;

    -- Anonymize the user account itself
    UPDATE users SET
        email         = 'deleted_' || id::TEXT || '@anonymous.local',
        name          = 'Gelöschter Benutzer',
        password_hash = 'DELETED',
        is_active     = FALSE,
        updated_at    = NOW()
    WHERE id = p_user_id;

    -- Remove org memberships
    DELETE FROM user_org_units WHERE user_id = p_user_id;

    -- Remove repeatable profile data
    DELETE FROM user_functions WHERE user_id = p_user_id;
    DELETE FROM user_awards    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────────────────────
-- GDPR: export all data for a user (Art. 15)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION export_user_data(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'user',         (SELECT row_to_json(u)  FROM (
                            SELECT id, email, name, is_admin, is_active, created_at
                            FROM users WHERE id = p_user_id) u),
        'profile',      (SELECT row_to_json(p)  FROM user_profiles p WHERE user_id = p_user_id),
        'memberships',  (SELECT jsonb_agg(row_to_json(m)) FROM user_org_units m WHERE user_id = p_user_id),
        'functions',    (SELECT jsonb_agg(row_to_json(f)) FROM user_functions  f WHERE user_id = p_user_id),
        'awards',       (SELECT jsonb_agg(row_to_json(a)) FROM user_awards     a WHERE user_id = p_user_id),
        'registrations',(SELECT jsonb_agg(row_to_json(r)) FROM registrations   r WHERE user_id = p_user_id),
        'event_roles',  (SELECT jsonb_agg(row_to_json(er)) FROM user_event_roles er WHERE user_id = p_user_id),
        'audit_entries',(SELECT jsonb_agg(row_to_json(al)) FROM audit_logs     al WHERE actor_id = p_user_id)
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────────────────────
-- Helper: update updated_at on any table automatically
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'org_units','users','user_profiles',
        'user_org_units','events','groups','registrations'
    ] LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_updated_at_%1$s ON %1$s;
             CREATE TRIGGER trg_updated_at_%1$s
               BEFORE UPDATE ON %1$s
               FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
            t
        );
    END LOOP;
END;
$$;
