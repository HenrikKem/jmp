import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { SetMembershipDto } from './dto/set-membership.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('audit-logs')
  getAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.adminService.getAuditLogs(query);
  }

  @Get('users/:id/export')
  exportUserData(@Param('id') id: string) {
    return this.adminService.exportUserData(id);
  }

  @Post('users/:id/anonymize')
  anonymizeUser(@Param('id') id: string) {
    return this.adminService.anonymizeUser(id);
  }

  @Patch('users/:id/admin')
  setAdminFlag(
    @Param('id') id: string,
    @Body('isAdmin') isAdmin: boolean,
  ) {
    return this.adminService.setAdminFlag(id, isAdmin);
  }

  @Post('users/:id/memberships')
  addMembership(
    @Param('id') id: string,
    @Body() dto: SetMembershipDto,
  ) {
    return this.adminService.addMembership(id, dto);
  }

  @Delete('users/:id/memberships/:orgUnitId')
  @HttpCode(HttpStatus.OK)
  removeMembership(
    @Param('id') id: string,
    @Param('orgUnitId') orgUnitId: string,
  ) {
    return this.adminService.removeMembership(id, orgUnitId);
  }
}

@Controller('health')
export class HealthController {
  constructor(private readonly adminService: AdminService) {}

  @Public()
  @Get()
  health() {
    return this.adminService.health();
  }
}
