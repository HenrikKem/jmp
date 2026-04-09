import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class CreateUserDogDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  rasse?: string;

  @IsOptional()
  @IsInt()
  geburtsjahr?: number;
}
