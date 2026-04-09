import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { CreateRegistrationDto } from './dto/create-registration.dto';

@Controller('registrations')
@UseGuards(JwtAuthGuard)
export class RegistrationsController {
  constructor(
    private readonly registrationsService: RegistrationsService,
  ) {}

  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.registrationsService.findMine(user);
  }

  @Post()
  register(
    @Body() dto: CreateRegistrationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.registrationsService.register(dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.registrationsService.cancel(id, user);
  }
}
