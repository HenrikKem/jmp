-- ============================================================
-- JMP Database Schema – Migration 003
-- Audit triggers + audit_logs immutability
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- Prevent modification or deletion of audit log rows
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_immutable ON audit_logs;
CREATE TRIGGER audit_immutable
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();


-- ─────────────────────────────────────────────────────────────
-- Generic audit trigger function
-- Uses app.current_user_id and app.client_ip session variables
-- set by the application layer before each statement.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_id  UUID;
    v_client_ip INET;
    v_entity_id UUID;
BEGIN
    BEGIN v_actor_id  := current_setting('app.current_user_id', TRUE)::UUID; EXCEPTION WHEN OTHERS THEN v_actor_id := NULL; END;
    BEGIN v_client_ip := current_setting('app.client_ip', TRUE)::INET;      EXCEPTION WHEN OTHERS THEN v_client_ip := NULL; END;

    -- JSON-based id extraction: safe even when PK column is named user_id (not id)
    IF TG_OP = 'DELETE' THEN
        v_entity_id := (to_jsonb(OLD)->>'id')::UUID;
    ELSE
        v_entity_id := (to_jsonb(NEW)->>'id')::UUID;
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_value, ip_address)
        VALUES (v_actor_id, 'create', TG_TABLE_NAME, v_entity_id, to_jsonb(NEW), v_client_ip);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value, ip_address)
        VALUES (v_actor_id, 'update', TG_TABLE_NAME, v_entity_id, to_jsonb(OLD), to_jsonb(NEW), v_client_ip);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_value, ip_address)
        VALUES (v_actor_id, 'delete', TG_TABLE_NAME, v_entity_id, to_jsonb(OLD), v_client_ip);
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────────────────────
-- Apply audit triggers to security-sensitive tables
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'user_profiles',
        'user_org_units',
        'registrations',
        'user_event_roles'
    ] LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS audit_%1$s ON %1$s;
             CREATE TRIGGER audit_%1$s
               AFTER INSERT OR UPDATE OR DELETE ON %1$s
               FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();',
            t
        );
    END LOOP;
END;
$$;
