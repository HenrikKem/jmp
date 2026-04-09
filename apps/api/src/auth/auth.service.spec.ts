import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OrgRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('bcrypt');
import * as bcrypt from 'bcrypt';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeDbUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user_1',
  email: 'hans.mueller@jagd.de',
  name: 'Hans Müller',
  passwordHash: '$2b$10$hashedpassword',
  isAdmin: false,
  isActive: true,
  tokenVersion: 0,
  orgUnits: [],
  profile: { anrede: 'Herr' },
  ...overrides,
});

// ─── Mock factories ───────────────────────────────────────────────────────────

const prismaMock = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
} as unknown as PrismaService;

const jwtMock = {
  sign: jest.fn(),
  verify: jest.fn(),
} as unknown as JwtService;

const configMock = {
  get: jest.fn((key: string) => {
    if (key === 'JWT_REFRESH_SECRET') return 'test_refresh_secret';
    return null;
  }),
} as unknown as ConfigService;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService> & {
    user: { [K in keyof (typeof prismaMock)['user']]: jest.Mock };
  };
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);

    // Default config mock
    (configMock.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'JWT_REFRESH_SECRET') return 'test_refresh_secret';
      return null;
    });
  });

  // ─── login() ──────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('should return accessToken, refreshToken and user on successful login', async () => {
      const dbUser = makeDbUser({
        orgUnits: [
          { orgUnitId: 'ou_1', role: OrgRole.ORGANIZER },
          { orgUnitId: 'ou_2', role: OrgRole.MEMBER },
          { orgUnitId: 'ou_3', role: OrgRole.ORGANIZER },
        ],
      });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(dbUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwtService.sign as jest.Mock)
        .mockReturnValueOnce('access_token_value')
        .mockReturnValueOnce('refresh_token_value');

      const result = await service.login({
        email: 'hans.mueller@jagd.de',
        password: 'geheim123',
      });

      expect(result.accessToken).toBe('access_token_value');
      expect(result.refreshToken).toBe('refresh_token_value');
      expect(result.user.id).toBe('user_1');
      expect(result.user.email).toBe('hans.mueller@jagd.de');
    });

    it('should split orgUnits into managedOrgUnitIds (ORGANIZER) and memberOrgUnitIds (MEMBER)', async () => {
      const dbUser = makeDbUser({
        orgUnits: [
          { orgUnitId: 'ou_1', role: OrgRole.ORGANIZER },
          { orgUnitId: 'ou_2', role: OrgRole.MEMBER },
          { orgUnitId: 'ou_3', role: OrgRole.ORGANIZER },
          { orgUnitId: 'ou_4', role: OrgRole.MEMBER },
        ],
      });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(dbUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwtService.sign as jest.Mock).mockReturnValue('some_token');

      const result = await service.login({
        email: 'hans.mueller@jagd.de',
        password: 'geheim123',
      });

      expect(result.user.managedOrgUnitIds).toEqual(['ou_1', 'ou_3']);
      expect(result.user.memberOrgUnitIds).toEqual(['ou_2', 'ou_4']);
    });

    it('should sign access token with 15m expiry', async () => {
      const dbUser = makeDbUser();
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(dbUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwtService.sign as jest.Mock).mockReturnValue('token');

      await service.login({ email: 'hans.mueller@jagd.de', password: 'geheim123' });

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user_1', email: 'hans.mueller@jagd.de' }),
        expect.objectContaining({ expiresIn: '15m' }),
      );
    });

    it('should sign refresh token with JWT_REFRESH_SECRET and 7d expiry', async () => {
      const dbUser = makeDbUser({ tokenVersion: 3 });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(dbUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwtService.sign as jest.Mock).mockReturnValue('token');

      await service.login({ email: 'hans.mueller@jagd.de', password: 'geheim123' });

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user_1', tokenVersion: 3 }),
        expect.objectContaining({
          secret: 'test_refresh_secret',
          expiresIn: '7d',
        }),
      );
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      const dbUser = makeDbUser();
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(dbUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'hans.mueller@jagd.de', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({ email: 'unbekannt@jagd.de', password: 'geheim123' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user is inactive (not returned by isActive filter)', async () => {
      // The service queries with isActive: true, so Prisma returns null for inactive users
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({ email: 'inaktiv@jagd.de', password: 'geheim123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should query Prisma with case-insensitive email and isActive: true filter', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({ email: 'HANS@JAGD.DE', password: 'pw' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: { equals: 'HANS@JAGD.DE', mode: 'insensitive' },
            isActive: true,
          }),
        }),
      );
    });
  });

  // ─── refresh() ────────────────────────────────────────────────────────────

  describe('refresh()', () => {
    it('should return a new accessToken when refresh token is valid and tokenVersion matches', async () => {
      const dbUser = makeDbUser({ tokenVersion: 2 });
      (jwtService.verify as jest.Mock).mockReturnValue({
        sub: 'user_1',
        tokenVersion: 2,
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(dbUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({ ...dbUser, tokenVersion: 3 });
      (jwtService.sign as jest.Mock).mockReturnValue('new_access_token');

      const result = await service.refresh('valid_refresh_token');

      expect(result.accessToken).toBe('new_access_token');
    });

    it('should rotate the refresh token on each use', async () => {
      const dbUser = makeDbUser({ tokenVersion: 1 });
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 'user_1', tokenVersion: 1 });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(dbUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({ ...dbUser, tokenVersion: 2 });
      (jwtService.sign as jest.Mock).mockReturnValue('rotated_token');

      const result = await service.refresh('valid_refresh_token');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { tokenVersion: { increment: 1 } } }),
      );
      expect(result).toHaveProperty('refreshToken');
    });

    it('should verify refresh token using JWT_REFRESH_SECRET', async () => {
      const dbUser = makeDbUser({ tokenVersion: 0 });
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 'user_1', tokenVersion: 0 });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(dbUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({ ...dbUser, tokenVersion: 1 });
      (jwtService.sign as jest.Mock).mockReturnValue('new_access_token');

      await service.refresh('some_refresh_token');

      expect(jwtService.verify).toHaveBeenCalledWith(
        'some_refresh_token',
        expect.objectContaining({ secret: 'test_refresh_secret' }),
      );
    });

    it('should throw UnauthorizedException when JWT signature is invalid', async () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await expect(service.refresh('tampered_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when tokenVersion does not match (user logged out)', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue({
        sub: 'user_1',
        tokenVersion: 0, // old version
      });
      const dbUser = makeDbUser({ tokenVersion: 1 }); // incremented after logout
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(dbUser);

      await expect(service.refresh('old_refresh_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user no longer exists or is inactive', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 'user_1', tokenVersion: 0 });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.refresh('refresh_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should include managedOrgUnitIds and memberOrgUnitIds split in the new access token payload', async () => {
      const dbUser = makeDbUser({
        tokenVersion: 0,
        orgUnits: [
          { orgUnitId: 'ou_10', role: OrgRole.ORGANIZER },
          { orgUnitId: 'ou_20', role: OrgRole.MEMBER },
        ],
      });
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 'user_1', tokenVersion: 0 });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(dbUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({ ...dbUser, tokenVersion: 1 });
      (jwtService.sign as jest.Mock).mockReturnValue('new_token');

      await service.refresh('valid_token');

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          managedOrgUnitIds: ['ou_10'],
          memberOrgUnitIds: ['ou_20'],
        }),
        expect.objectContaining({ expiresIn: '15m' }),
      );
    });
  });

  // ─── logout() ─────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('should increment tokenVersion on the user record', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await service.logout('user_1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_1' },
        data: { tokenVersion: { increment: 1 } },
      });
    });

    it('should return a message confirmation', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await service.logout('user_1');

      expect(result).toEqual({ message: 'Logged out' });
    });
  });
});
