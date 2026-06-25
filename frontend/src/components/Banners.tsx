import { AlertIcon, SearchIcon, SpinnerIcon } from './icons';

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="animate-fade-up flex items-start gap-4 rounded-3xl border border-amber-200 bg-amber-50/70 p-6 text-amber-900"
    >
      <AlertIcon className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
      <div>
        <p className="font-display font-bold">Something went wrong</p>
        <p className="mt-1 text-sm text-amber-800/90">{message}</p>
      </div>
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="animate-fade-in overflow-hidden rounded-3xl border hairline bg-paper-card shadow-lift">
      <div className="flex items-center gap-3 border-b hairline p-6 text-ink-soft">
        <SpinnerIcon className="h-5 w-5 animate-spin text-flare" />
        <p className="font-medium">Fetching broadband availability…</p>
      </div>
      {/* Shimmering skeleton rows that echo the result grid. */}
      <div className="grid grid-cols-2 divide-x divide-y divide-line lg:grid-cols-4 lg:divide-y-0">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-3 p-6">
            <div className="h-3 w-20 overflow-hidden rounded-full bg-paper-sunk">
              <div className="h-full w-1/2 animate-sheen bg-gradient-to-r from-transparent via-white/70 to-transparent" />
            </div>
            <div className="h-7 w-16 overflow-hidden rounded-md bg-paper-sunk">
              <div className="h-full w-1/2 animate-sheen bg-gradient-to-r from-transparent via-white/70 to-transparent" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="animate-fade-in flex flex-col items-center gap-3 rounded-3xl border border-dashed hairline bg-paper-card/50 px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl border hairline bg-paper text-ink-mute">
        <SearchIcon className="h-5 w-5" />
      </span>
      <p className="max-w-sm text-sm leading-relaxed text-ink-soft">
        Enter a postcode above to see predicted broadband speeds, technology and
        availability for that area.
      </p>
    </div>
  );
}
