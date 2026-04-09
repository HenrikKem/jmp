import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { UserQueryDto } from './dto/user-query.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateUserFunctionDto } from './dto/create-user-function.dto';
import { CreateUserAwardDto } from './dto/create-user-award.dto';
import { CreateUserDogDto } from './dto/create-user-dog.dto';
import { CreateUserDogPruefungDto } from './dto/create-user-dog-pruefung.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(
    @Query() query: UserQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.findAll(query, user);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.findOne(id, user);
  }

  @Get(':id/profile')
  getProfile(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.getProfile(id, user);
  }

  @Put(':id/profile')
  updateProfile(
    @Param('id') id: string,
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.updateProfile(id, dto, user);
  }

  // Functions
  @Get(':id/functions')
  getFunctions(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.getFunctions(id, user);
  }

  @Post(':id/functions')
  createFunction(
    @Param('id') id: string,
    @Body() dto: CreateUserFunctionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.createFunction(id, dto, user);
  }

  @Delete(':id/functions/:fid')
  @HttpCode(HttpStatus.OK)
  deleteFunction(
    @Param('id') id: string,
    @Param('fid') fid: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.deleteFunction(id, fid, user);
  }

  // Awards
  @Get(':id/awards')
  getAwards(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.getAwards(id, user);
  }

  @Post(':id/awards')
  createAward(
    @Param('id') id: string,
    @Body() dto: CreateUserAwardDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.createAward(id, dto, user);
  }

  @Delete(':id/awards/:aid')
  @HttpCode(HttpStatus.OK)
  deleteAward(
    @Param('id') id: string,
    @Param('aid') aid: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.deleteAward(id, aid, user);
  }

  // Dogs
  @Get(':id/dogs')
  getDogs(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.getDogs(id, user);
  }

  @Post(':id/dogs')
  createDog(
    @Param('id') id: string,
    @Body() dto: CreateUserDogDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.createDog(id, dto, user);
  }

  @Delete(':id/dogs/:dogId')
  @HttpCode(HttpStatus.OK)
  deleteDog(
    @Param('id') id: string,
    @Param('dogId') dogId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.deleteDog(id, dogId, user);
  }

  @Post(':id/dogs/:dogId/pruefungen')
  createPruefung(
    @Param('id') id: string,
    @Param('dogId') dogId: string,
    @Body() dto: CreateUserDogPruefungDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.createPruefung(id, dogId, dto, user);
  }

  @Delete(':id/dogs/:dogId/pruefungen/:pruefungId')
  @HttpCode(HttpStatus.OK)
  deletePruefung(
    @Param('id') id: string,
    @Param('dogId') dogId: string,
    @Param('pruefungId') pruefungId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.deletePruefung(id, dogId, pruefungId, user);
  }
}
