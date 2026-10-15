import { PasswordResetRequestSchema } from '@skillboard/shared';
import { createZodDto } from 'nestjs-zod';

export class PasswordResetRequestDto extends createZodDto(PasswordResetRequestSchema) {}
