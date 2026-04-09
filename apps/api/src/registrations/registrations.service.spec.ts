import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { RegistrationStatus } from '@prisma/client';
import { RegistrationsService } from './registrations.service';
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
    memberOrgUnitIds: ['ou_1'],
    ...overrides,
  };
}

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event_1',
    name: 'Herbstjagd Hegering Süd',
    scopeOrgId: 'ou_1',
    isActive: true,
    isPublished: true,
    startDate: new Date('2025-10-10'),
    endDate: new Date('2025-10-10'),
    ...overrides,
  };
}

function makeGroup(overrides: Record<string, unknown> = {}) {
  return {
    id: 'group_1',
    name: 'Gruppe A',
    capacity: 10,
    eventId: 'event_1', // must match dto.eventId
    ...overrides,
  };
}

// ─── Prisma mock ──────────────────────────────────────────────────────────────

const prismaMock = {
  registration: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  event: {
    findUnique: jest.fn(),
  },
  group: {
    findUniqueOrThrow: jest.fn(),
  },
  $transaction: jest.fn(),
} as unknown as PrismaService;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RegistrationsService', () => {
  let service: RegistrationsService;
  let prisma: {
    registration: { [K: string]: jest.Mock };
    event: { [K: string]: jest.Mock };
    group: { [K: string]: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<RegistrationsService>(RegistrationsService);
    prisma = module.get(PrismaService);

    // Wire $transaction to execute the callback with prisma as tx
    (prisma.$transaction as jest.Mock).mockImplementation(
      (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
    );
  });

  // ─── register() ────────────────────────────────────────────────────────────

  describe('register()', () => {
    it('should create registration with status CONFIRMED when no group is specified', async () => {
      const actor = makeUser();
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent());
      (prisma.registration.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.registration.create as jest.Mock).mockResolvedValue({
        id: 'reg_1',
        userId: 'user_1',
        eventId: 'event_1',
        groupId: null,
        status: RegistrationStatus.CONFIRMED,
      });

      const result = await service.register({ eventId: 'event_1' }, actor);

      expect(prisma.registration.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user_1',
            eventId: 'event_1',
            status: RegistrationStatus.CONFIRMED,
          }),
        }),
      );
      expect((result as { status: string }).status).toBe(RegistrationStatus.CONFIRMED);
    });

    it('should create registration when group is specified and capacity is not full', async () => {
      const actor = makeUser();
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent());
      (prisma.registration.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.group.findUniqueOrThrow as jest.Mock).mockResolvedValue(makeGroup({ capacity: 10 }));
      (prisma.registration.count as jest.Mock).mockResolvedValue(5); // 5 confirmed, 10 capacity
      (prisma.registration.create as jest.Mock).mockResolvedValue({
        id: 'reg_1',
        userId: 'user_1',
        eventId: 'event_1',
        groupId: 'group_1',
        status: RegistrationStatus.CONFIRMED,
      });

      await service.register({ eventId: 'event_1', groupId: 'group_1' }, actor);

      expect(prisma.registration.create).toHaveBeenCalled();
    });

    it('should throw ConflictException when user is already registered for the event', async () => {
      const actor = makeUser();
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent());
      (prisma.registration.findUnique as jest.Mock).mockResolvedValue({
        id: 'reg_existing',
        userId: 'user_1',
        eventId: 'event_1',
      });

      await expect(
        service.register({ eventId: 'event_1' }, actor),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.register({ eventId: 'event_1' }, actor),
      ).rejects.toThrow('Already registered for this event');
    });

    it('should throw ConflictException when group capacity is full', async () => {
      const actor = makeUser();
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent());
      (prisma.registration.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.group.findUniqueOrThrow as jest.Mock).mockResolvedValue(makeGroup({ capacity: 5 }));
      (prisma.registration.count as jest.Mock).mockResolvedValue(5); // exactly at capacity

      await expect(
        service.register({ eventId: 'event_1', groupId: 'group_1' }, actor),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.register({ eventId: 'event_1', groupId: 'group_1' }, actor),
      ).rejects.toThrow('Group is full');
    });

    it('should throw BadRequestException when group does not belong to the event', async () => {
      const actor = makeUser();
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent());
      (prisma.registration.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.group.findUniqueOrThrow as jest.Mock).mockResolvedValue(
        makeGroup({ eventId: 'event_OTHER' }), // wrong event
      );

      await expect(
        service.register({ eventId: 'event_1', groupId: 'group_1' }, actor),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.register({ eventId: 'event_1', groupId: 'group_1' }, actor),
      ).rejects.toThrow('Group does not belong to this event');
    });

    it('should throw NotFoundException when event does not exist or is not published', async () => {
      const actor = makeUser();
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.register({ eventId: 'nonexistent_event' }, actor),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-admin actor has no access to event scope', async () => {
      const actor = makeUser({
        isAdmin: false,
        managedOrgUnitIds: [],
        memberOrgUnitIds: ['ou_99'], // does not include ou_1 (event scope)
      });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(
        makeEvent({ scopeOrgId: 'ou_1' }),
      );

      await expect(
        service.register({ eventId: 'event_1' }, actor),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to register for any event regardless of scope', async () => {
      const admin = makeUser({
        id: 'admin_1',
        isAdmin: true,
        managedOrgUnitIds: [],
        memberOrgUnitIds: [],
      });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(
        makeEvent({ scopeOrgId: 'ou_completely_different' }),
      );
      (prisma.registration.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.registration.create as jest.Mock).mockResolvedValue({
        id: 'reg_1',
        userId: 'admin_1',
        eventId: 'event_1',
        status: RegistrationStatus.CONFIRMED,
      });

      await service.register({ eventId: 'event_1' }, admin);

      expect(prisma.registration.create).toHaveBeenCalled();
    });

    it('should allow organizer to register for events in their managed scope', async () => {
      const organizer = makeUser({
        managedOrgUnitIds: ['ou_1'],
        memberOrgUnitIds: [],
      });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(
        makeEvent({ scopeOrgId: 'ou_1' }),
      );
      (prisma.registration.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.registration.create as jest.Mock).mockResolvedValue({
        id: 'reg_1',
        userId: 'user_1',
        eventId: 'event_1',
        status: RegistrationStatus.CONFIRMED,
      });

      await service.register({ eventId: 'event_1' }, organizer);

      expect(prisma.registration.create).toHaveBeenCalled();
    });

    it('should check capacity using CONFIRMED status count for the group', async () => {
      const actor = makeUser();
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent());
      (prisma.registration.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.group.findUniqueOrThrow as jest.Mock).mockResolvedValue(makeGroup({ capacity: 10 }));
      (prisma.registration.count as jest.Mock).mockResolvedValue(3);
      (prisma.registration.create as jest.Mock).mockResolvedValue({
        id: 'reg_1',
        status: RegistrationStatus.CONFIRMED,
      });

      await service.register({ eventId: 'event_1', groupId: 'group_1' }, actor);

      expect(prisma.registration.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            groupId: 'group_1',
            status: RegistrationStatus.CONFIRMED,
          }),
        }),
      );
    });

    it('should wrap the entire operation in a Prisma transaction', async () => {
      const actor = makeUser();
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent());
      (prisma.registration.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.registration.create as jest.Mock).mockResolvedValue({
        id: 'reg_1',
        status: RegistrationStatus.CONFIRMED,
      });

      await service.register({ eventId: 'event_1' }, actor);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  // ─── cancel() ──────────────────────────────────────────────────────────────

  describe('cancel()', () => {
    it('should set status to CANCELLED when actor owns the registration', async () => {
      const actor = makeUser({ id: 'user_1' });
      (prisma.registration.findUnique as jest.Mock).mockResolvedValue({
        id: 'reg_1',
        userId: 'user_1',
      });
      (prisma.registration.update as jest.Mock).mockResolvedValue({
        id: 'reg_1',
        status: RegistrationStatus.CANCELLED,
      });

      await service.cancel('reg_1', actor);

      expect(prisma.registration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: RegistrationStatus.CANCELLED },
        }),
      );
    });

    it('should allow admin to cancel any registration', async () => {
      const admin = makeUser({ id: 'admin_1', isAdmin: true });
      (prisma.registration.findUnique as jest.Mock).mockResolvedValue({
        id: 'reg_1',
        userId: 'user_other',
      });
      (prisma.registration.update as jest.Mock).mockResolvedValue({
        id: 'reg_1',
        status: RegistrationStatus.CANCELLED,
      });

      await service.cancel('reg_1', admin);

      expect(prisma.registration.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when registration does not exist', async () => {
      const actor = makeUser();
      (prisma.registration.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.cancel('nonexistent_reg', actor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when actor is not owner and not admin', async () => {
      const actor = makeUser({ id: 'user_1' });
      (prisma.registration.findUnique as jest.Mock).mockResolvedValue({
        id: 'reg_1',
        userId: 'user_other', // different owner
      });

      await expect(service.cancel('reg_1', actor)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
