import { LogoutSchema } from '@skillboard/shared';
import { createZodDto } from 'nestjs-zod';

export class LogoutDto extends createZodDto(LogoutSchema) {}
