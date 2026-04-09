import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { RegistrationStatus } from '@prisma/client';

@Injectable()
export class RegistrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMine(actor: AuthenticatedUser) {
    return this.prisma.registration.findMany({
      where: { userId: actor.id },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            location: true,
          },
        },
        group: { select: { id: true, name: true, startTime: true } },
      },
      orderBy: { registeredAt: 'desc' },
    });
  }

  async register(dto: CreateRegistrationDto, actor: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      // Check event exists and user has access
      const event = await tx.event.findUnique({
        where: { id: dto.eventId, isActive: true, isPublished: true },
      });
      if (!event) throw new NotFoundException('Event not found');

      const visible = [
        ...actor.managedOrgUnitIds,
        ...actor.memberOrgUnitIds,
      ];
      if (!actor.isAdmin && !visible.includes(event.scopeOrgId)) {
        throw new ForbiddenException('Event not accessible');
      }

      // Check not already registered
      const existing = await tx.registration.findUnique({
        where: {
          userId_eventId: { userId: actor.id, eventId: dto.eventId },
        },
      });
      if (existing) throw new ConflictException('Already registered for this event');

      // Check group capacity if group specified
      if (dto.groupId) {
        const group = await tx.group.findUniqueOrThrow({
          where: { id: dto.groupId },
        });
        if (group.eventId !== dto.eventId) {
          throw new BadRequestException('Group does not belong to this event');
        }
        const confirmed = await tx.registration.count({
          where: {
            groupId: dto.groupId,
            status: RegistrationStatus.CONFIRMED,
          },
        });
        if (confirmed >= group.capacity) {
          throw new ConflictException('Group is full');
        }
      }

      return tx.registration.create({
        data: {
          userId: actor.id,
          eventId: dto.eventId,
          groupId: dto.groupId,
          status: RegistrationStatus.CONFIRMED,
        },
        include: {
          event: { select: { id: true, name: true } },
          group: { select: { id: true, name: true } },
        },
      });
    });
  }

  async cancel(registrationId: string, actor: AuthenticatedUser) {
    const reg = await this.prisma.registration.findUnique({
      where: { id: registrationId },
    });
    if (!reg) throw new NotFoundException('Registration not found');
    if (reg.userId !== actor.id && !actor.isAdmin) throw new ForbiddenException();

    return this.prisma.registration.update({
      where: { id: registrationId },
      data: { status: RegistrationStatus.CANCELLED },
    });
  }
}
