import { IsString, IsEnum, IsOptional } from 'class-validator';
import { OrgLevel } from '@prisma/client';

export class CreateOrgUnitDto {
  @IsString()
  name: string;

  @IsEnum(OrgLevel)
  level: OrgLevel;

  @IsOptional()
  @IsString()
  parentId?: string;
}
