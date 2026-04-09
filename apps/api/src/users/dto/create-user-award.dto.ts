import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateUserAwardDto {
  @IsString()
  bezeichnung: string;

  @IsOptional()
  @IsDateString()
  datum?: string;
}
