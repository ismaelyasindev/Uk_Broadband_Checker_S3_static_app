import { describe, it, expect } from 'vitest';
import {
  normalizePostcode,
  formatPostcode,
  isStructurallyValidPostcode,
} from './postcode';

describe('normalizePostcode', () => {
  it('strips all whitespace and upper-cases', () => {
    expect(normalizePostcode('sw1a 1aa')).toBe('SW1A1AA');
    expect(normalizePostcode('  Sw1a1Aa ')).toBe('SW1A1AA');
  });
});

describe('formatPostcode', () => {
  it('inserts a single space before the final three characters', () => {
    expect(formatPostcode('SW1A1AA')).toBe('SW1A 1AA');
    expect(formatPostcode('eh1 1yz')).toBe('EH1 1YZ');
  });
});

describe('isStructurallyValidPostcode', () => {
  it('accepts a valid UK postcode and rejects junk', () => {
    expect(isStructurallyValidPostcode('SW1A 1AA')).toBe(true);
    expect(isStructurallyValidPostcode('not-a-postcode')).toBe(false);
    expect(isStructurallyValidPostcode('')).toBe(false);
  });
});
