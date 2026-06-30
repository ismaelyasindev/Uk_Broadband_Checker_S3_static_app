import axios from 'axios';
import { apiCheckToBroadbandResult } from './apiCheck';
import type { ApiCheckResponse } from './apiCheck';
import { formatPostcode, normalizePostcode } from './postcode';
import { LookupError } from '../types';
import type {
  BroadbandResult,
  BroadbandTechnology,
  DemoEntry,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL;

/** True when the app is configured to run entirely client-side from fixtures. */
export const isDemoMode = API_URL === '/demo';

/** Cache the demo fixtures so we only fetch the static JSON once per session. */
let demoDbPromise: Promise<Record<string, DemoEntry>> | null = null;

function loadDemoDb(): Promise<Record<string, DemoEntry>> {
  if (!demoDbPromise) {
    demoDbPromise = fetch('/data/postcodes.json')
      .then((res) => {
        if (!res.ok) {
          throw new LookupError('Failed to load demo dataset.', 500);
        }
        return res.json() as Promise<Record<string, DemoEntry>>;
      })
      .catch((err) => {
        demoDbPromise = null;
        throw err instanceof LookupError
          ? err
          : new LookupError('Failed to load demo dataset.', 500);
      });
  }
  return demoDbPromise;
}

function normalizeTechnology(tech: string | undefined): BroadbandTechnology {
  switch ((tech ?? '').toUpperCase()) {
    case 'FTTP':
      return 'FTTP';
    case 'FTTC':
      return 'FTTC';
    case 'ADSL':
      return 'ADSL';
    default:
      return 'None';
  }
}

function coerceResult(entry: DemoEntry, fallbackPostcode: string): BroadbandResult {
  return {
    postcode: entry.postcode || fallbackPostcode,
    place: entry.place,
    scenario: entry.scenario,
    maxDownloadMbps: entry.maxDownloadMbps ?? 0,
    maxUploadMbps: entry.maxUploadMbps ?? 0,
    technology: normalizeTechnology(entry.technology),
    technologyLabel: entry.technologyLabel ?? 'Unknown',
    availabilityPercent: entry.availabilityPercent ?? 0,
  };
}

/** DEMO-MODE lookup: read from the local fixture map by normalised key. */
async function lookupDemo(rawPostcode: string): Promise<BroadbandResult> {
  const key = normalizePostcode(rawPostcode);
  const db = await loadDemoDb();

  await new Promise((r) => setTimeout(r, 450));

  const entry = db[key] ?? db.default;
  if (!entry) {
    throw new LookupError('No data available for this postcode.', 404);
  }

  if (entry.error) {
    throw new LookupError(entry.error.message, entry.error.status);
  }

  return coerceResult(entry, formatPostcode(rawPostcode));
}

/**
 * LIVE-MODE lookup: call /api/check. CloudFront injects X-Origin-Verify on the
 * origin request — the browser must not send that secret.
 */
async function lookupLive(
  rawPostcode: string,
  place?: string,
): Promise<BroadbandResult> {
  const pc = normalizePostcode(rawPostcode);

  try {
    const { data } = await axios.get<ApiCheckResponse>(`${API_URL}/check`, {
      params: { pc },
      timeout: 12000,
    });
    const result = apiCheckToBroadbandResult(data, rawPostcode);
    if (place) result.place = place;
    return result;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status ?? 0;
      const message =
        (err.response?.data as { message?: string } | undefined)?.message ??
        'Service is temporarily unavailable, please try again later.';

      if (status >= 500 || status === 0) {
        throw new LookupError(message, status || 503);
      }
      if (status === 404) {
        throw new LookupError('No data available for this postcode.', 404);
      }
      if (status === 403) {
        throw new LookupError('Access to the lookup service was denied.', 403);
      }
      if (status === 400) {
        throw new LookupError(message, 400);
      }
    }
    throw new LookupError(
      'Service is temporarily unavailable, please try again later.',
      503,
    );
  }
}

/** Public entry point used by the UI. Routes to demo or live based on env. */
export function fetchBroadband(
  rawPostcode: string,
  options?: { place?: string },
): Promise<BroadbandResult> {
  return isDemoMode
    ? lookupDemo(rawPostcode)
    : lookupLive(rawPostcode, options?.place);
}
