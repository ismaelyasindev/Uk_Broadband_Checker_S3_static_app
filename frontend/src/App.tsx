import { lazy, Suspense, useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { SearchBar } from './components/SearchBar';
import { ResultCard } from './components/ResultCard';
import { ErrorBanner, EmptyState, LoadingCard } from './components/Banners';
import { fetchBroadband, isDemoMode } from './lib/broadband';
import { lookupPostcode, type ValidatedPostcode } from './lib/postcodesIo';
import { LookupError } from './types';
import type { BroadbandResult } from './types';
import type { MapTarget } from './components/PostcodeMap';

const PostcodeMap = lazy(() => import('./components/PostcodeMap'));

type Status = 'idle' | 'loading' | 'success' | 'error';

const DEMO_HINTS = [
  { code: 'SW1A 1AA', label: 'Gigabit FTTP' },
  { code: 'EH1 1YZ', label: 'Superfast FTTC' },
  { code: 'LL57 4TH', label: 'Legacy ADSL' },
  { code: 'PO30 1UD', label: 'No coverage' },
  { code: 'BT71 7BA', label: 'Gateway error' },
];

function MapSkeleton() {
  return (
    <div className="h-full w-full animate-pulse bg-paper-sunk/60" />
  );
}

export default function App() {
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<BroadbandResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [mapTarget, setMapTarget] = useState<MapTarget | null>(null);

  async function handleValidated(validated: ValidatedPostcode) {
    setMapTarget({
      postcode: validated.postcode,
      longitude: validated.longitude,
      latitude: validated.latitude,
      place: validated.place,
    });

    setStatus('loading');
    setResult(null);
    setErrorMessage('');
    try {
      const data = await fetchBroadband(validated.postcode);
      setResult(data);
      setStatus('success');
    } catch (err) {
      const message =
        err instanceof LookupError
          ? err.message
          : 'Service is temporarily unavailable, please try again later.';
      setErrorMessage(message);
      setStatus('error');
    }
  }

  async function handleDemoHint(code: string) {
    try {
      const validated = await lookupPostcode(code);
      if (validated) {
        await handleValidated(validated);
      }
    } catch {
      // Fall back to a coordinate-less lookup so the user still sees results.
      setStatus('loading');
      setResult(null);
      setErrorMessage('');
      try {
        const data = await fetchBroadband(code);
        setResult(data);
        setStatus('success');
      } catch (err) {
        setErrorMessage(
          err instanceof LookupError
            ? err.message
            : 'Service is temporarily unavailable, please try again later.',
        );
        setStatus('error');
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero — full-width live UK map with an overlaid search instrument. */}
        <section className="relative">
          <div className="relative h-[460px] w-full overflow-hidden border-b hairline sm:h-[560px]">
            <Suspense fallback={<MapSkeleton />}>
              <PostcodeMap target={mapTarget} />
            </Suspense>

            {/* Bottom scrim improves legibility of the floating search card. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-paper/95 via-paper/40 to-transparent"
            />

            {/* Editorial kicker pinned to the top-left of the hero. */}
            <div className="pointer-events-none absolute left-5 top-5 z-10 sm:left-8 sm:top-8">
              <span className="inline-flex items-center gap-2 rounded-full border hairline bg-paper-card/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-mute shadow-sm backdrop-blur-md">
                <span className="h-1.5 w-1.5 animate-float rounded-full bg-flare" />
                UK coverage lookup
              </span>
            </div>

            {/* Floating search card. */}
            <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-8 sm:px-8 sm:pb-10">
              <div className="mx-auto w-full max-w-3xl">
                <div className="animate-fade-up rounded-3xl border hairline bg-paper-card/95 p-4 shadow-ring backdrop-blur-md sm:p-6">
                  <div className="mb-4 flex flex-col gap-1">
                    <h1 className="font-display text-2xl font-bold leading-tight tracking-tightest text-ink sm:text-3xl">
                      What broadband can you actually{' '}
                      <span className="text-flare">get?</span>
                    </h1>
                    <p className="text-sm text-ink-soft">
                      Enter a UK postcode to drop a pin and see the fastest
                      available speeds.
                    </p>
                  </div>

                  <SearchBar
                    onValidated={handleValidated}
                    busy={status === 'loading'}
                  />

                  {isDemoMode && (
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t hairline pt-4">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-mute">
                        Try
                      </span>
                      {DEMO_HINTS.map((hint) => (
                        <button
                          key={hint.code}
                          type="button"
                          onClick={() => handleDemoHint(hint.code)}
                          className="group rounded-full border hairline bg-paper px-3 py-1.5 text-xs font-medium text-ink-soft transition-all hover:-translate-y-0.5 hover:border-flare/40 hover:text-flare"
                          title={hint.label}
                        >
                          <span className="nums font-semibold text-ink group-hover:text-flare">
                            {hint.code}
                          </span>
                          <span className="text-ink-mute group-hover:text-flare/70">
                            {' · '}
                            {hint.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Results stack — kept narrow for readability under the wide hero. */}
        <section className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
          {status === 'idle' && <EmptyState />}
          {status === 'loading' && <LoadingCard />}
          {status === 'error' && <ErrorBanner message={errorMessage} />}
          {status === 'success' && result && <ResultCard result={result} />}
        </section>
      </main>

      <Footer />
    </div>
  );
}
