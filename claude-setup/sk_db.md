---
name: database-schema
description: >
  Create and modify Prisma schema, generate migrations, seed data, and manage the PostgreSQL database.
  Use this skill whenever the task involves database tables, columns, relations, indexes, enums,
  migrations, seed scripts, or any Prisma schema changes. Also trigger when someone mentions
  'model', 'entity', 'table', 'migration', 'schema', 'database', 'DB', 'relation', 'foreign key',
  'index', or asks to add/change a field on any domain entity.
---

# Database & Schema Skill

Manages the Prisma schema, migrations, and database patterns for any project using the React + NestJS + PostgreSQL stack.

## Stack

- **ORM**: Prisma (v5+)
- **Database**: PostgreSQL 15+
- **Schema location**: `apps/api/prisma/schema.prisma`
- **Migrations**: `apps/api/prisma/migrations/`
- **Seed**: `apps/api/prisma/seed.ts`

## Before Any Schema Work

1. Read `CLAUDE.md` (or project README) to understand the domain model
2. Run `cat apps/api/prisma/schema.prisma` to see the current schema
3. Run `ls apps/api/prisma/migrations/` to check migration history
4. Identify all entities and their relationships before writing anything

## Schema Conventions

### Naming

| Item | Convention | Example |
|------|-----------|---------|
| Models | PascalCase singular | `Customer`, `Order`, `Invoice` |
| Fields | camelCase | `firstName`, `createdAt`, `orderId` |
| Enums | PascalCase name, SCREAMING_SNAKE values | `OrderStatus.IN_PROGRESS` |
| Relations | named descriptively | `@relation("CustomerOrders")` |
| Tables | Prisma default (model name) — do NOT use `@@map` unless required |

### ID Strategy

```prisma
id String @id @default(cuid())
```

Use CUID for all primary keys — URL-safe, sortable, no collisions.

### Required Audit Fields (every model)

```prisma
createdAt   DateTime  @default(now())
updatedAt   DateTime  @updatedAt
createdById String
createdBy   User      @relation("CreatedByX", fields: [createdById], references: [id])
```

### Soft Delete Pattern

```prisma
deletedAt   DateTime?
isActive    Boolean   @default(true)
```

Use soft deletes on all core entities. Never hard-delete domain data.

### Money Fields

```prisma
amount Decimal @db.Decimal(12, 2)
```

### Timestamps

Always use `DateTime` with `@default(now())` or `@updatedAt`.

## Relation Patterns

### One-to-Many (standard)

```prisma
model Parent {
  id       String  @id @default(cuid())
  children Child[]
}

model Child {
  id       String @id @default(cuid())
  parentId String
  parent   Parent @relation(fields: [parentId], references: [id])

  @@index([parentId])
}
```

### Ownership Chain

If the project uses RBAC with ownership-based filtering, every entity must be traceable to an owner (User) through its parent chain:

```
User → owns → TopLevelEntity → contains → ChildEntity → contains → GrandchildEntity
```

```prisma
model TopLevelEntity {
  ownerId String
  owner   User @relation("OwnedEntities", fields: [ownerId], references: [id])
}
```

## Index Strategy

Add indexes for:

1. **Every foreign key** — Prisma does NOT auto-index these
2. **Search fields** — name, phone, email, title
3. **Frequently filtered fields** — status, type, date ranges
4. **Compound indexes** — for common multi-field queries

```prisma
@@index([parentId])              // FK
@@index([lastName, firstName])   // search
@@index([status])                // filter
@@index([parentId, status])      // compound query pattern
@@index([parentId, occurredAt])  // compound: items for parent sorted by date
```

### When NOT to Index

- Boolean fields with low cardinality (unless combined in compound)
- Fields that are rarely queried
- Tables with < 1000 rows (full scan is fine)

## Migration Workflow

### Creating a migration

```bash
cd apps/api
npx prisma migrate dev --name descriptive_name
```

### Naming convention

- `init` — initial schema
- `add_order_model` — adding a new model
- `add_phone_index_to_contact` — adding an index
- `add_notes_to_project` — adding a field
- `add_status_value_to_enum` — adding an enum value

### Rules

1. **Never** edit a migration after it has been applied
2. **Never** delete migration files
3. **Always** review generated SQL before applying
4. One logical change per migration (don't mix unrelated changes)
5. Test migrations against seed data before committing

## Seed Data

Location: `apps/api/prisma/seed.ts`

Seed must include realistic data for all domain entities, created in dependency order and cleaned in reverse dependency order.

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Clean in reverse dependency order
  await prisma.childEntity.deleteMany();
  await prisma.parentEntity.deleteMany();
  await prisma.user.deleteMany();

  // Seed in dependency order
  const admin = await prisma.user.create({ data: { /* ... */ } });
  const parent = await prisma.parentEntity.create({ data: { /* ... */ } });
  // ...
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### Seed data guidelines

- Include all user roles defined in the project
- Create enough records to test pagination (20+ for main entities)
- Mix statuses and states for realistic testing
- Use realistic-looking data (not "test1", "test2")
- If multi-tenant, seed data for multiple tenants to test isolation

## Prisma Client Usage in NestJS

### PrismaService

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

### PrismaModule (Global)

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

## New Model Template

Every new model should follow this template:

```prisma
model NewEntity {
  id          String    @id @default(cuid())

  // Domain fields
  name        String
  status      EntityStatus @default(ACTIVE)

  // Relations
  parentId    String
  parent      ParentModel @relation(fields: [parentId], references: [id])
  children    ChildModel[]

  // Ownership (if RBAC is used)
  ownerId     String?
  owner       User?     @relation("OwnedEntities", fields: [ownerId], references: [id])

  // Audit fields (required)
  isActive    Boolean   @default(true)
  deletedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  createdById String
  createdBy   User      @relation("EntityCreatedBy", fields: [createdById], references: [id])

  // Indexes
  @@index([parentId])
  @@index([status])
  @@index([ownerId])
}
```

## Checklist Before Committing Schema Changes

- [ ] All models have audit fields (createdAt, updatedAt, createdById)
- [ ] Core entities have soft delete (deletedAt, isActive)
- [ ] All foreign keys have explicit indexes
- [ ] Search fields are indexed
- [ ] Enum values match the project specification
- [ ] Migration name is descriptive
- [ ] Seed data updated if new models added
- [ ] `npx prisma validate` passes
- [ ] `npx prisma generate` runs without errors
- [ ] Generated SQL reviewed before applying
