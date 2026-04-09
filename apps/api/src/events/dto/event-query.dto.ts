import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class EventQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  orgUnitId?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  published?: boolean;
}
