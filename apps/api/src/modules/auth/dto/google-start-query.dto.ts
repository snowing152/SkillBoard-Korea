import { GoogleStartQuerySchema } from '@skillboard/shared';
import { createZodDto } from 'nestjs-zod';

export class GoogleStartQueryDto extends createZodDto(GoogleStartQuerySchema) {}
