import { TalentProfileQuerySchema } from '@skillboard/shared';
import { createZodDto } from 'nestjs-zod';

export class TalentProfileQueryDto extends createZodDto(TalentProfileQuerySchema) {}
