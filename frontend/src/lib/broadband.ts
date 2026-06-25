import axios from 'axios';
import { formatPostcode, normalizePostcode } from './postcode';
import { LookupError } from '../types';
import type {
  BroadbandResult,
  BroadbandTechnology,
  DemoEntry,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL;
const ORIGIN_VERIFY_SECRET = import.meta.env.VITE_ORIGIN_VERIFY_SECRET;

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
        // Reset so a later retry can attempt the fetch again.
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

  // Simulate realistic latency so loading states are visible in the demo.
  await new Promise((r) => setTimeout(r, 450));

  const entry = db[key] ?? db.default;
  if (!entry) {
    throw new LookupError('No data available for this postcode.', 404);
  }

  // A fixture entry may be flagged to simulate an upstream gateway failure.
  if (entry.error) {
    throw new LookupError(entry.error.message, entry.error.status);
  }

  return coerceResult(entry, formatPostcode(rawPostcode));
}

/** LIVE-MODE lookup: call the authenticated backend lookup endpoint. */
async function lookupLive(rawPostcode: string): Promise<BroadbandResult> {
  const pc = normalizePostcode(rawPostcode);

  try {
    const { data } = await axios.get<BroadbandResult>(
      `${API_URL}/check`,
      {
        params: { pc },
        timeout: 12000,
        headers: ORIGIN_VERIFY_SECRET
          ? { 'X-Origin-Verify': ORIGIN_VERIFY_SECRET }
          : undefined,
      },
    );
    return {
      ...data,
      technology: normalizeTechnology(data.technology),
      postcode: data.postcode || formatPostcode(rawPostcode),
    };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status ?? 0;
      if (status >= 500 || status === 0) {
        throw new LookupError(
          'Service is temporarily unavailable, please try again later.',
          status || 503,
        );
      }
      if (status === 404) {
        throw new LookupError('No data available for this postcode.', 404);
      }
      if (status === 403) {
        throw new LookupError('Access to the lookup service was denied.', 403);
      }
    }
    throw new LookupError(
      'Service is temporarily unavailable, please try again later.',
      503,
    );
  }
}

/** Public entry point used by the UI. Routes to demo or live based on env. */
export function fetchBroadband(rawPostcode: string): Promise<BroadbandResult> {
  return isDemoMode ? lookupDemo(rawPostcode) : lookupLive(rawPostcode);
}
