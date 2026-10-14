import { UpdateTalentProfileSchema } from '@skillboard/shared';
import { createZodDto } from 'nestjs-zod';

export class UpdateTalentProfileDto extends createZodDto(UpdateTalentProfileSchema) {}
