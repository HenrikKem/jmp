import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { UserQueryDto } from './dto/user-query.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateUserFunctionDto } from './dto/create-user-function.dto';
import { CreateUserAwardDto } from './dto/create-user-award.dto';
import { CreateUserDogDto } from './dto/create-user-dog.dto';
import { CreateUserDogPruefungDto } from './dto/create-user-dog-pruefung.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: UserQueryDto, actor: AuthenticatedUser) {
    const scopeFilter: Record<string, unknown> = actor.isAdmin
      ? {}
      : { orgUnits: { some: { orgUnitId: { in: actor.managedOrgUnitIds } } } };

    const where: Record<string, unknown> = {
      ...scopeFilter,
      isActive: query.active !== false,
    };

    if (query.orgUnitId) {
      if (!actor.isAdmin && !actor.managedOrgUnitIds.includes(query.orgUnitId)) {
        throw new ForbiddenException('Org unit not in your managed scope');
      }
      where.orgUnits = { some: { orgUnitId: query.orgUnitId } };
    }

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { lastName: 'asc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isAdmin: true,
          isActive: true,
          createdAt: true,
          orgUnits: {
            select: {
              role: true,
              orgUnit: { select: { id: true, name: true, level: true } },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({
      where: { id, isActive: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isAdmin: true,
        isActive: true,
        createdAt: true,
        orgUnits: {
          select: {
            role: true,
            orgUnit: { select: { id: true, name: true, level: true } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const userOrgUnitIds = user.orgUnits.map((o) => o.orgUnit.id);
    this.checkUserAccess(id, actor, userOrgUnitIds);
    return user;
  }

  async getProfile(userId: string, actor: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
      include: {
        profile: true,
        orgUnits: { select: { orgUnitId: true } },
        functions: { orderBy: { von: 'desc' } },
        awards: { orderBy: { datum: 'desc' } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const userOrgUnitIds = user.orgUnits.map((o) => o.orgUnitId);
    const canSeePii = this.canSeePii(userId, actor, userOrgUnitIds);
    const canSeeAdminFields = actor.isAdmin;

    const profile = user.profile;
    if (!profile) return { userId, functions: user.functions, awards: user.awards };

    const result: Record<string, unknown> = {
      userId: profile.userId,
      anrede: profile.anrede,
      titel: profile.titel,
      geschlecht: profile.geschlecht,
      nationalitaet: profile.nationalitaet,
      berufsgruppe: profile.berufsgruppe,
      qualifications: profile.qualifications,
      mitgliedJagdverbandSeit: profile.mitgliedJagdverbandSeit,
      functions: user.functions,
      awards: user.awards,
    };

    if (canSeePii) {
      Object.assign(result, {
        briefanrede: profile.briefanrede,
        geburtsort: profile.geburtsort,
        geburtsdatum: profile.geburtsdatum,
        telefonPrivat: profile.telefonPrivat,
        telefonDienstlich: profile.telefonDienstlich,
        telefonHandy: profile.telefonHandy,
        strasse: profile.strasse,
        hausnummer: profile.hausnummer,
        plz: profile.plz,
        ort: profile.ort,
        land: profile.land,
        postfachStrasse: profile.postfachStrasse,
        postfachPlz: profile.postfachPlz,
        postfachOrt: profile.postfachOrt,
        jaegereichennummer: profile.jaegereichennummer,
        ersteWaffenbesitzkarte: profile.ersteWaffenbesitzkarte,
        jaegerpruefungDatum: profile.jaegerpruefungDatum,
        huntingLicenseDate: profile.huntingLicenseDate,
        istExternesMitglied: profile.istExternesMitglied,
      });
    }

    if (canSeeAdminFields) {
      Object.assign(result, {
        externeMitgliedsnummer: profile.externeMitgliedsnummer,
        bemerkungen: profile.bemerkungen,
      });
    }

    return result;
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    actor: AuthenticatedUser,
  ) {
    await this.checkEditAccess(userId, actor);

    // Strip admin-only fields unless admin
    const data: Record<string, unknown> = { ...dto };
    if (!actor.isAdmin) {
      delete data.externeMitgliedsnummer;
      delete data.bemerkungen;
      delete data.istExternesMitglied;
    }

    // Convert date strings to Date objects for Prisma
    if (data.geburtsdatum) data.geburtsdatum = new Date(data.geburtsdatum as string);
    if (data.huntingLicenseDate) data.huntingLicenseDate = new Date(data.huntingLicenseDate as string);

    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return profile;
  }

  // ─── User Functions ───────────────────────────────────────────────────────
  async getFunctions(userId: string, actor: AuthenticatedUser) {
    await this.checkScopeAccess(userId, actor);
    return this.prisma.userFunction.findMany({
      where: { userId },
      orderBy: { von: 'desc' },
    });
  }

  async createFunction(
    userId: string,
    dto: CreateUserFunctionDto,
    actor: AuthenticatedUser,
  ) {
    await this.checkEditAccess(userId, actor);
    return this.prisma.userFunction.create({
      data: {
        userId,
        funktion: dto.funktion,
        orgUnitName: dto.orgUnitName,
        orgUnitId: dto.orgUnitId,
        von: dto.von ? new Date(dto.von) : undefined,
        bis: dto.bis ? new Date(dto.bis) : undefined,
      },
    });
  }

  async deleteFunction(
    userId: string,
    functionId: string,
    actor: AuthenticatedUser,
  ) {
    await this.checkEditAccess(userId, actor);
    await this.prisma.userFunction.deleteMany({
      where: { id: functionId, userId },
    });
    return { deleted: true };
  }

  // ─── User Awards ──────────────────────────────────────────────────────────
  async getAwards(userId: string, actor: AuthenticatedUser) {
    await this.checkScopeAccess(userId, actor);
    return this.prisma.userAward.findMany({
      where: { userId },
      orderBy: { datum: 'desc' },
    });
  }

  async createAward(
    userId: string,
    dto: CreateUserAwardDto,
    actor: AuthenticatedUser,
  ) {
    await this.checkEditAccess(userId, actor);
    return this.prisma.userAward.create({
      data: {
        userId,
        bezeichnung: dto.bezeichnung,
        datum: dto.datum ? new Date(dto.datum) : undefined,
      },
    });
  }

  async deleteAward(
    userId: string,
    awardId: string,
    actor: AuthenticatedUser,
  ) {
    await this.checkEditAccess(userId, actor);
    await this.prisma.userAward.deleteMany({ where: { id: awardId, userId } });
    return { deleted: true };
  }

  // ─── Dogs ─────────────────────────────────────────────────────────────────

  async getDogs(userId: string, actor: AuthenticatedUser) {
    await this.checkScopeAccess(userId, actor);
    return this.prisma.userDog.findMany({
      where: { userId },
      include: { pruefungen: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createDog(userId: string, dto: CreateUserDogDto, actor: AuthenticatedUser) {
    await this.checkEditAccess(userId, actor);
    return this.prisma.userDog.create({
      data: { userId, name: dto.name, rasse: dto.rasse, geburtsjahr: dto.geburtsjahr },
      include: { pruefungen: true },
    });
  }

  async deleteDog(userId: string, dogId: string, actor: AuthenticatedUser) {
    await this.checkEditAccess(userId, actor);
    await this.prisma.userDog.deleteMany({ where: { id: dogId, userId } });
    return { deleted: true };
  }

  async createPruefung(
    userId: string,
    dogId: string,
    dto: CreateUserDogPruefungDto,
    actor: AuthenticatedUser,
  ) {
    this.checkOrganizerOrAdminAccess(actor);
    // Verify dog belongs to user
    const dog = await this.prisma.userDog.findFirst({ where: { id: dogId, userId } });
    if (!dog) throw new NotFoundException('Dog not found');
    return this.prisma.userDogPruefung.create({
      data: {
        dogId,
        pruefungsart: dto.pruefungsart,
        datum: dto.datum ? new Date(dto.datum) : undefined,
      },
    });
  }

  async deletePruefung(
    userId: string,
    dogId: string,
    pruefungId: string,
    actor: AuthenticatedUser,
  ) {
    this.checkOrganizerOrAdminAccess(actor);
    const dog = await this.prisma.userDog.findFirst({ where: { id: dogId, userId } });
    if (!dog) throw new NotFoundException('Dog not found');
    await this.prisma.userDogPruefung.deleteMany({ where: { id: pruefungId, dogId } });
    return { deleted: true };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Read-only access: self, admin, or organizer whose scope includes the target user. */
  private checkUserAccess(
    userId: string,
    actor: AuthenticatedUser,
    userOrgUnitIds: string[],
  ): void {
    if (actor.isAdmin || actor.id === userId) return;
    if (actor.managedOrgUnitIds.some((id) => userOrgUnitIds.includes(id)))
      return;
    throw new ForbiddenException();
  }

  /** Read-only scope check via DB when org unit IDs are not pre-loaded. */
  private async checkScopeAccess(
    targetUserId: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    if (actor.isAdmin || actor.id === targetUserId) return;
    if (actor.managedOrgUnitIds.length === 0) throw new ForbiddenException();
    const membership = await this.prisma.userOrgUnit.findFirst({
      where: { userId: targetUserId, orgUnitId: { in: actor.managedOrgUnitIds } },
    });
    if (!membership) throw new ForbiddenException();
  }

  /** Write access: self, admin, or organizer whose scope includes the target user. */
  private async checkEditAccess(
    targetUserId: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    if (actor.isAdmin || actor.id === targetUserId) return;
    if (actor.managedOrgUnitIds.length === 0) throw new ForbiddenException();
    const membership = await this.prisma.userOrgUnit.findFirst({
      where: { userId: targetUserId, orgUnitId: { in: actor.managedOrgUnitIds } },
    });
    if (!membership) throw new ForbiddenException();
  }

  /** Only organizers (with managed scope) or admins can perform this action. */
  private checkOrganizerOrAdminAccess(actor: AuthenticatedUser): void {
    if (actor.isAdmin) return;
    if (actor.managedOrgUnitIds.length > 0) return;
    throw new ForbiddenException('Only organizers or admins can perform this action');
  }

  private canSeePii(
    userId: string,
    actor: AuthenticatedUser,
    userOrgUnitIds: string[],
  ): boolean {
    if (actor.id === userId) return true;
    if (actor.isAdmin) return true;
    if (actor.managedOrgUnitIds.some((id) => userOrgUnitIds.includes(id)))
      return true;
    return false;
  }
}
