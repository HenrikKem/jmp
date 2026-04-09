import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { CreateEventRoleDto } from './dto/create-event-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findAll(
    @Query() query: EventQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.findAll(query, user);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.findOne(id, user);
  }

  @Post()
  create(
    @Body() dto: CreateEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.create(dto, user);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.remove(id, user);
  }

  // Groups
  @Get(':id/groups')
  getGroups(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.getGroups(id, user);
  }

  @Post(':id/groups')
  createGroup(
    @Param('id') id: string,
    @Body() dto: CreateGroupDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.createGroup(id, dto, user);
  }

  @Put(':id/groups/:gid')
  updateGroup(
    @Param('id') id: string,
    @Param('gid') gid: string,
    @Body() dto: CreateGroupDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.updateGroup(id, gid, dto, user);
  }

  @Delete(':id/groups/:gid')
  @HttpCode(HttpStatus.OK)
  deleteGroup(
    @Param('id') id: string,
    @Param('gid') gid: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.deleteGroup(id, gid, user);
  }

  // Roles
  @Get(':id/roles')
  getRoles(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.getRoles(id, user);
  }

  @Post(':id/roles')
  createRole(
    @Param('id') id: string,
    @Body() dto: CreateEventRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.createRole(id, dto, user);
  }

  @Post(':id/roles/:rid/assignments')
  assignRole(
    @Param('id') id: string,
    @Param('rid') rid: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.assignRole(id, rid, dto, user);
  }

  @Delete(':id/roles/:rid/assignments/:uid')
  @HttpCode(HttpStatus.OK)
  unassignRole(
    @Param('id') id: string,
    @Param('rid') rid: string,
    @Param('uid') uid: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.unassignRole(id, rid, uid, user);
  }

  // Registrations (for organizer)
  @Get(':id/registrations')
  getRegistrations(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.getRegistrations(id, user);
  }
}
