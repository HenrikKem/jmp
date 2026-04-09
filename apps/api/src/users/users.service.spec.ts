import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { UserQueryDto } from './dto/user-query.dto';

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

function makeQuery(overrides: Partial<UserQueryDto> = {}): UserQueryDto {
  const q = new UserQueryDto();
  q.page = 1;
  q.pageSize = 20;
  Object.assign(q, overrides);
  return q;
}

function makeDbUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user_1',
    email: 'hans.mueller@jagd.de',
    name: 'Hans Müller',
    isAdmin: false,
    isActive: true,
    createdAt: new Date('2024-01-15'),
    orgUnits: [{ orgUnitId: 'ou_1' }],
    profile: {
      userId: 'user_1',
      anrede: 'Herr',
      titel: null,
      geschlecht: 'MALE',
      nationalitaet: 'DE',
      berufsgruppe: null,
      qualifications: [],
      briefanrede: 'Sehr geehrter Herr Müller',
      geburtsort: 'München',
      geburtsdatum: new Date('1975-06-12'),
      telefonPrivat: '089-123456',
      telefonDienstlich: null,
      telefonHandy: '+49 151 12345678',
      strasse: 'Forstweg',
      hausnummer: '7',
      plz: '80331',
      ort: 'München',
      land: 'DE',
      postfachStrasse: null,
      postfachPlz: null,
      postfachOrt: null,
      jaegereichennummer: 'BY-12345',
      ersteWaffenbesitzkarte: null,
      jaegerpruefungDatum: new Date('2000-04-20'),
      huntingLicenseDate: null,
      istExternesMitglied: false,
      externeMitgliedsnummer: 'EXT-999',
      bemerkungen: 'Stammjäger',
    },
    functions: [],
    awards: [],
    ...overrides,
  };
}

// ─── Prisma mock ──────────────────────────────────────────────────────────────

