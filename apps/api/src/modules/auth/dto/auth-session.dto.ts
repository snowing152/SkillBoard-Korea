import { AuthSessionSchema } from '@skillboard/shared';
import { createZodDto } from 'nestjs-zod';

export class AuthSessionDto extends createZodDto(AuthSessionSchema) {}
