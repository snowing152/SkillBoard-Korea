import { ExchangeSchema } from '@skillboard/shared';
import { createZodDto } from 'nestjs-zod';

export class ExchangeDto extends createZodDto(ExchangeSchema) {}
