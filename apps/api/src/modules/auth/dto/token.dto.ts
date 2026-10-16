import { TokenSchema } from '@skillboard/shared';
import { createZodDto } from 'nestjs-zod';

export class TokenDto extends createZodDto(TokenSchema) {}
