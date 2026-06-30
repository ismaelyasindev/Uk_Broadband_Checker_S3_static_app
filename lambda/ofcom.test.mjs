import { describe, expect, it } from 'vitest';
import { mapOfcom, normalise, POSTCODE_RE } from './src/ofcom.mjs';

describe('ofcom helpers', () => {
  it('normalises and validates postcodes', () => {
    expect(normalise(' sw1a 1aa ')).toBe('SW1A1AA');
    expect(POSTCODE_RE.test('SW1A1AA')).toBe(true);
  });

  it('maps tier availability from numeric percentages', () => {
    const mapped = mapOfcom('SW1A1AA', {
      standard: { maxDown: 10, maxUp: 1, availability: 96 },
      superfast: { maxDown: 80, maxUp: 20, availability: 10 },
      ultrafast: { maxDown: 0, maxUp: 0, availability: 0 },
    });

    expect(mapped.standard.availability).toBe('full');
    expect(mapped.superfast.availability).toBe('partial');
    expect(mapped.ultrafast.availability).toBe('none');
  });

  it('maps tier availability from string labels and missing tiers', () => {
    const mapped = mapOfcom('M11AE', {
      standard: { maxDown: 11, maxUp: 1, availability: 'partial' },
    });

    expect(mapped.standard.availability).toBe('partial');
    expect(mapped.superfast).toEqual({ maxDown: 0, maxUp: 0, availability: 'none' });
    expect(mapped.ultrafast).toEqual({ maxDown: 0, maxUp: 0, availability: 'none' });
  });

  it('maps alternate Ofcom field names', () => {
    const mapped = mapOfcom('SW1A1AA', {
      Standard: { maxDownload: 10, maxUpload: 1, availabilityPercent: 99 },
      Superfast: { download: 80, upload: 20, availability: 'full' },
      Ultrafast: { maxDown: 500, maxUp: 100, availability: 'none' },
    });

    expect(mapped.standard.maxDown).toBe(10);
    expect(mapped.superfast.maxDown).toBe(80);
    expect(mapped.ultrafast.availability).toBe('none');
  });

  it('treats invalid availability values as none', () => {
    const mapped = mapOfcom('X', {
      standard: { maxDown: 1, maxUp: 1, availability: 'unknown' },
    });
    expect(mapped.standard.availability).toBe('none');
  });

  it('falls back through download and upload field aliases', () => {
    const mapped = mapOfcom('B11AA', {
      standard: { maxDownload: 12, maxUpload: 2, availabilityPercent: 50 },
      superfast: { download: 70, upload: 15, availability: 10 },
    });

    expect(mapped.standard).toEqual({
      maxDown: 12,
      maxUp: 2,
      availability: 'partial',
    });
    expect(mapped.superfast).toEqual({
      maxDown: 70,
      maxUp: 15,
      availability: 'partial',
    });
  });

  it('defaults speed fields to zero when aliases are absent', () => {
    const mapped = mapOfcom('B11AA', {
      standard: { availability: 'none' },
    });

    expect(mapped.standard).toEqual({
      maxDown: 0,
      maxUp: 0,
      availability: 'none',
    });
  });

  it('defaults availability when neither availability nor availabilityPercent is set', () => {
    const mapped = mapOfcom('B11AA', {
      standard: { maxDown: 1, maxUp: 1 },
    });

    expect(mapped.standard.availability).toBe('none');
  });

  it('uses maxUp and maxUpload before upload alias', () => {
    const mapped = mapOfcom('B11AA', {
      standard: { maxDown: 5, maxUp: 1, maxUpload: 99, upload: 88, availability: 'full' },
    });

    expect(mapped.standard.maxUp).toBe(1);
  });

  it('returns default tier when raw tier is not an object', () => {
    const mapped = mapOfcom('B11AA', {
      standard: null,
      superfast: 'invalid',
    });

    expect(mapped.standard).toEqual({ maxDown: 0, maxUp: 0, availability: 'none' });
    expect(mapped.superfast).toEqual({ maxDown: 0, maxUp: 0, availability: 'none' });
  });

  it('maps live Ofcom Connected Nations Availability[] responses', () => {
    const mapped = mapOfcom('SW1A1AA', {
      PostCode: 'SW1A1AA',
      Count: 2,
      Availability: [
        {
          MaxBbPredictedDown: 16,
          MaxBbPredictedUp: 1,
          MaxSfbbPredictedDown: -1,
          MaxSfbbPredictedUp: -1,
          MaxUfbbPredictedDown: -1,
          MaxUfbbPredictedUp: -1,
        },
        {
          MaxBbPredictedDown: 17,
          MaxBbPredictedUp: 1,
          MaxSfbbPredictedDown: 80,
          MaxSfbbPredictedUp: 20,
          MaxUfbbPredictedDown: -1,
          MaxUfbbPredictedUp: -1,
        },
      ],
    });

    expect(mapped.standard).toEqual({
      maxDown: 17,
      maxUp: 1,
      availability: 'full',
    });
    expect(mapped.superfast).toEqual({
      maxDown: 80,
      maxUp: 20,
      availability: 'partial',
    });
    expect(mapped.ultrafast).toEqual({
      maxDown: 0,
      maxUp: 0,
      availability: 'none',
    });
  });

  it('returns none tiers when Ofcom Availability is empty', () => {
    const mapped = mapOfcom('SW1A1AA', {
      PostCode: 'SW1A1AA',
      Count: 0,
      Availability: [],
    });

    expect(mapped.standard.availability).toBe('none');
    expect(mapped.superfast.availability).toBe('none');
    expect(mapped.ultrafast.availability).toBe('none');
  });
});
