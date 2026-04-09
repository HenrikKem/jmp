import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { OrgRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: dto.email, mode: 'insensitive' }, isActive: true },
      include: {
        orgUnits: { select: { orgUnitId: true, role: true } },
        profile: { select: { anrede: true } },
      },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const managedOrgUnitIds = user.orgUnits
      .filter((m) => m.role === OrgRole.ORGANIZER)
      .map((m) => m.orgUnitId);

    const memberOrgUnitIds = user.orgUnits
      .filter((m) => m.role === OrgRole.MEMBER)
      .map((m) => m.orgUnitId);

    const payload = {
      sub: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      managedOrgUnitIds,
      memberOrgUnitIds,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(
      { sub: user.id, tokenVersion: user.tokenVersion },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
        managedOrgUnitIds,
        memberOrgUnitIds,
      },
    };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; tokenVersion: number };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, isActive: true },
      include: { orgUnits: { select: { orgUnitId: true, role: true } } },
    });

    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const managedOrgUnitIds = user.orgUnits
      .filter((m) => m.role === OrgRole.ORGANIZER)
      .map((m) => m.orgUnitId);

    const memberOrgUnitIds = user.orgUnits
      .filter((m) => m.role === OrgRole.MEMBER)
      .map((m) => m.orgUnitId);

    const accessPayload = {
      sub: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      managedOrgUnitIds,
      memberOrgUnitIds,
    };

    // Rotate refresh token: increment tokenVersion to invalidate the used token
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: { increment: 1 } },
    });
    const newRefreshToken = this.jwtService.sign(
      { sub: user.id, tokenVersion: updatedUser.tokenVersion },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );

    return {
      accessToken: this.jwtService.sign(accessPayload, { expiresIn: '15m' }),
      refreshToken: newRefreshToken,
    };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
    return { message: 'Logged out' };
  }

  async me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isAdmin: true,
        orgUnits: {
          select: {
            orgUnitId: true,
            role: true,
            orgUnit: { select: { id: true, name: true, level: true } },
          },
        },
        profile: {
          select: {
            anrede: true,
            titel: true,
            telefonHandy: true,
          },
        },
      },
    });
  }
}
