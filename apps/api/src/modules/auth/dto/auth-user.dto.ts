import { AuthUserSchema } from '@skillboard/shared';
import { createZodDto } from 'nestjs-zod';

export class AuthUserDto extends createZodDto(AuthUserSchema) {}
