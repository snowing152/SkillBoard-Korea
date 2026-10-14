import { CreateTalentProfileSchema } from '@skillboard/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateTalentProfileDto extends createZodDto(CreateTalentProfileSchema) {}
