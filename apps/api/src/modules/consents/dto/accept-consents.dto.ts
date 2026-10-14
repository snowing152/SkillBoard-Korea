import { AcceptConsentsSchema } from '@skillboard/shared';
import { createZodDto } from 'nestjs-zod';

export class AcceptConsentsDto extends createZodDto(AcceptConsentsSchema) {}
