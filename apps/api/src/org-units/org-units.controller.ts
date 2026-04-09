import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrgUnitsService } from './org-units.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { CreateOrgUnitDto } from './dto/create-org-unit.dto';
import { UpdateOrgUnitDto } from './dto/update-org-unit.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Controller('org-units')
@UseGuards(JwtAuthGuard)
export class OrgUnitsController {
  constructor(private readonly orgUnitsService: OrgUnitsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.orgUnitsService.findAll(user);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orgUnitsService.findOne(id, user);
  }

  @Get(':id/descendants')
  getDescendants(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orgUnitsService.getDescendants(id, user);
  }

  @Post()
  create(
    @Body() dto: CreateOrgUnitDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orgUnitsService.create(dto, user);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrgUnitDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orgUnitsService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orgUnitsService.remove(id, user);
  }

  // Member management
  @Get(':id/members')
  getMembers(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orgUnitsService.getMembers(id, user);
  }

  @Post(':id/members')
  addMember(
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orgUnitsService.addMember(id, dto, user);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orgUnitsService.removeMember(id, userId, user);
  }
}
