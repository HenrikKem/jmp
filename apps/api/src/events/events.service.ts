import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { CreateEventRoleDto } from './dto/create-event-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { RegistrationStatus } from '@prisma/client';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: EventQueryDto, actor: AuthenticatedUser) {
    const visibleOrgIds = actor.isAdmin
      ? undefined
      : [...actor.managedOrgUnitIds, ...actor.memberOrgUnitIds];

    const where: Record<string, unknown> = { isActive: true };

    if (visibleOrgIds) {
      where.scopeOrgId = { in: visibleOrgIds };
    }
    if (query.published !== undefined) {
      where.isPublished = query.published;
    }
    if (query.orgUnitId) {
      if (visibleOrgIds && !visibleOrgIds.includes(query.orgUnitId)) {
        throw new ForbiddenException('Org unit not in your accessible scope');
      }
      where.scopeOrgId = query.orgUnitId;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { startDate: 'asc' },
        include: {
          scopeOrg: { select: { id: true, name: true, level: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { registrations: true, groups: true } },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const event = await this.prisma.event.findUnique({
      where: { id, isActive: true },
      include: {
        scopeOrg: { select: { id: true, name: true, level: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        groups: { orderBy: { startTime: 'asc' } },
        eventRoles: true,
        _count: { select: { registrations: true } },
      },
    });
    if (!event) throw new NotFoundException('Event not found');
    this.checkEventAccess(event.scopeOrgId, actor);
    return event;
  }

  async create(dto: CreateEventDto, actor: AuthenticatedUser) {
    const canCreate =
      actor.isAdmin || actor.managedOrgUnitIds.includes(dto.scopeOrgId);
    if (!canCreate)
      throw new ForbiddenException('Scope org unit not in your managed scope');

    return this.prisma.event.create({
      data: {
        name: dto.name,
        description: dto.description,
        location: dto.location,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        scopeOrgId: dto.scopeOrgId,
        isPublished: dto.isPublished ?? false,
        createdById: actor.id,
      },
    });
  }

  async update(id: string, dto: UpdateEventDto, actor: AuthenticatedUser) {
    const event = await this.prisma.event.findUnique({
      where: { id, isActive: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    this.checkEventManage(event, actor);

    const data: Record<string, unknown> = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);

    return this.prisma.event.update({ where: { id }, data });
  }

  async remove(id: string, actor: AuthenticatedUser) {
    const event = await this.prisma.event.findUnique({
      where: { id, isActive: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    this.checkEventManage(event, actor);
    return this.prisma.event.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  // ─── Groups ───────────────────────────────────────────────────────────────
  async getGroups(eventId: string, actor: AuthenticatedUser) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId, isActive: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    this.checkEventAccess(event.scopeOrgId, actor);

    return this.prisma.group.findMany({
      where: { eventId },
      orderBy: { startTime: 'asc' },
      include: {
        _count: {
          select: {
            registrations: { where: { status: RegistrationStatus.CONFIRMED } },
          },
        },
      },
    });
  }

  async createGroup(
    eventId: string,
    dto: CreateGroupDto,
    actor: AuthenticatedUser,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId, isActive: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    this.checkEventManage(event, actor);

    return this.prisma.group.create({
      data: {
        eventId,
        name: dto.name,
        capacity: dto.capacity,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
      },
    });
  }

  async updateGroup(
    eventId: string,
    groupId: string,
    dto: CreateGroupDto,
    actor: AuthenticatedUser,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId, isActive: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    this.checkEventManage(event, actor);

    const data: Record<string, unknown> = {
      name: dto.name,
      capacity: dto.capacity,
    };
    if (dto.startTime) data.startTime = new Date(dto.startTime);

    return this.prisma.group.update({ where: { id: groupId }, data });
  }

  async deleteGroup(
    eventId: string,
    groupId: string,
    actor: AuthenticatedUser,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId, isActive: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    this.checkEventManage(event, actor);

    const regCount = await this.prisma.registration.count({
      where: { groupId, status: RegistrationStatus.CONFIRMED },
    });
    if (regCount > 0)
      throw new BadRequestException(
        'Cannot delete group with active registrations',
      );

    await this.prisma.group.delete({ where: { id: groupId } });
    return { deleted: true };
  }

  // ─── EventRoles ───────────────────────────────────────────────────────────
  async getRoles(eventId: string, actor: AuthenticatedUser) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId, isActive: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    this.checkEventAccess(event.scopeOrgId, actor);

    return this.prisma.eventRole.findMany({
      where: { eventId },
      include: {
        assignments: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });
  }

  async createRole(
    eventId: string,
    dto: CreateEventRoleDto,
    actor: AuthenticatedUser,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId, isActive: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    this.checkEventManage(event, actor);
    return this.prisma.eventRole.create({ data: { eventId, ...dto } });
  }

  async assignRole(
    eventId: string,
    roleId: string,
    dto: AssignRoleDto,
    actor: AuthenticatedUser,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId, isActive: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    this.checkEventManage(event, actor);

    return this.prisma.userEventRole.create({
      data: {
        userId: dto.userId,
        eventRoleId: roleId,
        assignedById: actor.id,
      },
    });
  }

  async unassignRole(
    eventId: string,
    roleId: string,
    userId: string,
    actor: AuthenticatedUser,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId, isActive: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    this.checkEventManage(event, actor);
    await this.prisma.userEventRole.deleteMany({
      where: { userId, eventRoleId: roleId },
    });
    return { removed: true };
  }

  // ─── Registrations ────────────────────────────────────────────────────────
  async getRegistrations(eventId: string, actor: AuthenticatedUser) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId, isActive: true },
    });
    if (!event) throw new NotFoundException('Event not found');

    const canSeeAll =
      actor.isAdmin || actor.managedOrgUnitIds.includes(event.scopeOrgId);
    if (!canSeeAll) throw new ForbiddenException();

    return this.prisma.registration.findMany({
      where: { eventId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        group: { select: { id: true, name: true } },
      },
      orderBy: { registeredAt: 'asc' },
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  private checkEventAccess(
    scopeOrgId: string,
    actor: AuthenticatedUser,
  ): void {
    if (actor.isAdmin) return;
    const visible = [...actor.managedOrgUnitIds, ...actor.memberOrgUnitIds];
    if (!visible.includes(scopeOrgId)) throw new ForbiddenException();
  }

  private checkEventManage(
    event: { scopeOrgId: string; createdById: string },
    actor: AuthenticatedUser,
  ): void {
    if (actor.isAdmin) return;
    if (!actor.managedOrgUnitIds.includes(event.scopeOrgId))
      throw new ForbiddenException();
  }
}
