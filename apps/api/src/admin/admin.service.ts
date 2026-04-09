import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { SetMembershipDto } from './dto/set-membership.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getAuditLogs(query: AuditLogQueryDto) {
    const where: Record<string, unknown> = {};

    if (query.actorId) where.actorId = query.actorId;
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.from || query.to) {
      where.timestamp = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { timestamp: 'desc' },
        include: {
          actor: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async exportUserData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        orgUnits: {
          include: {
            orgUnit: { select: { id: true, name: true, level: true } },
          },
        },
        functions: true,
        awards: true,
        registrations: {
          include: {
            event: { select: { id: true, name: true, startDate: true } },
            group: { select: { id: true, name: true } },
          },
        },
        eventRoleAssignments: {
          include: {
            eventRole: { select: { id: true, name: true, eventId: true } },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const auditLogs = await this.prisma.auditLog.findMany({
      where: { actorId: userId },
      orderBy: { timestamp: 'desc' },
      take: 500,
    });

    return {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
      },
      profile: user.profile,
      memberships: user.orgUnits,
      functions: user.functions,
      awards: user.awards,
      registrations: user.registrations,
      eventRoles: user.eventRoleAssignments,
      auditLogs,
    };
  }

  async anonymizeUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.$transaction(async (tx) => {
      // Anonymize profile PII
      await tx.userProfile.upsert({
        where: { userId },
        create: { userId },
        update: {
          anrede: null,
          titel: null,
          geschlecht: null,
          briefanrede: null,
          berufsgruppe: null,
          geburtsort: null,
          geburtsdatum: null,
          nationalitaet: null,
          telefonPrivat: null,
          telefonDienstlich: null,
          telefonHandy: null,
          strasse: null,
          hausnummer: null,
          plz: null,
          ort: null,
          land: null,
          postfachStrasse: null,
          postfachPlz: null,
          postfachOrt: null,
          jaegereichennummer: null,
          ersteWaffenbesitzkarte: null,
          jaegerpruefungDatum: null,
          huntingLicenseDate: null,
          externeMitgliedsnummer: null,
          bemerkungen: null,
          qualifications: {},
        },
      });

      // Remove memberships, functions, awards
      await tx.userOrgUnit.deleteMany({ where: { userId } });
      await tx.userFunction.deleteMany({ where: { userId } });
      await tx.userAward.deleteMany({ where: { userId } });

      // Anonymize user record
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `deleted_${userId}@anonymous.invalid`,
          firstName: 'Gelöschter',
          lastName: 'Benutzer',
          passwordHash: '',
          isActive: false,
          deletedAt: new Date(),
        },
      });

      // Write audit log
      await tx.auditLog.create({
        data: {
          actorId: null,
          action: 'GDPR_ANONYMIZE',
          entityType: 'User',
          entityId: userId,
          newValue: { anonymizedAt: new Date().toISOString() },
        },
      });

      return { anonymized: true, userId };
    });
  }

  async setAdminFlag(userId: string, isAdmin: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isAdmin },
      select: { id: true, email: true, firstName: true, lastName: true, isAdmin: true },
    });
  }

  async addMembership(userId: string, dto: SetMembershipDto) {
    return this.prisma.userOrgUnit.upsert({
      where: {
        userId_orgUnitId: { userId, orgUnitId: dto.orgUnitId },
      },
      create: { userId, orgUnitId: dto.orgUnitId, role: dto.role },
      update: { role: dto.role },
    });
  }

  async removeMembership(userId: string, orgUnitId: string) {
    await this.prisma.userOrgUnit.deleteMany({ where: { userId, orgUnitId } });
    return { removed: true };
  }

  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
