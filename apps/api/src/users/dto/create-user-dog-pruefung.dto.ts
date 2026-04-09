import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class CreateUserDogPruefungDto {
  @IsString()
  @IsNotEmpty()
  pruefungsart: string;

  @IsOptional()
  @IsDateString()
  datum?: string;
}
