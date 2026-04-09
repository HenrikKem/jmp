import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { OrgRole } from '@prisma/client';
import { OrgUnitsService } from './org-units.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.interface';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 'user_1',
    email: 'test@jagd.de',
    name: 'Test User',
    isAdmin: false,
    managedOrgUnitIds: [],
    memberOrgUnitIds: [],
    ...overrides,
  };
}

function makeOrgUnit(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ou_1',
    name: 'Hegering Süd',
    level: 'HEGERING',
    isActive: true,
    parentId: null,
    deletedAt: null,
    _count: { members: 0 },
    ...overrides,
  };
}

// ─── Prisma mock ──────────────────────────────────────────────────────────────

const prismaMock = {
  orgUnit: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  userOrgUnit: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  $queryRaw: jest.fn(),
} as unknown as PrismaService;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OrgUnitsService', () => {
  let service: OrgUnitsService;
  let prisma: {
    orgUnit: { [K: string]: jest.Mock };
    userOrgUnit: { [K: string]: jest.Mock };
    $queryRaw: jest.Mock;
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrgUnitsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<OrgUnitsService>(OrgUnitsService);
    prisma = module.get(PrismaService);
  });

  // ─── addMember() ───────────────────────────────────────────────────────────

  describe('addMember()', () => {
    it('should create UserOrgUnit record when organizer has orgUnit in their managedOrgUnitIds', async () => {
      const organizer = makeUser({ managedOrgUnitIds: ['ou_1'] });
      (prisma.userOrgUnit.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.userOrgUnit.create as jest.Mock).mockResolvedValue({
        userId: 'new_user',
        orgUnitId: 'ou_1',
        role: OrgRole.MEMBER,
      });

      await service.addMember('ou_1', { userId: 'new_user', role: OrgRole.MEMBER }, organizer);

      expect(prisma.userOrgUnit.create).toHaveBeenCalledWith({
        data: { userId: 'new_user', orgUnitId: 'ou_1', role: OrgRole.MEMBER },
      });
    });

    it('should create UserOrgUnit record when actor is admin (regardless of managed units)', async () => {
      const admin = makeUser({ isAdmin: true, managedOrgUnitIds: [] });
      (prisma.userOrgUnit.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.userOrgUnit.create as jest.Mock).mockResolvedValue({
        userId: 'new_user',
        orgUnitId: 'ou_99',
        role: OrgRole.MEMBER,
      });

      await service.addMember('ou_99', { userId: 'new_user', role: OrgRole.MEMBER }, admin);

      expect(prisma.userOrgUnit.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when organizer does not have orgUnit in their managedOrgUnitIds', async () => {
      const organizer = makeUser({ managedOrgUnitIds: ['ou_other'] }); // ou_1 not included

      await expect(
        service.addMember('ou_1', { userId: 'new_user', role: OrgRole.MEMBER }, organizer),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.userOrgUnit.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when plain member tries to add another member', async () => {
      const member = makeUser({
        managedOrgUnitIds: [],
        memberOrgUnitIds: ['ou_1'],
      });

      await expect(
        service.addMember('ou_1', { userId: 'new_user', role: OrgRole.MEMBER }, member),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when user is already a member of the orgUnit', async () => {
      const admin = makeUser({ isAdmin: true });
      (prisma.userOrgUnit.findUnique as jest.Mock).mockResolvedValue({
        userId: 'existing_user',
        orgUnitId: 'ou_1',
        role: OrgRole.MEMBER,
      });

      await expect(
        service.addMember('ou_1', { userId: 'existing_user', role: OrgRole.MEMBER }, admin),
      ).rejects.toThrow(ConflictException);

      expect(prisma.userOrgUnit.create).not.toHaveBeenCalled();
    });

    it('should check uniqueness using userId_orgUnitId composite key', async () => {
      const admin = makeUser({ isAdmin: true });
      (prisma.userOrgUnit.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.userOrgUnit.create as jest.Mock).mockResolvedValue({});

      await service.addMember('ou_1', { userId: 'user_2', role: OrgRole.MEMBER }, admin);

      expect(prisma.userOrgUnit.findUnique).toHaveBeenCalledWith({
        where: {
          userId_orgUnitId: { userId: 'user_2', orgUnitId: 'ou_1' },
        },
      });
    });
  });

  // ─── removeMember() ────────────────────────────────────────────────────────

  describe('removeMember()', () => {
    it('should call deleteMany when organizer has the orgUnit in their managedOrgUnitIds', async () => {
      const organizer = makeUser({ managedOrgUnitIds: ['ou_1'] });
      (prisma.userOrgUnit.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.removeMember('ou_1', 'user_2', organizer);

      expect(prisma.userOrgUnit.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user_2', orgUnitId: 'ou_1' },
      });
    });

    it('should call deleteMany when actor is admin', async () => {
      const admin = makeUser({ isAdmin: true });
      (prisma.userOrgUnit.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.removeMember('ou_99', 'user_2', admin);

      expect(prisma.userOrgUnit.deleteMany).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when actor is a member (not organizer, not admin)', async () => {
      const member = makeUser({
        isAdmin: false,
        managedOrgUnitIds: [],
        memberOrgUnitIds: ['ou_1'],
      });

      await expect(service.removeMember('ou_1', 'user_2', member)).rejects.toThrow(
        ForbiddenException,
      );

      expect(prisma.userOrgUnit.deleteMany).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when organizer manages a different orgUnit', async () => {
      const organizer = makeUser({ managedOrgUnitIds: ['ou_other'] });

      await expect(service.removeMember('ou_1', 'user_2', organizer)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return removed: true on success', async () => {
      const admin = makeUser({ isAdmin: true });
      (prisma.userOrgUnit.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await service.removeMember('ou_1', 'user_2', admin);

      expect(result).toEqual({ removed: true });
    });
  });

  // ─── remove() ──────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('should throw ForbiddenException when actor is not admin', async () => {
      const member = makeUser({ isAdmin: false });

      await expect(service.remove('ou_1', member)).rejects.toThrow(ForbiddenException);

      expect(prisma.orgUnit.findUnique).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when orgUnit has active members', async () => {
      const admin = makeUser({ isAdmin: true });
      (prisma.orgUnit.findUnique as jest.Mock).mockResolvedValue(
        makeOrgUnit({ _count: { members: 3 } }),
      );

      await expect(service.remove('ou_1', admin)).rejects.toThrow(BadRequestException);

      expect(prisma.orgUnit.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when orgUnit does not exist', async () => {
      const admin = makeUser({ isAdmin: true });
      (prisma.orgUnit.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.remove('nonexistent_ou', admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should soft-delete (set isActive: false and deletedAt) when admin removes orgUnit with no members', async () => {
      const admin = makeUser({ isAdmin: true });
      (prisma.orgUnit.findUnique as jest.Mock).mockResolvedValue(
        makeOrgUnit({ _count: { members: 0 } }),
      );
      (prisma.orgUnit.update as jest.Mock).mockResolvedValue({
        id: 'ou_1',
        isActive: false,
        deletedAt: new Date(),
      });

      await service.remove('ou_1', admin);

      expect(prisma.orgUnit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ou_1' },
          data: expect.objectContaining({
            isActive: false,
            deletedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  // ─── getDescendants() ──────────────────────────────────────────────────────

  describe('getDescendants()', () => {
    it('should map raw query result rows to an array of IDs', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        { id: 'ou_1' },
        { id: 'ou_2' },
        { id: 'ou_3' },
      ]);

      const result = await service.getDescendants('ou_1');

      expect(result).toEqual(['ou_1', 'ou_2', 'ou_3']);
    });

    it('should return an array with just the root id when there are no descendants', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ id: 'ou_leaf' }]);

      const result = await service.getDescendants('ou_leaf');

      expect(result).toEqual(['ou_leaf']);
    });

    it('should return an empty array when raw query returns no rows', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const result = await service.getDescendants('ou_gone');

      expect(result).toEqual([]);
    });
  });

  // ─── findAll() ─────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should apply only isActive filter for admin — no id restriction', async () => {
      const admin = makeUser({ isAdmin: true });
      (prisma.orgUnit.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll(admin);

      expect(prisma.orgUnit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });

    it('should restrict to managed and member org unit IDs for non-admin', async () => {
      const organizer = makeUser({
        isAdmin: false,
        managedOrgUnitIds: ['ou_1', 'ou_2'],
        memberOrgUnitIds: ['ou_3'],
      });
      (prisma.orgUnit.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll(organizer);

      const callArgs = (prisma.orgUnit.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where).toEqual({
        isActive: true,
        id: { in: ['ou_1', 'ou_2', 'ou_3'] },
      });
    });
  });

  // ─── create() ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('should throw ForbiddenException when actor is not admin', async () => {
      const member = makeUser({ isAdmin: false });

      await expect(
        service.create({ name: 'Neues Hegering', level: 'HEGERING' as any }, member),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create org unit when actor is admin', async () => {
      const admin = makeUser({ isAdmin: true });
      (prisma.orgUnit.create as jest.Mock).mockResolvedValue(makeOrgUnit());

      await service.create({ name: 'Neues Hegering', level: 'HEGERING' as any }, admin);

      expect(prisma.orgUnit.create).toHaveBeenCalled();
    });
  });
});
