import { IsString, IsOptional } from 'class-validator';

export class CreateEventRoleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
