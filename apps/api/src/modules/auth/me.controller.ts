import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '@skillboard/shared';
import { ZodSerializerDto } from 'nestjs-zod';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { CurrentUser } from '../../common/auth/decorators.js';
import { AuthService } from './auth.service.js';
import { AuthUserDto } from './dto/auth-user.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { UpdateMeDto } from './dto/update-me.dto.js';

/** The signed-in user's own account: profile data and password. Private, no `@Public()` anywhere. */
@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly auth: AuthService) {}

  @Get()
  @ZodSerializerDto(AuthUserDto)
  @ApiOkResponse({ type: AuthUserDto })
  me(@CurrentUser() user: AuthenticatedUser): Promise<AuthUser> {
    return this.auth.me(user.id);
  }

  @Patch()
  @ZodSerializerDto(AuthUserDto)
  @ApiOkResponse({ type: AuthUserDto })
  update(@CurrentUser() user: AuthenticatedUser, @Body() body: UpdateMeDto): Promise<AuthUser> {
    return this.auth.updateMe(user.id, body);
  }

  // A stolen access token must not be able to guess `currentPassword` at the global 100 per minute.
  @Post('password')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Password changed' })
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ChangePasswordDto,
  ): Promise<void> {
    return this.auth.changePassword(user.id, body);
  }
}
