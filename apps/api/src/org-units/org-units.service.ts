import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { CreateOrgUnitDto } from './dto/create-org-unit.dto';
import { UpdateOrgUnitDto } from './dto/update-org-unit.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class OrgUnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(actor: AuthenticatedUser) {
    const where: Record<string, unknown> = actor.isAdmin
      ? { isActive: true }
      : {
          isActive: true,
          id: { in: [...actor.managedOrgUnitIds, ...actor.memberOrgUnitIds] },
        };

    return this.prisma.orgUnit.findMany({
      where,
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { members: true, events: true } },
      },
    });
  }

  async findOne(id: string, actor?: AuthenticatedUser) {
    const unit = await this.prisma.orgUnit.findUnique({
      where: { id, isActive: true },
      include: {
        parent: { select: { id: true, name: true } },
        children: {
          where: { isActive: true },
          select: { id: true, name: true, level: true },
        },
        _count: { select: { members: true } },
      },
    });
    if (!unit) throw new NotFoundException('OrgUnit not found');
    if (actor && !actor.isAdmin) {
      const canAccess =
        actor.managedOrgUnitIds.includes(id) ||
        actor.memberOrgUnitIds.includes(id);
      if (!canAccess) throw new ForbiddenException();
    }
    return unit;
  }

  async getDescendants(id: string, actor?: AuthenticatedUser): Promise<string[]> {
    if (actor && !actor.isAdmin) {
      const canAccess =
        actor.managedOrgUnitIds.includes(id) ||
        actor.memberOrgUnitIds.includes(id);
      if (!canAccess) throw new ForbiddenException();
    }
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      WITH RECURSIVE desc_units AS (
        SELECT id FROM "OrgUnit" WHERE id = ${id}
        UNION ALL
        SELECT o.id FROM "OrgUnit" o
        JOIN desc_units d ON o."parentId" = d.id
        WHERE o."isActive" = true
      )
      SELECT id FROM desc_units
    `;
    return rows.map((r) => r.id);
  }

  async create(dto: CreateOrgUnitDto, actor: AuthenticatedUser) {
    if (!actor.isAdmin) throw new ForbiddenException();
    return this.prisma.orgUnit.create({ data: dto });
  }

  async update(id: string, dto: UpdateOrgUnitDto, actor: AuthenticatedUser) {
    if (!actor.isAdmin) throw new ForbiddenException();
    await this.findOne(id);
    return this.prisma.orgUnit.update({ where: { id }, data: dto });
  }

  async remove(id: string, actor: AuthenticatedUser) {
    if (!actor.isAdmin) throw new ForbiddenException();
    const unit = await this.prisma.orgUnit.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });
    if (!unit) throw new NotFoundException('OrgUnit not found');
    if (unit._count.members > 0) {
      throw new BadRequestException('Cannot delete OrgUnit with active members');
    }
    return this.prisma.orgUnit.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  // ─── Member management ───────────────────────────────────────────────────
  async getMembers(orgUnitId: string, actor: AuthenticatedUser) {
    const canAccess =
      actor.isAdmin ||
      actor.managedOrgUnitIds.includes(orgUnitId) ||
      actor.memberOrgUnitIds.includes(orgUnitId);
    if (!canAccess) throw new ForbiddenException();

    return this.prisma.userOrgUnit.findMany({
      where: { orgUnitId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
        },
      },
    });
  }

  async addMember(
    orgUnitId: string,
    dto: AddMemberDto,
    actor: AuthenticatedUser,
  ) {
    const canManage =
      actor.isAdmin || actor.managedOrgUnitIds.includes(orgUnitId);
    if (!canManage) throw new ForbiddenException();

    const existing = await this.prisma.userOrgUnit.findUnique({
      where: {
        userId_orgUnitId: { userId: dto.userId, orgUnitId },
      },
    });
    if (existing) throw new ConflictException('User already member of this OrgUnit');

    return this.prisma.userOrgUnit.create({
      data: { userId: dto.userId, orgUnitId, role: dto.role },
    });
  }

  async removeMember(
    orgUnitId: string,
    userId: string,
    actor: AuthenticatedUser,
  ) {
    const canManage =
      actor.isAdmin || actor.managedOrgUnitIds.includes(orgUnitId);
    if (!canManage) throw new ForbiddenException();

    await this.prisma.userOrgUnit.deleteMany({ where: { userId, orgUnitId } });
    return { removed: true };
  }
}
