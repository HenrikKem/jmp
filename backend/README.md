# JMP Backend

Node.js / Express REST API with PostgreSQL.

## Prerequisites

- Node.js ≥ 18
- PostgreSQL ≥ 14

## Setup

```bash
cd backend
npm install

# Copy and fill in the environment file
cp .env.example .env
# Edit DATABASE_URL and JWT_SECRET

# Create the database
createdb jmp_db

# Run migrations (creates all tables, functions, triggers)
npm run migrate

# Seed development data (demo users, org units, events)
npm run seed
```

## Development

```bash
npm run dev   # starts with nodemon (auto-restart)
```

## API Overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | – | Login → JWT |
| GET | `/api/auth/me` | JWT | Current user info |
| GET | `/api/users` | JWT | List users (scoped) |
| POST | `/api/users` | admin | Create user |
| GET | `/api/users/:id` | JWT | User details |
| PUT | `/api/users/:id/profile` | JWT | Update profile |
| DELETE | `/api/users/:id` | admin | GDPR anonymize |
| GET | `/api/org-units` | JWT | All org units |
| POST | `/api/org-units` | admin | Create org unit |
| GET | `/api/events` | JWT | Visible events |
| GET | `/api/events/manage` | organizer | Manageable events |
| POST | `/api/events` | organizer | Create event |
| PUT | `/api/events/:id` | organizer | Update event |
| DELETE | `/api/events/:id` | organizer | Delete event |
| GET | `/api/events/:id/groups` | JWT | Event groups |
| POST | `/api/events/:id/groups` | organizer | Create group |
| POST | `/api/registrations` | JWT | Register for event |
| DELETE | `/api/registrations/:id` | JWT | Cancel registration |
| GET | `/api/admin/audit-logs` | admin | Audit log |
| GET | `/api/admin/users/:id/export` | admin | GDPR data export |
| POST | `/api/admin/users/:id/anonymize` | admin | GDPR erasure |

## Demo credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Member | member@jmp.example | password123 |
| Organizer (Hegering Münster-Süd) | organizer@jmp.example | password123 |
| Admin | admin@jmp.example | password123 |
