import { ConsentListSchema } from '@skillboard/shared';
import { createZodDto } from 'nestjs-zod';

export class ConsentListDto extends createZodDto(ConsentListSchema) {}