const prismaMock = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  userProfile: {
    upsert: jest.fn(),
  },
  userFunction: {
    findMany: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  userAward: {
    findMany: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
} as unknown as PrismaService;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UsersService', () => {
  let service: UsersService;
  let prisma: typeof prismaMock & {
    user: { [K: string]: jest.Mock };
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService);

    // Default return values to avoid Promise resolution errors
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.user.count as jest.Mock).mockResolvedValue(0);
  });

  // ─── findAll() ─────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should apply no scope filter for admin — empty where object (no orgUnits constraint)', async () => {
      const admin = makeUser({ isAdmin: true });
      const query = makeQuery();

      await service.findAll(query, admin);

      const callArgs = (prisma.user.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where).not.toHaveProperty('orgUnits');
    });

    it('should apply scope filter for organizer — where.orgUnits matches managedOrgUnitIds', async () => {
      const organizer = makeUser({
        managedOrgUnitIds: ['ou_1', 'ou_2'],
      });
      const query = makeQuery();

      await service.findAll(query, organizer);

      const callArgs = (prisma.user.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.orgUnits).toEqual({
        some: { orgUnitId: { in: ['ou_1', 'ou_2'] } },
      });
    });

    it('should apply scope filter for member with no managed units — in: [] (empty, returns nothing)', async () => {
      const member = makeUser({
        isAdmin: false,
        managedOrgUnitIds: [],
        memberOrgUnitIds: ['ou_5'],
      });
      const query = makeQuery();

      await service.findAll(query, member);

      const callArgs = (prisma.user.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.orgUnits).toEqual({
        some: { orgUnitId: { in: [] } },
      });
    });

    it('should set where.OR with name and email contains filter when search query is provided', async () => {
      const admin = makeUser({ isAdmin: true });
      const query = makeQuery({ search: 'Müller' });

      await service.findAll(query, admin);

      const callArgs = (prisma.user.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.OR).toEqual([
        { name: { contains: 'Müller', mode: 'insensitive' } },
        { email: { contains: 'Müller', mode: 'insensitive' } },
      ]);
    });

    it('should not set where.OR when no search query is provided', async () => {
      const admin = makeUser({ isAdmin: true });
      const query = makeQuery();

      await service.findAll(query, admin);

      const callArgs = (prisma.user.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where).not.toHaveProperty('OR');
    });

    it('should return paginated response with items, total, page and pageSize', async () => {
      const admin = makeUser({ isAdmin: true });
      const dbUsers = [makeDbUser(), makeDbUser({ id: 'user_2', email: 'anna.schmidt@jagd.de' })];
      (prisma.user.findMany as jest.Mock).mockResolvedValue(dbUsers);
      (prisma.user.count as jest.Mock).mockResolvedValue(2);

      const result = await service.findAll(makeQuery(), admin);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should filter by isActive: true by default', async () => {
      const admin = makeUser({ isAdmin: true });

      await service.findAll(makeQuery(), admin);

      const callArgs = (prisma.user.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.isActive).toBe(true);
    });
  });

  // ─── getProfile() — PII masking ────────────────────────────────────────────

  describe('getProfile()', () => {
    it('should include PII fields when actor is viewing their own profile', async () => {
      const actor = makeUser({ id: 'user_1' });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(makeDbUser());

      const result = await service.getProfile('user_1', actor) as Record<string, unknown>;

      expect(result).toHaveProperty('briefanrede');
      expect(result).toHaveProperty('telefonHandy');
      expect(result).toHaveProperty('strasse');
      expect(result).toHaveProperty('geburtsdatum');
      expect(result).toHaveProperty('plz');
    });

    it('should include PII and admin-only fields when actor is admin', async () => {
      const admin = makeUser({ id: 'admin_1', isAdmin: true });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(
        makeDbUser({ id: 'user_2' }),
      );

      const result = await service.getProfile('user_2', admin) as Record<string, unknown>;

      // PII fields
      expect(result).toHaveProperty('briefanrede');
      expect(result).toHaveProperty('telefonHandy');
      // Admin-only fields
      expect(result).toHaveProperty('externeMitgliedsnummer');
      expect(result).toHaveProperty('bemerkungen');
    });

    it('should include PII fields but not admin-only fields when organizer views member in their scope', async () => {
      const organizer = makeUser({
        id: 'organizer_1',
        managedOrgUnitIds: ['ou_1'],
      });
      // User belongs to ou_1 — within organizer scope
      const dbUser = makeDbUser({ orgUnits: [{ orgUnitId: 'ou_1' }] });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(dbUser);

      const result = await service.getProfile('user_1', organizer) as Record<string, unknown>;

      expect(result).toHaveProperty('briefanrede');
      expect(result).toHaveProperty('telefonHandy');
      expect(result).not.toHaveProperty('externeMitgliedsnummer');
      expect(result).not.toHaveProperty('bemerkungen');
    });

    it('should not include PII fields when member views another member (no scope overlap)', async () => {
      const actor = makeUser({
        id: 'user_99',
        managedOrgUnitIds: [],
        memberOrgUnitIds: ['ou_99'],
      });
      const dbUser = makeDbUser({ orgUnits: [{ orgUnitId: 'ou_1' }] });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(dbUser);

      const result = await service.getProfile('user_1', actor) as Record<string, unknown>;

      expect(result).not.toHaveProperty('briefanrede');
      expect(result).not.toHaveProperty('telefonHandy');
      expect(result).not.toHaveProperty('strasse');
      expect(result).not.toHaveProperty('externeMitgliedsnummer');
      expect(result).not.toHaveProperty('bemerkungen');
    });

    it('should always include public fields regardless of actor role', async () => {
      const actor = makeUser({ id: 'user_99' });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(makeDbUser());

      const result = await service.getProfile('user_1', actor) as Record<string, unknown>;

      expect(result).toHaveProperty('anrede');
      expect(result).toHaveProperty('titel');
      expect(result).toHaveProperty('qualifications');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const actor = makeUser({ isAdmin: true });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getProfile('nonexistent_id', actor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should not include PII when organizer has no scope overlap with user orgUnits', async () => {
      const organizer = makeUser({
        id: 'organizer_1',
        managedOrgUnitIds: ['ou_other'],
      });
      const dbUser = makeDbUser({ orgUnits: [{ orgUnitId: 'ou_1' }] }); // different unit
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(dbUser);

      const result = await service.getProfile('user_1', organizer) as Record<string, unknown>;

      expect(result).not.toHaveProperty('briefanrede');
      expect(result).not.toHaveProperty('telefonHandy');
    });
  });

  // ─── findOne() ─────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('should throw NotFoundException when user does not exist', async () => {
      const admin = makeUser({ isAdmin: true });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent_id', admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return user when found and actor is admin', async () => {
      const admin = makeUser({ isAdmin: true });
      const dbUser = {
        id: 'user_1',
        email: 'hans@jagd.de',
        name: 'Hans Müller',
        isAdmin: false,
        isActive: true,
        createdAt: new Date(),
        orgUnits: [],
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(dbUser);

      const result = await service.findOne('user_1', admin);

      expect(result).toEqual(dbUser);
    });

    it('should allow organizer with managed units to access user', async () => {
      const organizer = makeUser({ managedOrgUnitIds: ['ou_1'] });
      const dbUser = {
        id: 'user_1',
        email: 'hans@jagd.de',
        name: 'Hans Müller',
        isAdmin: false,
        isActive: true,
        createdAt: new Date(),
        orgUnits: [],
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(dbUser);

      const result = await service.findOne('user_1', organizer);

      expect(result).toEqual(dbUser);
    });

    it('should throw ForbiddenException when plain member accesses another user with no managed units', async () => {
      const member = makeUser({ id: 'user_99', managedOrgUnitIds: [], memberOrgUnitIds: ['ou_1'] });
      const dbUser = {
        id: 'user_1',
        email: 'hans@jagd.de',
        name: 'Hans Müller',
        isAdmin: false,
        isActive: true,
        createdAt: new Date(),
        orgUnits: [],
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(dbUser);

      await expect(service.findOne('user_1', member)).rejects.toThrow(ForbiddenException);
    });
  });
});
