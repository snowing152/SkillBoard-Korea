import { describe, expect, it } from 'vitest';
import { ReasonCodeSchema } from './reason-codes.js';

describe('ReasonCodeSchema', () => {
  it('accepts known reasons and rejects anything else', () => {
    expect(ReasonCodeSchema.safeParse('NO_PASSWORD_SET').success).toBe(true);
    expect(ReasonCodeSchema.safeParse('SOMETHING_ELSE').success).toBe(false);
  });
});
