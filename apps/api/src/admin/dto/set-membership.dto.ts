import { IsString, IsEnum } from 'class-validator';
import { OrgRole } from '@prisma/client';

export class SetMembershipDto {
  @IsString()
  orgUnitId: string;

  @IsEnum(OrgRole)
  role: OrgRole;
}
