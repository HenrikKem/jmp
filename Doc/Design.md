# Design

## Product Principles
- **Clarity over complexity:** Permissions and responsibilities must be understandable.
- **Data minimization:** Only collect and display what is strictly necessary.
- **Scope-first:** Every read/write operation must validate role + scope.
- **Auditability:** Changes to personal data must be traceable.

## Information Architecture (Navigation)
- **Dashboard**
    - Upcoming events
    - My registrations
- **Events**
    - Event list (filters: date, scope, “my registrations”)
    - Event details (info, groups, registration, participants)
- **Profile**
    - Personal data
    - Organizational memberships
- **Organizer Area** (visible only if authorized)
    - Member management
    - Event management
- **Admin Area**
    - Global user & organizational management (minimal in v1)

## UI Modules

### Event List
- Cards/table: name, location, date range, participant scope
- Badge: **Registered**
- Actions: view details / register / unregister (context-aware)

### Event Detail
- Event information
- Group list with capacity (e.g. 8/10)
- Registration with confirmation
- Organizer/Admin view: participant list + role assignment

### Profile
- Phone number
- Address
- Date of birth
- Gender
- Date of first hunting license
- Organizational memberships
- Validation on save

### Member Management (Organizer/Admin)
- Filter by organizational unit
- Member list
- Edit profile data (scope-restricted)

### Event Management (Organizer/Admin)
- Create/edit event: name, location, date range, participant scope
- Manage groups (capacity)
- Assign event-specific roles

## Permission Logic (Design View)
- **Member:** read own data, view eligible events, manage own registrations
- **Organizer:** CRUD within assigned scope + descendants
- **Admin:** unrestricted

## UX Rules
- Registration is binding and must be explicitly confirmed
- Group capacity must always be visible
- Errors must be explicit (“Group full”, “Event closed”, “No permission”)
- No unnecessary personal data in lists (especially event participants)

## Technical Design Decisions (Open)
Mark these as **Decision Needed** during implementation:
- Which organizational levels are selectable?
- Are group start times part of v1?
- Can organizers edit all profile fields or only a subset?
- Audit log granularity (diff vs snapshot)

## UI States
- Lists: loading / empty / error / success
- Forms: validation, dirty state
- Registration: double-submit protection

## Tracking & Logging
- Track domain events only (event created, registration added/removed)
- Never log personal data on client side
