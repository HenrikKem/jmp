---
name: auth-rbac
description: >
  Implement and modify authentication, authorization, role-based access control (RBAC), and
  ownership-based data filtering. Use this skill whenever the task involves login, registration,
  JWT tokens, guards, roles, permissions, access control, user hierarchy, data visibility rules,
  or who can see/edit/delete what. Also trigger when someone mentions 'role', 'permission',
  'guard', 'ownership', 'hierarchy', 'access denied', 'tenant', 'multi-tenant', or asks why
  a user can or cannot see certain data.
---

# Auth & RBAC Skill

Authentication and role-based access control for NestJS + Prisma projects.

## Stack

- **Auth**: JWT (access + refresh tokens)
- **Hashing**: bcrypt
- **Guards**: NestJS Guards
- **Location**: `apps/api/src/auth/`

## Before Implementing Auth

1. Read `CLAUDE.md` or project README to understand the role hierarchy
2. Read the Prisma schema to understand the User model and ownership relations
3. Identify all roles and what data each role can access

## Role Hierarchy Pattern

Define your project's hierarchy in `CLAUDE.md`. Example structures:

**Simple (2-tier):**
```
ADMIN → full access
USER  → own data only
```

**Team-based (3-tier):**
```
ADMIN
├── MANAGER (sees team data)
│   ├── MEMBER (own data only)
│   └── MEMBER
```

**Multi-tenant:**
```
SUPER_ADMIN (cross-tenant)
├── TENANT_ADMIN (full access within tenant)
│   ├── MANAGER (team within tenant)
│   │   └── USER (own data)
```

Adapt the examples below to match your project's hierarchy.

## Access Rules Matrix Template

Define this per project:

| Entity | Basic Role | Manager Role | Admin Role |
|--------|-----------|-------------|-----------|
| Own Data | CRUD | CRUD | CRUD |
| Team Data | — | Read + Enrich | CRUD |
| All Data | — | — | CRUD |
| Users | Read self | Read team | Full CRUD |
| Settings | — | — | Full |

**"Enrich"** = can add child records (notes, comments, tasks) but cannot delete core entities or reassign ownership.

## JWT Token Strategy

### Access Token

```typescript
{
  sub: string;          // user ID
  email: string;
  role: UserRole;
  supervisorId?: string;
  iat: number;
  exp: number;          // 15 minutes
}
```

### Refresh Token

```typescript
{
  sub: string;
  tokenVersion: number; // for invalidation
  exp: number;          // 7 days
}
```

### Token Flow

1. `POST /auth/login` → returns `{ accessToken, refreshToken }`
2. Client stores refresh token (httpOnly cookie preferred)
3. Access token sent as `Authorization: Bearer <token>`
4. `POST /auth/refresh` → new access token
5. `POST /auth/logout` → increments tokenVersion, invalidating all refresh tokens

## Auth Service Implementation

```typescript
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { subordinates: { select: { id: true } } },
    });
    if (!user || !user.isActive) throw new UnauthorizedException();

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException();

    return this.generateTokens(user);
  }

  async refresh(refreshToken: string) {
    const payload = this.jwtService.verify(refreshToken, { secret: process.env.JWT_REFRESH_SECRET });
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException();
    }
    return this.generateTokens(user);
  }

  private generateTokens(user: User & { subordinates?: { id: string }[] }) {
    const subordinateIds = user.subordinates?.map(s => s.id) ?? [];
    const accessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      supervisorId: user.supervisorId,
      subordinateIds,
    };
    return {
      accessToken: this.jwtService.sign(accessPayload, { expiresIn: '15m' }),
      refreshToken: this.jwtService.sign(
        { sub: user.id, tokenVersion: user.tokenVersion },
        { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' },
      ),
    };
  }
}
```

## Guards

### RolesGuard

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
```

### Usage

```typescript
@Roles(UserRole.ADMIN)
@Get('admin-only')
adminEndpoint() { ... }
```

## Decorators

### @CurrentUser

```typescript
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;
    return data ? user?.[data] : user;
  },
);
```

### @Roles

```typescript
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
```

## AuthenticatedUser Type

```typescript
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  supervisorId?: string;
  subordinateIds: string[];
}
```

This is what `@CurrentUser()` returns. Including `subordinateIds` avoids extra DB calls in services.

## Data Filtering Pattern

Every service that returns data must filter by ownership:

```typescript
private buildOwnershipFilter(user: AuthenticatedUser) {
  switch (user.role) {
    case 'ADMIN':
      return {}; // no filter — sees everything
    case 'MANAGER':
      return { ownerId: { in: [user.id, ...user.subordinateIds] } };
    case 'USER':
      return { ownerId: user.id };
    default:
      return { ownerId: user.id }; // deny by default
  }
}
```

Apply in every query:

```typescript
const where = { isActive: true, ...this.buildOwnershipFilter(user) };
```

## Ownership Traversal

Not all entities have a direct `ownerId`. Traverse up through the ownership chain:

```typescript
private async checkEntityAccess(entityId: string, user: AuthenticatedUser) {
  const entity = await this.prisma.childEntity.findUnique({
    where: { id: entityId },
    include: { parent: { select: { ownerId: true } } },
  });
  if (!entity) throw new NotFoundException();

  const ownerId = entity.parent.ownerId;
  if (user.role === 'ADMIN') return entity;
  if (user.role === 'USER' && ownerId !== user.id) throw new ForbiddenException();
  if (user.role === 'MANAGER' && ![user.id, ...user.subordinateIds].includes(ownerId)) {
    throw new ForbiddenException();
  }
  return entity;
}
```

## Manager "Enrich" Permission

If your project has a manager role that can add data but not delete core entities:

```typescript
// What MANAGER CAN do on team data:
// ✅ Create child records (notes, comments, tasks)
// ✅ Upload documents
// ✅ Update non-critical fields

// What they CANNOT do:
// ❌ Delete parent entities
// ❌ Change entity.ownerId
// ❌ Modify other users

// Enforce in update methods:
if (user.role === 'MANAGER' && dto.ownerId && dto.ownerId !== existingOwner) {
  throw new ForbiddenException('Cannot reassign ownership');
}
```

## Password Policy

```typescript
const PASSWORD_MIN_LENGTH = 8;
const SALT_ROUNDS = 12;
const hash = await bcrypt.hash(password, SALT_ROUNDS);
```

## Environment Variables

```env
JWT_SECRET=<random-64-char>
JWT_REFRESH_SECRET=<different-random-64-char>
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
```

## Checklist for Access Control

- [ ] Every controller has `@UseGuards(JwtAuthGuard, RolesGuard)`
- [ ] Every service method receives `AuthenticatedUser`
- [ ] `findAll` filters by ownership (never returns all data to non-admin)
- [ ] `findOne` checks access before returning
- [ ] `update` prevents ownership reassignment by non-admin
- [ ] `delete` (soft) checks ownership
- [ ] Nested resources traverse up to root entity for ownership check
- [ ] Manager/enrichment permissions enforced where applicable
- [ ] Passwords hashed with bcrypt (cost 12)
- [ ] Refresh tokens use separate secret
