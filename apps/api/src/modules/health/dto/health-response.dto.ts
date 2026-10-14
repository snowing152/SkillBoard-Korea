import { HealthResponseSchema } from '@skillboard/shared';
import { createZodDto } from 'nestjs-zod';

// DTOs are one-liners wrapping the shared schema (ADR 0014). Never add fields here.
export class HealthResponseDto extends createZodDto(HealthResponseSchema) {}
