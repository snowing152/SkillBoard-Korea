import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { ConsentList } from '@skillboard/shared';
import { ZodSerializerDto } from 'nestjs-zod';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { CurrentUser } from '../../common/auth/decorators.js';
import { ConsentsService } from './consents.service.js';
import { AcceptConsentsDto } from './dto/accept-consents.dto.js';
import { ConsentListDto } from './dto/consent-list.dto.js';

/** The user's own consent record. Nothing here blocks other routes; the web enforces the redirect. */
@ApiTags('consents')
@ApiBearerAuth()
@Controller('me/consents')
export class ConsentsController {
  constructor(private readonly consents: ConsentsService) {}

  @Get()
  @ZodSerializerDto(ConsentListDto)
  @ApiOkResponse({ type: ConsentListDto })
  list(@CurrentUser() user: AuthenticatedUser): Promise<ConsentList> {
    return this.consents.listForUser(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(ConsentListDto)
  @ApiOkResponse({ type: ConsentListDto })
  accept(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: AcceptConsentsDto,
  ): Promise<ConsentList> {
    return this.consents.accept(user.id, body.documents, body.locale);
  }
}
