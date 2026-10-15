import { UpdateMeSchema } from '@skillboard/shared';
import { createZodDto } from 'nestjs-zod';

export class UpdateMeDto extends createZodDto(UpdateMeSchema) {}
