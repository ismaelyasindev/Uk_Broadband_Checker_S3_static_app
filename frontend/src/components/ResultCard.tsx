import type { ReactNode } from 'react';
import type { BroadbandResult } from '../types';
import { formatSpeed, speedCategory } from '../lib/format';
import {
  ChipIcon,
  DownloadIcon,
  GaugeIcon,
  NoSignalIcon,
  UploadIcon,
} from './icons';

const categoryStyles: Record<string, string> = {
  none: 'border-red-200 bg-red-50 text-red-700',
  standard: 'border-amber-200 bg-amber-50 text-amber-700',
  superfast: 'border-sky-200 bg-sky-50 text-sky-700',
  ultrafast: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

function StatTile({
  icon,
  label,
  value,
  unit,
  delay,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  unit?: string;
  delay: number;
}) {
  return (
    <div
      className="animate-fade-up group relative p-6 transition-colors hover:bg-paper-sunk/40"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-center gap-2 text-ink-mute">
        <span className="text-flare/80 transition-transform group-hover:scale-110">
          {icon}
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">
          {label}
        </p>
      </div>
      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="nums text-4xl font-bold leading-none text-ink">
          {value}
        </span>
        {unit && (
          <span className="text-sm font-semibold text-ink-mute">{unit}</span>
        )}
      </p>
    </div>
  );
}

export function ResultCard({ result }: { result: BroadbandResult }) {
  const noService =
    result.technology === 'None' ||
    (result.maxDownloadMbps === 0 && result.availabilityPercent === 0);

  const download = formatSpeed(result.maxDownloadMbps);
  const upload = formatSpeed(result.maxUploadMbps);
  const category = speedCategory(result.maxDownloadMbps);

  return (
    <section className="animate-fade-up space-y-5">
      {/* Header row: postcode as the headline, place + category alongside. */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-mute">
            Results for
          </p>
          <h2 className="nums mt-1 text-3xl font-bold tracking-tightest text-ink">
            {result.postcode}
          </h2>
          {result.place && (
            <p className="mt-0.5 text-sm text-ink-soft">{result.place}</p>
          )}
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${categoryStyles[category.tone]}`}
        >
          {category.label}
        </span>
      </div>

      {noService ? (
        <div className="flex items-start gap-4 rounded-3xl border border-red-200 bg-red-50/70 p-6 text-red-800">
          <NoSignalIcon className="mt-0.5 h-6 w-6 shrink-0" />
          <div>
            <p className="font-display font-bold">No infrastructure available</p>
            <p className="mt-1 text-sm text-red-700/90">
              There are no fixed broadband services predicted at this location.
              You may wish to explore satellite or fixed wireless access options.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border hairline bg-paper-card shadow-lift">
          {/* Hairline-divided instrument grid — no floating boxes. */}
          <div className="grid grid-cols-2 divide-x divide-y divide-line lg:grid-cols-4 lg:divide-y-0">
            <StatTile
              icon={<DownloadIcon className="h-4 w-4" />}
              label="Max download"
              value={download.value}
              unit={download.unit}
              delay={0.04}
            />
            <StatTile
              icon={<UploadIcon className="h-4 w-4" />}
              label="Max upload"
              value={upload.value}
              unit={upload.unit}
              delay={0.1}
            />
            <StatTile
              icon={<GaugeIcon className="h-4 w-4" />}
              label="Availability"
              value={`${result.availabilityPercent}`}
              unit="%"
              delay={0.16}
            />
            <StatTile
              icon={<ChipIcon className="h-4 w-4" />}
              label="Technology"
              value={result.technology}
              delay={0.22}
            />
          </div>

          {/* Coverage meter, divided from the grid by a hairline. */}
          <div className="border-t hairline bg-paper/50 p-6">
            <div className="mb-2.5 flex items-center justify-between text-sm">
              <span className="font-medium text-ink-soft">
                Coverage in this area
              </span>
              <span className="nums font-bold text-ink">
                {result.availabilityPercent}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-paper-sunk">
              <div
                className="h-full rounded-full bg-gradient-to-r from-flare to-flare-deep transition-[width] duration-700 ease-out"
                style={{
                  width: `${Math.min(100, Math.max(0, result.availabilityPercent))}%`,
                }}
              />
            </div>
            <p className="mt-3 text-sm text-ink-soft">
              <span className="font-semibold text-ink">
                {result.technologyLabel}
              </span>
              {result.scenario ? ` · ${result.scenario}` : ''}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
