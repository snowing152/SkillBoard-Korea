import { GoogleLinkSchema } from '@skillboard/shared';
import { createZodDto } from 'nestjs-zod';

export class GoogleLinkDto extends createZodDto(GoogleLinkSchema) {}
