import { IsString, IsOptional } from 'class-validator';

export class CreateRegistrationDto {
  @IsString()
  eventId: string;

  @IsOptional()
  @IsString()
  groupId?: string;
}
