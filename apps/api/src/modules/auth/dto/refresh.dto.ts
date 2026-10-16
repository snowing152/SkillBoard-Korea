import { RefreshSchema } from '@skillboard/shared';
import { createZodDto } from 'nestjs-zod';

export class RefreshDto extends createZodDto(RefreshSchema) {}
