import { IsOptional, IsString, IsBoolean, IsDateString, IsInt, IsObject } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  anrede?: string;

  @IsOptional()
  @IsString()
  titel?: string;

  @IsOptional()
  @IsString()
  geschlecht?: string;

  @IsOptional()
  @IsString()
  briefanrede?: string;

  @IsOptional()
  @IsString()
  berufsgruppe?: string;

  @IsOptional()
  @IsString()
  geburtsort?: string;

  @IsOptional()
  @IsDateString()
  geburtsdatum?: string;

  @IsOptional()
  @IsString()
  nationalitaet?: string;

  @IsOptional()
  @IsString()
  telefonPrivat?: string;

  @IsOptional()
  @IsString()
  telefonDienstlich?: string;

  @IsOptional()
  @IsString()
  telefonHandy?: string;

  @IsOptional()
  @IsString()
  strasse?: string;

  @IsOptional()
  @IsString()
  hausnummer?: string;

  @IsOptional()
  @IsString()
  plz?: string;

  @IsOptional()
  @IsString()
  ort?: string;

  @IsOptional()
  @IsString()
  land?: string;

  @IsOptional()
  @IsString()
  postfachStrasse?: string;

  @IsOptional()
  @IsString()
  postfachPlz?: string;

  @IsOptional()
  @IsString()
  postfachOrt?: string;

  @IsOptional()
  @IsString()
  jaegereichennummer?: string;

  @IsOptional()
  @IsDateString()
  huntingLicenseDate?: string;

  @IsOptional()
  @IsInt()
  mitgliedJagdverbandSeit?: number;

  @IsOptional()
  @IsObject()
  qualifications?: Record<string, unknown>;

  // Admin-only fields (stripped in service if not admin/organizer-in-scope)
  @IsOptional()
  @IsString()
  externeMitgliedsnummer?: string;

  @IsOptional()
  @IsString()
  bemerkungen?: string;

  @IsOptional()
  @IsBoolean()
  istExternesMitglied?: boolean;
}
