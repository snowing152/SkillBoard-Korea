import { ChangePasswordSchema } from '@skillboard/shared';
import { createZodDto } from 'nestjs-zod';

export class ChangePasswordDto extends createZodDto(ChangePasswordSchema) {}
