# JMP — Jagd-Management-Portal

## Domain Terminology
- **OrgUnit**: Organisational unit in the hunting association hierarchy
- **Levels** (hierarchy, top → bottom): `federal` > `state` > `region` > `district` > `hegering`
- **Hegering**: Smallest OrgUnit; direct home unit for members
- **Member**: User with `role = MEMBER` in a UserOrgUnit
- **Organizer**: User with `role = ORGANIZER` in a UserOrgUnit — can manage events + members in their scope OrgUnit and all descendants
- **Admin**: `user.isAdmin = true` — global access, no scope restriction
- **Scope**: The set of OrgUnits an organizer manages = their direct OrgUnit + all descendants (recursive)
- **Event**: A hunt-related event scoped to a specific OrgUnit; visible to all members in that scope
- **Registration**: A user's sign-up for an event, optionally to a specific group/time slot
- **Group**: Sub-slot within an event (e.g., shooting group A, time slot 09:00)
- **EventRole**: Named role within an event (e.g., Eventleiter, Sicherheitsbeauftragter)

## Role Hierarchy
```
ADMIN (global)
├── ORGANIZER (scoped to OrgUnit + descendants)
│   └── MEMBER (member of at least one OrgUnit)
```

## Access Rules
| Action | MEMBER | ORGANIZER | ADMIN |
|--------|--------|-----------|-------|
| View own events | yes | yes | yes |
| View events in scope | yes | yes | yes |
| Create/edit events | no | yes (own scope) | yes |
| View own profile | yes | yes | yes |
| View member PII | no | yes (scope) | yes |
| Edit member profile | no | yes (scope) | yes |
| Add/remove members | no | yes (own scope) | yes |
| Audit logs | no | no | yes |
| GDPR operations | no | no | yes |

## Tech Stack
- API: NestJS 10+ (TypeScript strict)
- ORM: Prisma 5+
- Auth: Passport.js + JWT (access 15min / refresh 7 days)
- Database: PostgreSQL 15+

## Conventions
- IDs: CUID (`@id @default(cuid())`)
- All models have `createdAt`, `updatedAt`
- Soft delete: `isActive Boolean @default(true)`, `deletedAt DateTime?`
- All FK fields have explicit `@@index`
- NestJS modules in `apps/api/src/{domain}/`
- DTOs use class-validator
