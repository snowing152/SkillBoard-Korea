import { SkillCatalogSchema } from '@skillboard/shared';
import { createZodDto } from 'nestjs-zod';

export class SkillCatalogDto extends createZodDto(SkillCatalogSchema) {}
