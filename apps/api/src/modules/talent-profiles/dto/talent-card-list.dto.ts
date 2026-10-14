import { TalentCardListSchema } from '@skillboard/shared';
import { createZodDto } from 'nestjs-zod';

export class TalentCardListDto extends createZodDto(TalentCardListSchema) {}
