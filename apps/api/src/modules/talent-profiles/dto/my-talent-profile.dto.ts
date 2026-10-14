import { MyTalentProfileSchema } from '@skillboard/shared';
import { createZodDto } from 'nestjs-zod';

export class MyTalentProfileDto extends createZodDto(MyTalentProfileSchema) {}
