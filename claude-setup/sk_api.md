---
name: api-nestjs
description: >
  Build and modify NestJS API modules, controllers, services, and DTOs.
  Use this skill whenever the task involves creating endpoints, REST routes, request validation,
  response formatting, error handling, pagination, filtering, or any backend logic in NestJS.
  Also trigger when someone mentions 'endpoint', 'route', 'controller', 'service', 'DTO', 'API',
  'CRUD', 'module', 'guard', 'pipe', 'interceptor', or asks to expose data from the database
  to the frontend. This skill works hand-in-hand with the database-schema skill.
---

# API Skill (NestJS)

Patterns and conventions for building REST APIs with NestJS.

## Stack

- **Framework**: NestJS v10+
- **Language**: TypeScript (strict mode)
- **Validation**: class-validator + class-transformer
- **Database**: Prisma (via PrismaService)
- **Auth**: JWT + Guards (see auth-rbac skill)
- **Location**: `apps/api/src/`

## Before Writing Any API Code

1. Read `CLAUDE.md` or project README for domain context
2. Run `cat apps/api/prisma/schema.prisma` to see available models
3. Run `find apps/api/src -name "*.ts" | head -40` to understand existing structure
4. Check if the Prisma model exists — if not, create it first (database-schema skill)

## Module Structure

Every domain gets its own NestJS module:

```
apps/api/src/
├── app.module.ts
├── main.ts
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── guards/
│   ├── decorators/
│   └── dto/
├── {domain}/                    # One per domain entity
│   ├── {domain}.module.ts
│   ├── {domain}.controller.ts
│   ├── {domain}.service.ts
│   └── dto/
│       ├── create-{entity}.dto.ts
│       ├── update-{entity}.dto.ts
│       └── {entity}-query.dto.ts
└── common/
    ├── dto/
    │   └── pagination.dto.ts
    ├── interceptors/
    │   └── transform.interceptor.ts
    ├── filters/
    │   └── prisma-exception.filter.ts
    └── pipes/
        └── parse-cuid.pipe.ts
```

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Module | `{domain}.module.ts` | `orders.module.ts` |
| Controller | `{domain}.controller.ts` | `orders.controller.ts` |
| Service | `{domain}.service.ts` | `orders.service.ts` |
| Create DTO | `create-{entity}.dto.ts` | `create-order.dto.ts` |
| Update DTO | `update-{entity}.dto.ts` | `update-order.dto.ts` |
| Query DTO | `{entity}-query.dto.ts` | `order-query.dto.ts` |
| Guard | `{name}.guard.ts` | `roles.guard.ts` |

## Controller Pattern

```typescript
import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {

  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.create(dto, user);
  }

  @Get()
  findAll(
    @Query() query: OrderQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.findAll(query, user);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.findOne(id, user);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.update(id, dto, user);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.softDelete(id, user);
  }
}
```

## Service Pattern

```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrderDto, user: AuthenticatedUser) {
    return this.prisma.order.create({
      data: {
        ...dto,
        ownerId: user.id,
        createdById: user.id,
      },
    });
  }

  async findAll(query: OrderQueryDto, user: AuthenticatedUser) {
    const where = this.buildWhereClause(query, user);
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const entity = await this.prisma.order.findUnique({
      where: { id, isActive: true },
    });
    if (!entity) throw new NotFoundException('Order not found');
    this.checkAccess(entity, user);
    return entity;
  }

  async softDelete(id: string, user: AuthenticatedUser) {
    const entity = await this.findOne(id, user);
    return this.prisma.order.update({
      where: { id: entity.id },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  private buildWhereClause(query: OrderQueryDto, user: AuthenticatedUser) {
    const where: any = { isActive: true };

    // Apply RBAC ownership filter — adapt roles to your project
    where.ownerId = this.buildOwnershipFilter(user);

    // Apply search if provided
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        // Add more searchable fields as needed
      ];
    }

    return where;
  }

  private buildOwnershipFilter(user: AuthenticatedUser) {
    // Adapt this to your project's role hierarchy
    // See auth-rbac skill for the full pattern
    if (user.role === 'ADMIN') return undefined; // no filter
    return user.id; // default: own data only
  }

  private checkAccess(entity: any, user: AuthenticatedUser) {
    if (user.role === 'ADMIN') return;
    if (entity.ownerId !== user.id) throw new ForbiddenException();
  }
}
```

## DTO Pattern

```typescript
import { IsString, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @IsString()
  name: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsEnum(OrderStatus)
  status?: OrderStatus;
}
```

## Pagination Pattern

```typescript
import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize?: number = 20;

  @IsOptional() @IsString()
  sortBy?: string;

  @IsOptional() @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  get skip(): number { return ((this.page ?? 1) - 1) * (this.pageSize ?? 20); }
  get take(): number { return this.pageSize ?? 20; }
}
```

## API Response Format

All list endpoints return:

```json
{ "items": [...], "total": 42, "page": 1, "pageSize": 20 }
```

Single endpoints return the entity directly. Errors use NestJS exceptions.

## Route Naming

| Method | Route | Action |
|--------|-------|--------|
| `POST` | `/{entities}` | Create |
| `GET` | `/{entities}` | List (paginated) |
| `GET` | `/{entities}/:id` | Get one |
| `PUT` | `/{entities}/:id` | Update |
| `DELETE` | `/{entities}/:id` | Soft delete |
| `GET` | `/{entities}/:id/{children}` | Nested list |
| `GET` | `/search?q=term` | Global search |

## Nested Resources

Child entities accessed through their parent:

```
GET    /projects/:projectId/tasks
POST   /projects/:projectId/tasks
GET    /projects/:projectId/tasks/:id
PUT    /projects/:projectId/tasks/:id
DELETE /projects/:projectId/tasks/:id
```

## Error Handling

```typescript
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    switch (exception.code) {
      case 'P2002': response.status(409).json({ statusCode: 409, message: 'Record already exists' }); break;
      case 'P2025': response.status(404).json({ statusCode: 404, message: 'Record not found' }); break;
      default: response.status(500).json({ statusCode: 500, message: 'Internal server error' });
    }
  }
}
```

## Checklist for New Endpoint

- [ ] DTO created with class-validator decorations
- [ ] Service method includes RBAC access check
- [ ] Soft delete used (not hard delete)
- [ ] Pagination for list endpoints
- [ ] Includes relevant relations in response
- [ ] Error cases handled (404, 403, 409)
- [ ] Route follows REST naming conventions
- [ ] Guard decorators applied (@UseGuards)
- [ ] CurrentUser decorator used (not raw req.user)
- [ ] Module registered in app.module.ts
