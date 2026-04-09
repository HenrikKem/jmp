---
name: orchestration
description: >
  Coordinate multi-agent workflows, delegate tasks between Claude agents, and plan feature build
  sequences. Use this skill whenever a task spans multiple domains (e.g., "add a new entity" touches
  database + API + frontend), when research is needed before implementation, or when planning the
  build sequence for a feature. Also trigger when someone mentions 'agent', 'orchestration',
  'delegate', 'research', 'multi-step', 'full-stack feature', 'end-to-end', or asks to build
  something that crosses skill boundaries.
---

# Orchestration Skill

How agents coordinate across skills and delegate work for full-stack projects using React + NestJS + PostgreSQL.

## Multi-Agent Architecture

```
┌─────────────────────────────────────────┐
│            ORCHESTRATOR AGENT           │
│  (reads this skill, plans, delegates)   │
└───────┬────────┬────────┬───────┬───────┘
        │        │        │       │
   ┌────▼──┐ ┌──▼───┐ ┌──▼──┐ ┌─▼────┐
   │  DB   │ │ API  │ │ FE  │ │ Auth │
   │ Agent │ │Agent │ │Agent│ │Agent │
   └───────┘ └──────┘ └─────┘ └──────┘
```

## Agent-Skill Mapping

| Agent | Reads Skill | Responsibility |
|-------|------------|----------------|
| DB Agent (db-manager) | `database-schema` skill | Schema changes, migrations, seed data |
| API Agent (backend-writer) | `api-nestjs` skill | NestJS modules, controllers, services, DTOs |
| Auth Agent | `auth-rbac` skill | Guards, roles, access control, JWT |
| FE Agent (frontend-writer) | `frontend-react` skill | React components, pages, hooks, API integration |
| Code Reviewer | All skills | Review quality, security, RBAC compliance |
| Security Auditor | `auth-rbac` + `api-nestjs` | Deep security audit |
| Test Writer | All skills | Unit, integration, component, E2E tests |

## Feature Build Sequence

When building a full-stack feature, follow this order:

### Phase 1: Schema (DB Agent)

1. Add/modify Prisma models
2. Create migration
3. Update seed data
4. Validate with `npx prisma validate`

### Phase 2: API (API Agent + Auth Agent)

1. Create NestJS module, controller, service, DTOs
2. Implement RBAC access checks
3. Add routes
4. Test endpoints

### Phase 3: Frontend (FE Agent)

1. Add TypeScript types
2. Create API functions
3. Create React Query hooks
4. Build components and pages
5. Add routes

### Phase 4: Quality (Reviewer + Test Writer)

1. Code review across all layers
2. Write unit tests for services (RBAC mandatory)
3. Write component tests for interactive UI
4. End-to-end test of critical flows

## Task Decomposition Template

When a user says "Build the {Feature} module", decompose it:

```
Task: Build {Feature} Module
├── DB: Add/verify {Entity} model in schema
│   ├── Define enums if needed
│   ├── Add indexes for FK, search, filter fields
│   └── Run migration
├── API: Create {entity} NestJS module
│   ├── Create DTOs (create, update, query)
│   ├── Create service with RBAC (ownership filtering)
│   ├── Create controller with routes
│   └── Register module in app.module.ts
├── Auth: Verify access rules
│   ├── Role A: own data only
│   ├── Role B: team data (read + enrich)
│   └── Role C: all data
├── FE: Build {entity} UI
│   ├── Types + API functions
│   ├── React Query hooks
│   ├── List component
│   ├── Detail component
│   ├── Create/edit form
│   └── Integrate into existing pages/routes
├── Tests: Verify everything
│   ├── Service RBAC tests (all roles)
│   ├── Component render tests
│   └── Integration tests
```

## Coordination Rules

### 1. Schema First

Never write API or frontend code before the Prisma schema is finalized. Schema is the contract.

### 2. Types Flow Down

```
Prisma schema → generated types → API DTOs → Frontend types
```

Keep them aligned. When schema changes, DTOs and frontend types must update.

### 3. One Feature at a Time

Complete all layers of one feature before starting the next. Don't build 5 API modules then 5 frontend pages.

### 4. RBAC is Not Optional

Every service method must include access control. Never skip "we'll add auth later."

### 5. Test the Chain

After building a feature, verify:
- Schema validates
- API returns correct data with correct access per role
- Frontend displays, creates, updates correctly
- Error cases are handled at every layer

## Build Priority Order Template

For a new full-stack project, build in this sequence:

```
1. Foundation
   ├── Monorepo setup (apps/api + apps/web)
   ├── Prisma + PostgreSQL connection
   ├── PrismaModule (global)
   └── Basic NestJS + Vite scaffolding

2. Auth
   ├── User model + seed
   ├── Login / JWT / Refresh
   ├── Guards + Decorators
   └── Login page + auth store

3. Core Entity (the main domain object)
   ├── Schema
   ├── CRUD API with RBAC
   └── List + Detail pages

4. Secondary Entities
   ├── Schema + relations to core entity
   ├── CRUD API (nested under parent where appropriate)
   └── Pages integrated into parent detail view

5. Child/Activity Entities (notes, tasks, comments, etc.)
   ├── Schema + types/enums
   ├── API with parent traversal for ownership
   └── Timeline/list UI within parent detail

6. Search & Navigation
   ├── Global search endpoint
   └── Search UI in header

7. Polish
   ├── Dashboard page
   ├── User management (admin)
   └── Settings
```

## File Locations Reference

```
project-root/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── prisma/
│   │       ├── auth/
│   │       ├── {domain modules}/
│   │       └── common/
│   └── web/                    # React frontend
│       └── src/
│           ├── api/
│           ├── components/
│           ├── hooks/
│           ├── pages/
│           ├── stores/
│           ├── types/
│           └── utils/
├── CLAUDE.md                   # Project conventions and domain context
├── package.json                # Root (workspace config)
└── .env                        # Root env (DB URL, JWT secrets)
```
