import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { MyTalentProfile, TalentCardList, TalentProfile } from '@skillboard/shared';
import { ZodSerializerDto } from 'nestjs-zod';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { CurrentUser, Public } from '../../common/auth/decorators.js';
import { CreateTalentProfileDto } from './dto/create-talent-profile.dto.js';
import { MyTalentProfileDto } from './dto/my-talent-profile.dto.js';
import { TalentCardListDto } from './dto/talent-card-list.dto.js';
import { TalentProfileQueryDto } from './dto/talent-profile-query.dto.js';
import { TalentProfileDto } from './dto/talent-profile.dto.js';
import { UpdateTalentProfileDto } from './dto/update-talent-profile.dto.js';
import { TalentProfilesService } from './talent-profiles.service.js';

/**
 * Two route families in one controller (ADR 0014): public reads under /v1/talents and the owner's own
 * resource under /v1/me/talent-profile. Handlers only route; every rule lives in the service.
 */
@ApiTags('talent-profiles')
@Controller()
export class TalentProfilesController {
  constructor(private readonly profiles: TalentProfilesService) {}

  @Get('talents')
  @Public()
  @ZodSerializerDto(TalentCardListDto)
  @ApiOkResponse({ type: TalentCardListDto })
  list(@Query() query: TalentProfileQueryDto): Promise<TalentCardList> {
    return this.profiles.listPublic(query);
  }

  @Get('talents/:slug')
  @Public()
  @ZodSerializerDto(TalentProfileDto)
  @ApiOkResponse({ type: TalentProfileDto })
  @ApiNotFoundResponse({ description: 'Missing, draft or hidden' })
  getPublic(@Param('slug') slug: string): Promise<TalentProfile> {
    return this.profiles.getPublicBySlug(slug);
  }

  @Get('me/talent-profile')
  @ApiBearerAuth()
  @ZodSerializerDto(MyTalentProfileDto)
  @ApiOkResponse({ type: MyTalentProfileDto })
  @ApiNotFoundResponse({ description: 'The user has no profile yet' })
  getMine(@CurrentUser() user: AuthenticatedUser): Promise<MyTalentProfile> {
    return this.profiles.getMine(user.id);
  }

  @Post('me/talent-profile')
  @ApiBearerAuth()
  @ZodSerializerDto(MyTalentProfileDto)
  @ApiCreatedResponse({ type: MyTalentProfileDto })
  @ApiConflictResponse({ description: 'The user already has a profile' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateTalentProfileDto,
  ): Promise<MyTalentProfile> {
    return this.profiles.createMine(user.id, body);
  }

  @Patch('me/talent-profile')
  @ApiBearerAuth()
  @ZodSerializerDto(MyTalentProfileDto)
  @ApiOkResponse({ type: MyTalentProfileDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateTalentProfileDto,
  ): Promise<MyTalentProfile> {
    return this.profiles.updateMine(user.id, body);
  }
}
