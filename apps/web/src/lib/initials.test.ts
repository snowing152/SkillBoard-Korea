import { describe, expect, it } from 'vitest';
import { initials } from './initials';

describe('initials', () => {
  it('takes the first letter of the first two words', () => {
    expect(initials('Alina Petrova')).toBe('AP');
    expect(initials('  maria  de la cruz ')).toBe('MD');
  });

  it('works for a single word in any script', () => {
    expect(initials('김민준')).toBe('김');
    expect(initials('анна')).toBe('А');
  });

  it('returns an empty string for a blank name', () => {
    expect(initials('   ')).toBe('');
  });
});
