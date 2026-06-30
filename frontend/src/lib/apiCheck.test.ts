import { describe, expect, it } from 'vitest';
import { apiCheckToBroadbandResult } from './apiCheck';

describe('apiCheckToBroadbandResult', () => {
  it('maps the best available tier to a BroadbandResult for the UI', () => {
    const result = apiCheckToBroadbandResult(
      {
        postcode: 'SW1A1AA',
        source: 'live',
        responseTime: 42,
        standard: { maxDown: 17.2, maxUp: 2.1, availability: 'full' },
        superfast: { maxDown: 80, maxUp: 20, availability: 'partial' },
        ultrafast: { maxDown: 330, maxUp: 50, availability: 'full' },
      },
      'sw1a 1aa',
    );

    expect(result.postcode).toBe('SW1A 1AA');
    expect(result.maxDownloadMbps).toBe(330);
    expect(result.maxUploadMbps).toBe(50);
    expect(result.technology).toBe('FTTP');
    expect(result.availabilityPercent).toBe(100);
  });

  it('falls back to standard when higher tiers are unavailable', () => {
    const result = apiCheckToBroadbandResult(
      {
        postcode: 'M11AE',
        standard: { maxDown: 11, maxUp: 1, availability: 'partial' },
        superfast: { maxDown: 0, maxUp: 0, availability: 'none' },
        ultrafast: { maxDown: 0, maxUp: 0, availability: 'none' },
      },
      'M1 1AE',
    );

    expect(result.maxDownloadMbps).toBe(11);
    expect(result.technology).toBe('ADSL');
    expect(result.availabilityPercent).toBe(75);
  });
});
