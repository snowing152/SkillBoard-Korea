import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiConflictResponse, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthSession } from '@skillboard/shared';
import { ZodSerializerDto } from 'nestjs-zod';
import { Public } from '../../common/auth/decorators.js';
import { AuthService } from './auth.service.js';
import { AuthSessionDto } from './dto/auth-session.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@ApiTags('auth')
@Controller('auth')
@Public()
// Stricter than the global 100/min: 10 attempts per minute per IP (ADR 0018).
@Throttle({ default: { limit: 10, ttl: 60_000 } })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ZodSerializerDto(AuthSessionDto)
  @ApiCreatedResponse({ type: AuthSessionDto })
  @ApiConflictResponse({ description: 'Email already registered' })
  register(@Body() body: RegisterDto): Promise<AuthSession> {
    return this.auth.register(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(AuthSessionDto)
  @ApiOkResponse({ type: AuthSessionDto })
  login(@Body() body: LoginDto): Promise<AuthSession> {
    return this.auth.login(body);
  }
}
