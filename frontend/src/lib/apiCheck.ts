import { formatPostcode } from './postcode';
import type { BroadbandResult, BroadbandTechnology } from '../types';

export type TierAvailability = 'full' | 'partial' | 'none';

export interface TierRow {
  maxDown: number;
  maxUp: number;
  availability: TierAvailability;
}

/** Shape returned by GET /api/check (Lambda API contract). */
export interface ApiCheckResponse {
  postcode: string;
  source?: 'cache' | 'live' | 'demo';
  responseTime?: number;
  standard: TierRow;
  superfast: TierRow;
  ultrafast: TierRow;
}

const AVAILABILITY_PERCENT: Record<TierAvailability, number> = {
  full: 100,
  partial: 75,
  none: 0,
};

const TECHNOLOGY_LABELS: Record<BroadbandTechnology, string> = {
  FTTP: 'Fibre to the Premises',
  FTTC: 'Fibre to the Cabinet',
  ADSL: 'Copper ADSL',
  None: 'No infrastructure available',
};

const TIER_SCENARIO: Record<string, string> = {
  ultrafast: 'Ultrafast broadband',
  superfast: 'Superfast broadband',
  standard: 'Standard broadband',
};

function technologyFromSpeed(mbps: number): BroadbandTechnology {
  if (mbps <= 0) return 'None';
  if (mbps >= 300) return 'FTTP';
  if (mbps >= 30) return 'FTTC';
  return 'ADSL';
}

/** Pick the best tier with usable speeds (ultrafast → superfast → standard). */
function pickBestTier(response: ApiCheckResponse) {
  const order = ['ultrafast', 'superfast', 'standard'] as const;
  for (const name of order) {
    const tier = response[name];
    if (tier.availability !== 'none' && tier.maxDown > 0) {
      return { name, tier };
    }
  }
  return { name: 'standard' as const, tier: response.standard };
}

/** Convert the Lambda /api/check payload into the UI BroadbandResult shape. */
export function apiCheckToBroadbandResult(
  response: ApiCheckResponse,
  rawPostcode: string,
): BroadbandResult {
  const { name, tier } = pickBestTier(response);
  const technology = technologyFromSpeed(tier.maxDown);

  return {
    postcode: formatPostcode(response.postcode || rawPostcode),
    scenario: TIER_SCENARIO[name],
    maxDownloadMbps: tier.maxDown,
    maxUploadMbps: tier.maxUp,
    technology,
    technologyLabel: TECHNOLOGY_LABELS[technology],
    availabilityPercent: AVAILABILITY_PERCENT[tier.availability],
  };
}
