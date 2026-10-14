import { TalentProfileSchema } from '@skillboard/shared';
import { createZodDto } from 'nestjs-zod';

export class TalentProfileDto extends createZodDto(TalentProfileSchema) {}
