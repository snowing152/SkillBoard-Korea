import { GoogleCompleteSchema } from '@skillboard/shared';
import { createZodDto } from 'nestjs-zod';

export class GoogleCompleteDto extends createZodDto(GoogleCompleteSchema) {}
