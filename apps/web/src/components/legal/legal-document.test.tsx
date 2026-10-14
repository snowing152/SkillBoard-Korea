import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { fillPlaceholders, LegalDocument } from './legal-document';

const sections = [
  { heading: 'What we collect', paragraphs: ['Your email.', 'Your name.'] },
  { heading: 'Contact', paragraphs: ['Write to {email}.'] },
];

describe('LegalDocument', () => {
  it('renders the title, the date line and every section with its paragraphs', () => {
    render(
      <LegalDocument
        title="Privacy policy"
        updatedLabel="Last updated October 14, 2026"
        sections={sections}
        values={{ email: 'support@example.com' }}
      />,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeDefined();
    expect(screen.getByText('Last updated October 14, 2026')).toBeDefined();
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'What we collect',
      'Contact',
    ]);
    expect(screen.getByText('Your name.')).toBeDefined();
    expect(screen.getByText('Write to support@example.com.')).toBeDefined();
  });
});

describe('fillPlaceholders', () => {
  it('keeps unknown placeholders visible so a missing value is noticed', () => {
    expect(fillPlaceholders('A {x} and {y}', { x: '1' })).toBe('A 1 and {y}');
  });
});
