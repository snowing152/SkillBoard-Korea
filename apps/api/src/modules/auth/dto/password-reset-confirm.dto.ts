import { PasswordResetConfirmSchema } from '@skillboard/shared';
import { createZodDto } from 'nestjs-zod';

export class PasswordResetConfirmDto extends createZodDto(PasswordResetConfirmSchema) {}
