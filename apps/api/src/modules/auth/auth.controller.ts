import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { type AuthSession, DEFAULT_LOCALE } from '@skillboard/shared';
import type { Request, Response } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { CurrentUser, Public } from '../../common/auth/decorators.js';
import { UserAgent } from '../../common/http/user-agent.decorator.js';
import { AuthService, type GoogleOutcome } from './auth.service.js';
import { AuthSessionDto } from './dto/auth-session.dto.js';
import { ExchangeDto } from './dto/exchange.dto.js';
import { GoogleCompleteDto } from './dto/google-complete.dto.js';
import { GoogleStartQueryDto } from './dto/google-start-query.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { LogoutDto } from './dto/logout.dto.js';
import { PasswordResetConfirmDto } from './dto/password-reset-confirm.dto.js';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { TokenDto } from './dto/token.dto.js';
import { OAUTH_NONCE_CLEAR_OPTIONS, OAUTH_NONCE_COOKIE, readCookie } from './google-cookie.js';
import { GoogleCallbackGuard, GoogleStartGuard } from './google.guards.js';

/** 3 requests per 15 minutes per IP: mail-sending routes (ADR 0018). */
const MAIL_THROTTLE = { default: { limit: 3, ttl: 15 * 60_000 } };

/**
 * Every route is marked explicitly: `@Public()` where no token is needed, nothing where one is.
 * Stricter than the global 100/min: 10 per minute per IP (ADR 0018), tighter on the mail routes.
 */
@ApiTags('auth')
@Controller('auth')
@Throttle({ default: { limit: 10, ttl: 60_000 } })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Public()
  @ZodSerializerDto(AuthSessionDto)
  @ApiCreatedResponse({ type: AuthSessionDto })
  @ApiConflictResponse({ description: 'Email already registered' })
  register(@Body() body: RegisterDto, @UserAgent() userAgent?: string): Promise<AuthSession> {
    return this.auth.register(body, userAgent);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(AuthSessionDto)
  @ApiOkResponse({ type: AuthSessionDto })
  login(@Body() body: LoginDto, @UserAgent() userAgent?: string): Promise<AuthSession> {
    return this.auth.login(body, userAgent);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(AuthSessionDto)
  @ApiOkResponse({ type: AuthSessionDto })
  refresh(@Body() body: RefreshDto, @UserAgent() userAgent?: string): Promise<AuthSession> {
    return this.auth.refresh(body.refreshToken, userAgent);
  }

  @Post('logout')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Refresh token(s) revoked' })
  logout(@CurrentUser() user: AuthenticatedUser, @Body() body: LogoutDto): Promise<void> {
    return this.auth.logout(user.id, body);
  }

  @Post('verify-email/request')
  @ApiBearerAuth()
  @Throttle(MAIL_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Mail sent, or the address was already verified' })
  requestVerification(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.auth.requestEmailVerification(user.id);
  }

  @Post('verify-email/confirm')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Email verified' })
  confirmVerification(@Body() body: TokenDto): Promise<void> {
    return this.auth.confirmEmail(body.token);
  }

  @Post('password-reset/request')
  @Public()
  @Throttle(MAIL_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Always, whether or not the address has an account' })
  requestReset(@Body() body: PasswordResetRequestDto): Promise<void> {
    return this.auth.requestPasswordReset(body.email);
  }

  @Post('password-reset/confirm')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Password changed; every refresh token revoked' })
  confirmReset(@Body() body: PasswordResetConfirmDto): Promise<void> {
    return this.auth.confirmPasswordReset(body.token, body.password);
  }

  @Get('google')
  @Public()
  @UseGuards(GoogleStartGuard)
  @ApiResponse({ status: 302, description: 'Redirect to Google' })
  // The guard redirects before this runs; the parameter only documents the query in OpenAPI.
  googleStart(@Query() _query: GoogleStartQueryDto): void {
    // Intentionally empty: GoogleStartGuard has already redirected the browser to Google.
  }

  @Get('google/callback')
  @Public()
  @UseGuards(GoogleCallbackGuard)
  @ApiResponse({ status: 302, description: 'Redirect to the web app with ?code= or ?error=' })
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('state') state?: string,
  ): Promise<void> {
    const verified = await this.auth.verifyOAuthState(state, readCookie(req, OAUTH_NONCE_COOKIE));
    // One flow, one nonce: clear it whatever happens next.
    res.clearCookie(OAUTH_NONCE_COOKIE, OAUTH_NONCE_CLEAR_OPTIONS);
    const locale = verified?.locale ?? DEFAULT_LOCALE;
    if (!verified || !req.oauthProfile) {
      res.redirect(this.auth.oauthRedirectUrl(locale, { error: 'OAUTH_FAILED' }));
      return;
    }
    // Whatever goes wrong, the browser must end on the web app, not on a JSON error of the API origin.
    const outcome = await this.auth
      .completeGoogle(req.oauthProfile, verified)
      .catch((): GoogleOutcome => ({ ok: false, error: 'OAUTH_FAILED' }));
    const next = verified.next ? { next: verified.next } : {};
    const params = !outcome.ok
      ? { error: outcome.error }
      : outcome.kind === 'code'
        ? { code: outcome.code, ...next }
        : { signup: outcome.signupToken, ...next };
    res.redirect(this.auth.oauthRedirectUrl(locale, params));
  }

  @Post('google/complete')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(AuthSessionDto)
  @ApiOkResponse({ type: AuthSessionDto })
  completeGoogle(
    @Body() body: GoogleCompleteDto,
    @UserAgent() userAgent?: string,
  ): Promise<AuthSession> {
    return this.auth.completeGoogleSignup(body, userAgent);
  }

  @Post('exchange')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(AuthSessionDto)
  @ApiOkResponse({ type: AuthSessionDto })
  exchange(@Body() body: ExchangeDto, @UserAgent() userAgent?: string): Promise<AuthSession> {
    return this.auth.exchange(body.code, userAgent);
  }
}
