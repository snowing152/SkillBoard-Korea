import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { SkillCatalog } from '@skillboard/shared';
import { ZodSerializerDto } from 'nestjs-zod';
import { Public } from '../../common/auth/decorators.js';
import { SkillCatalogDto } from './dto/skill-catalog.dto.js';
import { SkillsService } from './skills.service.js';

@ApiTags('skills')
@Controller('skills')
export class SkillsController {
  constructor(private readonly skills: SkillsService) {}

  /** Needed by the profile form and the search filters, so it is public and cacheable. */
  @Get()
  @Public()
  @ZodSerializerDto(SkillCatalogDto)
  @ApiOkResponse({ type: SkillCatalogDto })
  catalog(): Promise<SkillCatalog> {
    return this.skills.catalog();
  }
}
