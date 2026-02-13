# Overview

## Goal
This web application is a club member management tool with event / shooting management.
The core concept is a hierarchical permission and visibility model based on organizational scopes
(e.g. Hegering → District → Region → State → Federal).

## Core Value
- Members manage their own personal data and register/unregister for events.
- Organizers manage members and events within their responsibility scope, including all sub-levels.
- Admins manage everything globally.

## Roles (Summary)

### Member
- Manage own profile (personal data and memberships)
- View events they are eligible for (based on event scope)
- Bindly register/unregister for events including group selection
- See registration status clearly marked in all event overviews

### Organizer (scope-based)
- All member permissions
- Manage members within their scope and all descendant organizational units
- Create and manage events within their scope
- Assign special roles to users per event

### Admin
- All organizer permissions without scope restrictions (global access)

## Organizational Hierarchy / Scope
- A user can belong to multiple organizational units (multi-membership)
- An organizer is assigned to one organizational unit and manages it plus all descendants
- Event eligibility is defined via scope rules

## Events (Shooting / Activities)
- Event data: name, location, time range, participant scope
- Groups: capacity-limited units inside an event
- Registration: users must select a group; only possible if capacity is available
- Event-specific roles: e.g. range officer, event lead, assistant (configurable)

## Non-Goals (v1)
- No payments or fee handling
- No waiting lists
- No external federation integrations
- No document upload/management

## Definitions
- **OrgUnit:** Organizational unit (Hegering, District, Region, State, Federal)
- **Scope:** Organizational responsibility range (OrgUnit + descendants)
- **Event Scope:** Defines who can see and join an event
- **Group:** Capacity-limited unit within an event
- **Registration:** Binding participation of a user in an event
