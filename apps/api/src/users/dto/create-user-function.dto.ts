import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateUserFunctionDto {
  @IsString()
  funktion: string;

  @IsOptional()
  @IsString()
  orgUnitName?: string;

  @IsOptional()
  @IsString()
  orgUnitId?: string;

  @IsOptional()
  @IsDateString()
  von?: string;

  @IsOptional()
  @IsDateString()
  bis?: string;
}
