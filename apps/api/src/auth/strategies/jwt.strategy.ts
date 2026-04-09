import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../types/authenticated-user.interface';

interface JwtPayload {
  sub: string;
  email: string;
  isAdmin: boolean;
  managedOrgUnitIds: string[];
  memberOrgUnitIds: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, isActive: true },
      select: { id: true },
    });
    if (!user) throw new UnauthorizedException();

    return {
      id: payload.sub,
      email: payload.email,
      name: '',
      isAdmin: payload.isAdmin,
      managedOrgUnitIds: payload.managedOrgUnitIds ?? [],
      memberOrgUnitIds: payload.memberOrgUnitIds ?? [],
    };
  }
}
