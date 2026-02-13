# Task Sheet

## Working Mode
- All development is incremental (Epic → Story → Subtasks).
- Each increment follows: Plan → Implement → Verify.
- Database and backend structure are specified **only** in `DB_info.md` by Claude.

---

## Epic A — Organizational Structure & Scope Foundations
### Goal
Define organizational hierarchy and scope rules conceptually and in UI stubs.

### Stories

A1. Organizational Units
- Define OrgUnit types and hierarchy rules
- UI: simple tree/list (mocked data)
- Document scope matching logic (descendants)
- Acceptance:
    - Hierarchy is clearly represented
    - Scope rules are unambiguous

A2. User ↔ OrgUnit Memberships
- Profile UI: multi-selection of OrgUnits
- Validation (no duplicates)
- Acceptance:
    - User can belong to multiple OrgUnits
    - Display and editing are consistent

---

## Epic B — Roles & Permissions
### Goal
Clear role model with scope-bound organizer permissions.

### Stories

B1. Role Model
- Member / Organizer / Admin flags in user context
- Navigation guarded by role
- Acceptance:
    - Organizer/Admin areas visible only if permitted

B2. Organizer Scope Rules
- Organizer manages exactly one OrgUnit + descendants
- Decision Needed: multiple organizer scopes per user?
- Acceptance:
    - Scope logic is documented and consistently applied

---

## Epic C — Events v1 (No Groups)
### Goal
Basic event listing, detail view, and registration.

### Stories

C1. Event Visibility
- Event list + detail
- Badge for registered events
- Acceptance:
    - User sees only eligible events

C2. Registration (no groups)
- Register/unregister with confirmation
- Acceptance:
    - Status updates correctly
    - Errors handled cleanly

---

## Epic D — Groups & Capacity
### Goal
Group-based registration with capacity limits.

### Stories

D1. Groups
- Display groups with capacity
- Optional start times (Decision Needed)
- Acceptance:
    - Capacity clearly visible

D2. Group Registration
- Select group during registration
- Prevent registration if full
- Acceptance:
    - Capacity enforced
    - Unregister frees capacity

---

## Epic E — Event Management (Organizer/Admin)
### Goal
Create and manage events within scope.

### Stories

E1. Event CRUD
- Create/edit event: name, location, date range, participant scope
- Acceptance:
    - Organizer can 1 scoped events

E2. Group Management
- Add/edit/remove groups
- Acceptance:
    - Group changes affect registrations correctly

---

## Epic F — Event-Specific Roles
### Goal
Assign roles per event.

### Stories

F1. Role Assignment
- Define role types (fixed vs configurable – Decision Needed)
- Assign roles in event admin UI
- Acceptance:
    - Roles are visible and persisted

---

## Epic G — Privacy & Compliance (Application Level)
### Goal
Ensure GDPR-compliant data handling conceptually and in UI behavior.

### Stories

G1. Data Minimization
- Define which personal data is shown where
- Mask sensitive data when not required
- Acceptance:
    - No unnecessary personal data exposure

G2. Audit Concept
- Define auditable actions (concept only)
- Reference DB audit requirements
- Acceptance:
    - Audit scope is documented

---

## Claude Prompt — DB_info.md ONLY

**IMPORTANT: Claude must write exclusively into `DB_info.md`.  
No changes to other documents.**

Prompt:

> Create a database and backend specification document for this project.  
> This document is the single source of truth for future backend and database implementation.
>
> Requirements:
> - Do NOT implement frontend or UI logic.
> - Do NOT modify or redefine concepts from Overview.md, Design.md, or Task_sheet.md.
> - Use the same terminology consistently: Member, Organizer, Admin, OrgUnit, Scope, Event, Group, Registration.
>
> The document must include:
> 1. Data model (entities and relationships, ERD in text form)
> 2. Table definitions (columns, types, keys, constraints, indices)
> 3. Organizational hierarchy modeling (OrgUnits + descendants)
> 4. Role & scope enforcement rules (RBAC + ABAC)
> 5. Event, group, registration, and event-role modeling
> 6. Audit log design (append-only, GDPR-compliant)
> 7. Data classification (PII vs non-PII)
> 8. Retention, deletion, and anonymization strategy
> 9. Security considerations (hashing, encryption at rest, access separation)
> 10. Backend hints (API boundaries, transactions, race-condition handling)
>
> Be technology-neutral, but include PostgreSQL-oriented examples where helpful.
> Mark unclear points as **Decision Needed** with a recommended default.
> Assume GDPR compliance is mandatory.
