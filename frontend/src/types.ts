export type BroadbandTechnology = 'FTTP' | 'FTTC' | 'ADSL' | 'None';

/** Normalised broadband availability record returned to the UI. */
export interface BroadbandResult {
  postcode: string;
  place?: string;
  scenario?: string;
  maxDownloadMbps: number;
  maxUploadMbps: number;
  technology: BroadbandTechnology;
  technologyLabel: string;
  availabilityPercent: number;
}

/** Shape of a single entry in the demo-mode fixture file. */
export interface DemoEntry extends Partial<BroadbandResult> {
  error?: {
    status: number;
    message: string;
  };
}

/** A typed error carrying an HTTP-ish status so the UI can react appropriately. */
export class LookupError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'LookupError';
    this.status = status;
  }
}

/** Minimal subset of the postcodes.io postcode lookup payload we rely on. */
export interface PostcodesIoLookup {
  status: number;
  result: {
    postcode: string;
    country: string;
    region: string | null;
    admin_district: string | null;
    admin_ward: string | null;
    parish: string | null;
    latitude: number;
    longitude: number;
  } | null;
}

export interface PostcodesIoAutocomplete {
  status: number;
  result: string[] | null;
}
