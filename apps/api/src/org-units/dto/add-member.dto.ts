import { IsString, IsEnum } from 'class-validator';
import { OrgRole } from '@prisma/client';

export class AddMemberDto {
  @IsString()
  userId: string;

  @IsEnum(OrgRole)
  role: OrgRole;
}
