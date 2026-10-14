import { RegisterSchema } from '@skillboard/shared';
import { createZodDto } from 'nestjs-zod';

export class RegisterDto extends createZodDto(RegisterSchema) {}
